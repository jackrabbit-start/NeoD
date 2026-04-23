---
name: neo-new-session
description: Switch the current NeoD OMX session into an isolated `ai-task/*` branch before implementation work, especially before Ralph starts. Use when the user wants branch isolation in the current session without opening a new worktree or detached tmux session.
---

# Neo New Session

Use this skill in NeoD when the user wants the current OMX session isolated onto a task branch.

## Primary action

Run the repo-local switcher:

```sh
pnpm run ai:switch-session -- --name <session-name> [--task "<task text>"] [--base ai-dev]
```

Example:

```sh
pnpm run ai:switch-session -- --name hud-pass --task "Improve HUD readability during combat"
```

## When to use

- before starting `$ralph` in the current session
- when the user wants branch isolation but does not want a new worktree
- when the current session is still on `ai-dev` and needs to move to `ai-task/*`

## Guardrails

- only use this in the NeoD repo
- if the worktree is dirty, do not switch branches; tell the user to commit or stash first
- default base branch is `ai-dev`
- keep the session name short and slug-friendly

## Output contract

After running the switcher, report only:

- new branch name
- repo path
- whether the task text was recorded into `.omx/ai-session.json`
