#!/opt/homebrew/bin/node
"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

function nowIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "run";
}

function compactTimestamp() {
  return nowIso().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function resolveWorkspaceRoot(cwd = process.cwd()) {
  if (process.env.HARNESS_WORKSPACE_ROOT) {
    return path.resolve(process.env.HARNESS_WORKSPACE_ROOT);
  }
  try {
    const root = execFileSync(
      "git",
      ["-C", cwd, "rev-parse", "--show-toplevel"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return root || cwd;
  } catch {
    return cwd;
  }
}

function resolveHarnessRoot(cwd = process.cwd()) {
  if (process.env.HARNESS_ROOT) {
    return path.resolve(process.env.HARNESS_ROOT);
  }
  return path.join(resolveWorkspaceRoot(cwd), ".harness");
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function appendJsonl(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

async function loadStages(root) {
  const stages = await readJson(path.join(root, "contracts", "stages.json"));
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error(`Missing or invalid stage contracts at ${path.join(root, "contracts", "stages.json")}`);
  }
  return stages;
}

async function loadProcessMap(root) {
  const processMap = await readJson(path.join(root, "contracts", "process-map.json"));
  if (!processMap || typeof processMap !== "object") {
    throw new Error(`Missing or invalid process map at ${path.join(root, "contracts", "process-map.json")}`);
  }
  return processMap;
}

async function loadArtifactSchema(root, stage) {
  const schema = await readJson(path.join(root, "contracts", "artifact-schema", `${stage}.json`));
  if (!schema || !Array.isArray(schema.required)) {
    throw new Error(`Missing or invalid artifact schema for stage ${stage}`);
  }
  return schema;
}

function stageIndex(stages, stageName) {
  return stages.findIndex((stage) => stage.name === stageName);
}

function nextStage(stages, stageName) {
  const index = stageIndex(stages, stageName);
  if (index === -1 || index === stages.length - 1) {
    return null;
  }
  return stages[index + 1].name;
}

function artifactFileName(stages, stageName) {
  const stage = stages.find((entry) => entry.name === stageName);
  if (!stage) {
    throw new Error(`Unknown stage ${stageName}`);
  }
  return stage.artifact;
}

function statePaths(root) {
  return {
    current: path.join(root, "state", "current.json"),
    transitions: path.join(root, "state", "transitions.jsonl"),
  };
}

function runPaths(root, runId) {
  const base = path.join(root, "runs", runId);
  return {
    base,
    state: path.join(base, "state.json"),
    artifacts: path.join(base, "artifacts"),
  };
}

async function bootstrap(root) {
  await ensureDir(path.join(root, "state"));
  await ensureDir(path.join(root, "artifacts"));
  await ensureDir(path.join(root, "runs"));
  await ensureDir(path.join(root, "learning"));
}

async function readCurrentState(root) {
  return readJson(statePaths(root).current);
}

function missingRequiredFields(payload, required) {
  return required.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      return true;
    }
    const value = payload[field];
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === "string" && value.trim() === "") {
      return true;
    }
    return false;
  });
}

async function startRun({ cwd = process.cwd(), processType, goal, risk = "unknown", verificationTarget = "unspecified", runId }) {
  const root = resolveHarnessRoot(cwd);
  const processMap = await loadProcessMap(root);
  if (!processMap[processType]) {
    throw new Error(`Unknown process type ${processType}`);
  }
  await bootstrap(root);
  const active = await readCurrentState(root);
  if (active && active.status === "in_progress") {
    throw new Error(`Active harness run ${active.run_id} is already in progress at stage ${active.stage}`);
  }
  const createdAt = nowIso();
  const resolvedRunId = runId || `run-${compactTimestamp()}-${slugify(processType)}-${crypto.randomUUID().slice(0, 8)}`;
  const current = {
    run_id: resolvedRunId,
    process: processType,
    goal,
    risk,
    verification_target: verificationTarget,
    workspace_root: resolveWorkspaceRoot(cwd),
    harness_root: root,
    stage: "process-selection",
    status: "in_progress",
    started_at: createdAt,
    updated_at: createdAt,
    completed_stages: [],
  };
  const runState = {
    ...current,
    run_path: runPaths(root, resolvedRunId).base,
  };
  const paths = statePaths(root);
  await writeJson(paths.current, current);
  await writeJson(runPaths(root, resolvedRunId).state, runState);
  await appendJsonl(paths.transitions, {
    at: createdAt,
    run_id: resolvedRunId,
    from: null,
    to: "process-selection",
    reason: "run_started",
  });
  return current;
}

