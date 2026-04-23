#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

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

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function isFinishedRalphState(state) {
  if (!state || typeof state !== "object") return false;

  return state.active === false
    && String(state.run_outcome || "") === "finish"
    && String(state.lifecycle_outcome || "") === "finished";
}

function humanizeSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCommitMessage(sessionMeta, ralphState) {
  const rawSessionName = String(sessionMeta?.session_name || "").trim();
  const rawTaskText = String(sessionMeta?.task_text || ralphState?.task_description || "").trim();
  const sessionSlug = String(sessionMeta?.session_slug || "").trim();
  const titleBase = rawSessionName || sessionSlug || "ralph session";
  const title = `Deliver ${humanizeSlug(titleBase.replace(/\s+/g, "-").toLowerCase())} via Ralph session`;
  const bodyContext = rawTaskText
    ? `This publishes the completed Ralph session for "${rawTaskText}" with the repo-standard verification and PR flow.`
    : "This publishes the completed Ralph session with the repo-standard verification and PR flow.";

  return `${title}

${bodyContext}

Constraint: Ralph sessions in NeoD must stay isolated to one ai-task branch and one worktree
Rejected: Keep Ralph completion manual per session | too easy to forget branch publication or PR creation
Confidence: medium
Scope-risk: narrow
Directive: Keep auto-publish scoped to finished Ralph sessions on ai-task/* branches only
Tested: pnpm typecheck; pnpm test; pnpm build
Not-tested: Manual browser playthrough after this specific Ralph session`;
}

async function main() {
  const payload = await readStdinJson();
  if (!payload || payload.hook_event_name !== "Stop") return;

  const repoRoot = runGit(["rev-parse", "--show-toplevel"], process.cwd());
  const remoteUrl = runGit(["config", "--get", "remote.origin.url"], repoRoot);
  if (!TARGET_REMOTE_RE.test(remoteUrl)) return;

  const branchName = runGit(["branch", "--show-current"], repoRoot);
  if (!branchName.startsWith("ai-task/")) return;

  const sessionId = String(payload.session_id || payload.sessionId || "").trim();
  const sessionDir = sessionId
    ? join(repoRoot, ".omx", "state", "sessions", sessionId)
    : join(repoRoot, ".omx", "state");
  const ralphStatePath = sessionId
    ? join(sessionDir, "ralph-state.json")
    : join(repoRoot, ".omx", "state", "ralph-state.json");
  const publishStatePath = join(sessionDir, "ai-publish-state.json");
  const sessionMetaPath = join(repoRoot, ".omx", "ai-session.json");
  const commitMessagePath = join(repoRoot, ".git", "commit-msg-ai-auto.txt");

  const [ralphState, publishState, sessionMeta] = await Promise.all([
    readJsonIfExists(ralphStatePath),
    readJsonIfExists(publishStatePath),
    readJsonIfExists(sessionMetaPath),
  ]);

  if (!isFinishedRalphState(ralphState)) return;

  const completionKey = JSON.stringify({
    session_id: sessionId || null,
    branch: branchName,
    completed_at: ralphState.completed_at || null,
    run_outcome: ralphState.run_outcome || null,
  });

  if (publishState?.status === "success" && publishState.completion_key === completionKey) {
    return;
  }

  await mkdir(sessionDir, { recursive: true });
  await writeFile(commitMessagePath, `${buildCommitMessage(sessionMeta, ralphState)}\n`, "utf8");

  const publish = spawnSync(
    "pnpm",
    ["run", "ai:publish", "--", "--message-file", commitMessagePath],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (publish.status === 0) {
    await writeFile(
      publishStatePath,
      JSON.stringify(
        {
          status: "success",
          completion_key: completionKey,
          branch: branchName,
          completed_at: ralphState.completed_at || null,
          stdout: publish.stdout.trim() || null,
        },
        null,
        2,
      ),
      "utf8",
    );
    return;
  }

  await writeFile(
    publishStatePath,
    JSON.stringify(
      {
        status: "failed",
        completion_key: completionKey,
        branch: branchName,
        completed_at: ralphState.completed_at || null,
        error: publish.stderr.trim() || publish.stdout.trim() || "publish failed",
      },
      null,
      2,
    ),
    "utf8",
  );

  process.stderr.write(`NeoD Ralph auto-publish failed: ${publish.stderr || publish.stdout}\n`);
}

main().catch((error) => {
  process.stderr.write(`NeoD Ralph stop hook failed: ${error.message}\n`);
});
