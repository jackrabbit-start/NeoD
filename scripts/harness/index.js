#!/opt/homebrew/bin/node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {
  applyLearn,
  completeStage,
  enterStage,
  renderDashboard,
  resolveHarnessRoot,
  startRun,
  status,
} = require("./runtime.js");

function printUsage() {
  process.stdout.write(`Usage:
  harness run start --process <process> --goal <goal> [--risk <risk>] [--verification-target <target>] [--run-id <id>] [--json]
  harness stage enter <stage> [--json]
  harness stage complete <stage> (--json-input <json> | --json-file <path>) [--json]
  harness status [--json]
  harness dashboard render [--json]
  harness learn apply (--json-input <json> | --json-file <path>) [--json]
`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const key = value.slice(2);
    if (key === "json") {
      flags.json = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Flag ${value} requires a value`);
    }
    flags[key] = next;
    i += 1;
  }
  return { positional, flags };
}

async function readPayload(flags) {
  if (flags["json-input"]) {
    return JSON.parse(flags["json-input"]);
  }
  if (flags["json-file"]) {
    const filePath = path.resolve(flags["json-file"]);
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  }
  throw new Error("Either --json-input or --json-file is required");
}

function printResult(result, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  if (positional.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  const [domain, action, maybeStage] = positional;
  let result;
  if (domain === "run" && action === "start") {
    if (!flags.process || !flags.goal) {
      throw new Error("run start requires --process and --goal");
    }
    result = await startRun({
      processType: flags.process,
      goal: flags.goal,
      risk: flags.risk || "unknown",
      verificationTarget: flags["verification-target"] || "unspecified",
      runId: flags["run-id"],
    });
  } else if (domain === "stage" && action === "enter") {
    if (!maybeStage) {
      throw new Error("stage enter requires a stage name");
    }
    result = await enterStage({ stageName: maybeStage });
  } else if (domain === "stage" && action === "complete") {
    if (!maybeStage) {
      throw new Error("stage complete requires a stage name");
    }
    const payload = await readPayload(flags);
    result = await completeStage({ stageName: maybeStage, payload });
  } else if (domain === "status") {
    result = await status({});
  } else if (domain === "dashboard" && action === "render") {
    result = await renderDashboard({});
  } else if (domain === "learn" && action === "apply") {
    const payload = await readPayload(flags);
    result = await applyLearn({ payload });
  } else if (domain === "paths") {
    result = {
      harness_root: resolveHarnessRoot(),
    };
  } else {
    printUsage();
    process.exitCode = 1;
    return;
  }
  printResult(result, Boolean(flags.json));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
