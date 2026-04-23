#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const TARGET_REMOTE_RE = /github\.com[:/](?:jackrabbit-start)\/NeoD(?:\.git)?$/i;

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  }

  const raw = chunks.join("").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function runGit(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function extractPrompt(payload) {
  const candidates = [
    payload?.prompt,
    payload?.user_prompt,
    payload?.userPrompt,
    payload?.input,
    payload?.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function extractRalphTask(prompt) {
  const trimmed = prompt.trim();
  const match = trimmed.match(/^\$ralph\b\s*(.*)$/s);
  if (!match) return "";
  return match[1].trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildSuggestedCommand(taskText) {
  const sessionSlug = slugify(taskText || "ralph-task") || "ralph-task";
  if (!taskText) {
    return `$neo-new-session -> pnpm run ai:switch-session -- --name ${sessionSlug} --task "<task text>"`;
  }

  const escapedTask = taskText.replace(/"/g, '\\"');
  return `$neo-new-session -> pnpm run ai:switch-session -- --name ${sessionSlug} --task "${escapedTask}"`;
}

async function main() {
  const payload = await readStdinJson();
  if (!payload || payload.hook_event_name !== "UserPromptSubmit") return;

  const repoRoot = runGit(["rev-parse", "--show-toplevel"], process.cwd());
  const remoteUrl = runGit(["config", "--get", "remote.origin.url"], repoRoot);
  if (!TARGET_REMOTE_RE.test(remoteUrl)) return;

  const prompt = extractPrompt(payload);
  const taskText = extractRalphTask(prompt);
  if (!prompt || !prompt.includes("$ralph")) return;

  const branchName = runGit(["branch", "--show-current"], repoRoot);
  if (branchName.startsWith("ai-task/")) return;

  const dirty = runGit(["status", "--short"], repoRoot);
  if (dirty) {
    const suggestedCommand = buildSuggestedCommand(taskText);
    const reason = [
      "NeoD cannot auto-switch the current session into an `ai-task/*` branch while the worktree is dirty.",
      "Commit or stash the current changes first, then retry.",
      `Preferred path: ${suggestedCommand}`,
    ].join(" ");

    process.stdout.write(`${JSON.stringify({
      decision: "block",
      reason,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: reason,
      },
    })}\n`);
    return;
  }

  const sessionSlug = slugify(taskText || "ralph-task") || "ralph-task";
  const switchResult = spawnSync(
    "bash",
    [
      "scripts/ai/switch-current-session.sh",
      "--name",
      sessionSlug,
      "--task",
      taskText,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (switchResult.status !== 0) {
    const suggestedCommand = buildSuggestedCommand(taskText);
    const reason = [
      "NeoD failed to switch the current session into an `ai-task/*` branch before Ralph start.",
      (switchResult.stderr || switchResult.stdout || "").trim(),
      `Fallback path: ${suggestedCommand}`,
    ].filter(Boolean).join(" ");

    process.stdout.write(`${JSON.stringify({
      decision: "block",
      reason,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: reason,
      },
    })}\n`);
    return;
  }

  const context = [
    "NeoD auto-switched the current session into an `ai-task/*` branch before Ralph activation.",
    (switchResult.stdout || "").trim(),
  ].filter(Boolean).join(" ");

  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: context,
    },
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`NeoD Ralph UserPrompt guard failed: ${error.message}\n`);
  process.exitCode = 1;
});
