#!/opt/homebrew/bin/node
"use strict";

const {
  buildPreToolUseDecision,
  buildStopDecision,
  buildUserPromptSubmitContext,
} = require("./runtime.js");

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

async function main() {
  const payload = await readStdinJson();
  const eventName = payload && typeof payload.hook_event_name === "string"
    ? payload.hook_event_name.trim()
    : "";

  let response = null;
  if (eventName === "PreToolUse") {
    response = await buildPreToolUseDecision(payload);
  } else if (eventName === "UserPromptSubmit") {
    response = await buildUserPromptSubmitContext();
  } else if (eventName === "Stop") {
    response = await buildStopDecision();
  }

  if (response) {
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`harness-hook-guard failed: ${error.message}\n`);
  process.exitCode = 1;
});