async function completeStage({ cwd = process.cwd(), stageName, payload }) {
  const root = resolveHarnessRoot(cwd);
  const stages = await loadStages(root);
  const current = await readCurrentState(root);
  if (!current || current.status !== "in_progress") {
    throw new Error("No active harness run exists");
  }
  if (current.stage !== stageName) {
    throw new Error(`Current stage is ${current.stage}; cannot complete ${stageName}`);
  }
  const schema = await loadArtifactSchema(root, stageName);
  const missing = missingRequiredFields(payload, schema.required);
  if (missing.length > 0) {
    throw new Error(`Missing required fields for ${stageName}: ${missing.join(", ")}`);
  }
  const stagesBefore = stageIndex(stages, stageName);
  const completed = Array.isArray(current.completed_stages) ? current.completed_stages : [];
  const expectedCompletedCount = stagesBefore;
  if (completed.length !== expectedCompletedCount) {
    throw new Error(`Stage prerequisites are incomplete for ${stageName}`);
  }
  const recordedAt = nowIso();
  const artifact = {
    run_id: current.run_id,
    stage: stageName,
    recorded_at: recordedAt,
    ...payload,
  };
  const artifactName = artifactFileName(stages, stageName);
  const run = runPaths(root, current.run_id);
  await ensureDir(run.artifacts);
  await writeJson(path.join(run.artifacts, artifactName), artifact);
  await writeJson(path.join(root, "artifacts", artifactName), artifact);
  const next = nextStage(stages, stageName);
  const nextState = {
    ...current,
    updated_at: recordedAt,
    completed_stages: [...completed, stageName],
    last_completed_stage: stageName,
    stage: next || "complete",
    status: next ? "in_progress" : "complete",
    completed_at: next ? undefined : recordedAt,
  };
  await writeJson(statePaths(root).current, nextState);
  await writeJson(run.state, {
    ...nextState,
    run_path: run.base,
  });
  await appendJsonl(statePaths(root).transitions, {
    at: recordedAt,
    run_id: current.run_id,
    from: stageName,
    to: next || "complete",
    reason: `${stageName}_completed`,
  });
  return {
    artifact,
    state: nextState,
  };
}

async function enterStage({ cwd = process.cwd(), stageName }) {
  const root = resolveHarnessRoot(cwd);
  const stages = await loadStages(root);
  const current = await readCurrentState(root);
  if (!current || current.status !== "in_progress") {
    throw new Error("No active harness run exists");
  }
  if (stageIndex(stages, stageName) === -1) {
    throw new Error(`Unknown stage ${stageName}`);
  }
  if (current.stage !== stageName) {
    throw new Error(`Current stage is ${current.stage}; cannot enter ${stageName}`);
  }
  return {
    run_id: current.run_id,
    stage: current.stage,
    process: current.process,
  };
}

async function status({ cwd = process.cwd() }) {
  const root = resolveHarnessRoot(cwd);
  const current = await readCurrentState(root);
  if (!current) {
    return {
      active: false,
      harness_root: root,
    };
  }
  return {
    active: current.status === "in_progress",
    harness_root: root,
    ...current,
  };
}

