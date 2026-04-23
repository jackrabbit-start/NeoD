# Parallel AI Worktrees

This repo is set up for parallel AI delivery with `git worktree`, not full duplicate clones.

## Why `git worktree`

- One shared Git object store, multiple working directories
- Lower disk cost than repeated clones
- Clean branch-per-agent isolation
- Easy PR flow back into `ai-dev`

## OMX Session Model

- one OMX session = one worktree
- one OMX session = one `ai-task/<session-name>` branch
- one OMX session = one PR back into `ai-dev`

Do not reuse the same worktree for multiple independent OMX sessions.

## Branch Model

- `main`: publication branch
- `ai-dev`: integration branch for AI work
- `ai-task/<session-name>`: one branch per OMX session

Default rule: each AI gets exactly one branch and one worktree directory.

## Directory Model

Create sibling directories next to the main repo:

```text
/Users/kkh/NeoD
/Users/kkh/NeoD-ui-polish
/Users/kkh/NeoD-combat-balance
/Users/kkh/NeoD-drop-loop
```

Do not point two AIs at the same worktree.

## Quick Start

From the main repo:

```sh
git fetch origin
pnpm run ai:session -- ui-polish
pnpm run ai:session -- combat-balance
pnpm run ai:session -- drop-loop
```

The helper script:

- creates `ai-task/<session-name>` when missing
- creates a sibling worktree directory
- bases new work on `ai-dev` by default
- prints the next OMX session commands to run inside that worktree

Use another base branch only when you mean to stack work:

```sh
pnpm run ai:session -- boss-phase-2 ai-task/combat-balance
```

## Ralph Sessions

If the task should run under OMX `ralph`, start it with the Ralph wrapper instead of launching from `ai-dev` directly:

```sh
pnpm run ai:ralph-session -- hud-pass -- "Improve HUD readability during combat"
```

This flow:

- creates or reuses the sibling worktree
- stores repo-local session metadata in `.omx/ai-session.json`
- launches `omx ralph ...` inside that worktree

When the Ralph run reaches a terminal finished state, the repo-specific Stop hook can auto-run the publish flow for that worktree:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- commit all local changes
- push the `ai-task/*` branch
- open a PR to `ai-dev`

The Stop hook only auto-publishes when all of these are true:

- current repo is `jackrabbit-start/NeoD`
- current branch matches `ai-task/*`
- the session-scoped Ralph state is terminal with `run_outcome=finish`
- the same completion was not already published

For current-session switching inside OMX, NeoD can also auto-switch the active worktree into `ai-task/*` when `$ralph` starts and the worktree is clean. The backend command is:

```sh
pnpm run ai:switch-session -- --name hud-pass --task "Improve HUD readability during combat"
```

Project-local OMX skill name:

```text
$neo-new-session
```

## Per-Agent Workflow

Inside each worktree:

```sh
pnpm install
pnpm dev -- --port 5173
omx
```

Use a unique port per worktree:

- first extra worktree: `5173`
- second extra worktree: `5174`
- third extra worktree: `5175`

When the OMX session is done, publish from inside that worktree:

```sh
pnpm run ai:publish -- --message-file .git/commit-msg-ai.txt
```

The publish script:

- requires the current branch to match `ai-task/*`
- runs `pnpm typecheck`, `pnpm test`, and `pnpm build`
- stages and commits all local changes using the Lore-format message file
- pushes the branch to origin
- opens a PR to `ai-dev` with `gh`

Example Lore commit message file:

```sh
Implement drop loop readability improvements

Adjust the arena feedback so early-run pickups and upgrades are easier to read
without changing the V1 combat scope.

Constraint: Must preserve browser-first V1 scope
Rejected: Add a new HUD framework dependency | unnecessary for current UI scope
Confidence: medium
Scope-risk: narrow
Directive: Keep pickup/combine feedback lightweight until the core loop is stable
Tested: pnpm typecheck; pnpm test; pnpm build
Not-tested: Manual browser feel check
```

## Task Splitting Guidance

Prefer boundaries like these:

- `src/scenes/`: scene flow, wave transitions, win/loss flow
- `src/systems/`: drop logic, combine logic, progression rules
- `src/ui/`: HUD readability and presentation
- `src/data/`: enemy, loot, recipe, and wave tuning
- `tests/`: deterministic rule coverage

Avoid parallel tasks that edit the same files unless one task is explicitly stacked on another branch.

## Recommended Operating Rules

- One AI per worktree
- One session branch per OMX session
- One PR per session branch
- Default PR base is `ai-dev`
- Merge into `ai-dev` first, then promote `ai-dev` to `main`
- Rebase or restack only when conflicts actually appear

## Cleanup

After a task is merged:

```sh
git worktree remove ../NeoD-ui-polish
git branch -d ai-task/ui-polish
```

If the remote branch is no longer needed:

```sh
git push origin --delete ai-task/ui-polish
```

## Notes For This Repo

- Package manager: `pnpm`
- Stack: `TypeScript + Vite + Phaser`
- Verification expectation: `pnpm typecheck`, `pnpm test`, `pnpm build`
- V1 work should stay aligned with:
  - `docs/wiki/game-requirements.md`
  - `.omx/plans/prd-safe-topdown-combine-action-game-v1.md`
  - `.omx/plans/test-spec-safe-topdown-combine-action-game-v1.md`