async function applyLearn({ cwd = process.cwd(), payload }) {
  const root = resolveHarnessRoot(cwd);
  await bootstrap(root);
  const current = await readCurrentState(root);
  if (!current) {
    throw new Error("No harness run exists for learn apply");
  }
  const normUpdateTail = current.stage === "norm-update"
    || current.last_completed_stage === "norm-update";
  if (!normUpdateTail) {
    throw new Error("learn apply is only allowed during or after the norm-update tail");
  }
  const record = {
    run_id: current.run_id,
    stage: current.stage,
    applied_at: nowIso(),
    ...payload,
  };
  await appendJsonl(path.join(root, "learning", "applied.jsonl"), record);
  return record;
}

async function renderDashboard({ cwd = process.cwd() }) {
  const root = resolveHarnessRoot(cwd);
  await bootstrap(root);
  const stages = await loadStages(root);
  const current = await readCurrentState(root);
  let markdown;

  if (!current) {
    markdown = "# Harness Dashboard\n\nNo active harness run.\n";
  } else {
    const completed = Array.isArray(current.completed_stages) ? current.completed_stages : [];
    const currentIndex = stageIndex(stages, current.stage);
    const pendingStages = current.status === "complete"
      ? []
      : stages
        .slice(currentIndex >= 0 ? currentIndex : 0)
        .map((stage) => stage.name);
    markdown = [
      "# Harness Dashboard",
      "",
      `- Run ID: ${current.run_id}`,
      `- Process: ${current.process}`,
      `- Status: ${current.status}`,
      `- Current Stage: ${current.stage}`,
      `- Goal: ${current.goal}`,
      `- Verification Target: ${current.verification_target}`,
      `- Completed Stages: ${completed.length > 0 ? completed.join(", ") : "none"}`,
      `- Pending Stages: ${pendingStages.length > 0 ? pendingStages.join(", ") : "none"}`,
      `- Updated At: ${current.updated_at}`,
      "",
      "Generated from machine state and artifacts under `.harness/`.",
      "",
    ].join("\n");
  }

  const outputPath = path.join(root, "output", "dashboard.md");
  await ensureDir(path.dirname(outputPath));
  await fsp.writeFile(outputPath, markdown, "utf8");
  return {
    output_path: outputPath,
    markdown,
  };
}

function readCommandFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const toolInput = payload.tool_input && typeof payload.tool_input === "object" ? payload.tool_input : {};
  return typeof toolInput.command === "string" ? toolInput.command.trim() : "";
}

function readToolNameFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  return typeof payload.tool_name === "string" ? payload.tool_name.trim() : "";
}

function isSafeReadOnlyToolName(toolName) {
  return /^(Read|View|LS|Glob|Grep|Search|Find)$/i.test(toolName)
    || /^(mcp__omx_state__state_read|mcp__omx_state__state_get_status|mcp__omx_state__state_list_active)$/i.test(toolName)
    || /^(mcp__omx_memory__notepad_read|mcp__omx_memory__project_memory_read)$/i.test(toolName)
    || /^(mcp__omx_trace__trace_summary|mcp__omx_trace__trace_timeline)$/i.test(toolName);
}

function tokenizeCommand(command) {
  return command.match(/"[^"]*"|'[^']*'|\S+/g) || [];
}

function stripQuotes(token) {
  if ((token.startsWith("\"") && token.endsWith("\"")) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1);
  }
  return token;
}

function unwrapExecutable(command) {
  const tokens = tokenizeCommand(command).map(stripQuotes);
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (!token) {
      index += 1;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token)) {
      index += 1;
      continue;
    }
    if (token === "env") {
      index += 1;
      while (index < tokens.length) {
        const envToken = tokens[index];
        if (envToken === "-i" || envToken === "-u" || /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(envToken)) {
          index += 1;
          continue;
        }
        break;
      }
      continue;
    }
    if (token === "command" || token === "builtin" || token === "nohup" || token === "time") {
      index += 1;
      continue;
    }
    return {
      executable: path.basename(token),
      tokens,
      index,
    };
  }
  return {
    executable: "",
    tokens,
    index,
  };
}

function isHarnessCommand(command, cwd = process.cwd()) {
  const normalized = command.trim();
  void cwd;
  return /^harness(?:\s|$)/.test(normalized);
}

function isAllowedBeforeExecution(command, cwd = process.cwd()) {
  const normalized = command.trim();
  if (!normalized) return true;
  if (
    /(^|[^\\])(?:&&|\|\||;|\|)/.test(normalized)
    || /(^|[^\\])&(?!&)/.test(normalized)
    || /[\r\n]/.test(normalized)
    || />|<</.test(normalized)
    || /(^|[^\\])</.test(normalized)
    || /\$\(|`|<\(|>\(/.test(normalized)
  ) return false;
  if (isHarnessCommand(normalized, cwd)) return true;

  const { executable, tokens, index } = unwrapExecutable(normalized);
  const next = tokens[index + 1] || "";
  switch (executable) {
    case "pwd":
    case "ls":
    case "rg":
    case "cat":
    case "head":
    case "tail":
    case "wc":
    case "stat":
    case "grep":
      return true;
    case "git":
      return /^(status|diff|rev-parse|show|log)$/.test(next);
    case "omx":
      return /^(question|explore|sparkshell|team)$/.test(next);
    default:
      return false;
  }
}

async function buildPreToolUseDecision(payload, cwd = process.cwd()) {
  const root = resolveHarnessRoot(cwd);
  const current = await readCurrentState(root);
  if (!current || current.status !== "in_progress") {
    return null;
  }
  const stages = await loadStages(root);
  const executionIndex = stageIndex(stages, "execution");
  const currentIndex = stageIndex(stages, current.stage);
  if (currentIndex === -1 || currentIndex >= executionIndex) {
    return null;
  }
  const toolName = readToolNameFromPayload(payload);
  if (toolName && toolName !== "Bash") {
    if (isSafeReadOnlyToolName(toolName)) {
      return null;
    }
    return {
      decision: "block",
      reason: `Harness stage guard: current stage is ${current.stage}. Tool "${toolName}" is blocked until the execution stage is active.`,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
      },
    };
  }
  const command = readCommandFromPayload(payload);
  if (!command || isAllowedBeforeExecution(command, cwd)) {
    return null;
  }
  return {
    decision: "block",
    reason: `Harness stage guard: current stage is ${current.stage}. Command "${command}" is blocked until the execution stage is active. Use harness wrapper commands or read-only inspection first.`,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
    },
  };
}

async function buildUserPromptSubmitContext(cwd = process.cwd()) {
  const root = resolveHarnessRoot(cwd);
  const current = await readCurrentState(root);
  if (!current || current.status !== "in_progress") {
    return null;
  }
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `Harness run ${current.run_id} is active at stage ${current.stage}. Preserve the canonical stage order and keep stage-internal tactics soft unless a wrapper transition or artifact contract requires otherwise.`,
    },
  };
}

async function buildStopDecision(cwd = process.cwd()) {
  const root = resolveHarnessRoot(cwd);
  const current = await readCurrentState(root);
  if (!current || current.status === "complete") {
    return null;
  }
  return {
    decision: "block",
    reason: `Harness stage guard: run ${current.run_id} is still active at stage ${current.stage}. Complete the required artifacts before stopping.`,
    stopReason: `harness_stage_${current.stage}`,
    systemMessage: `Harness run ${current.run_id} is still active at stage ${current.stage}.`,
  };
}

module.exports = {
  applyLearn,
  buildPreToolUseDecision,
  buildStopDecision,
  buildUserPromptSubmitContext,
  completeStage,
  enterStage,
  renderDashboard,
  resolveHarnessRoot,
  resolveWorkspaceRoot,
  startRun,
  status,
};
