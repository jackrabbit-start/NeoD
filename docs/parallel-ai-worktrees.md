# Parallel AI Worktrees

This repo is set up for parallel AI delivery with `git worktree`, not full duplicate clones.

## Why `git worktree`

- One shared Git object store, multiple working directories
- Lower disk cost than repeated clones
- Clean branch-per-agent isolation
- Easy PR flow back into `ai-dev`

## Branch Model

- `main`: publication branch
- `ai-dev`: integration branch for AI work
- `ai-task/<task-name>`: one branch per AI task

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
pnpm run ai:worktree -- ui-polish
pnpm run ai:worktree -- combat-balance
pnpm run ai:worktree -- drop-loop
```

The helper script:

- creates `ai-task/<task-name>` when missing
- creates a sibling worktree directory
- bases new work on `ai-dev` by default
- prints the next commands to run inside that worktree

Use another base branch only when you mean to stack work:

```sh
pnpm run ai:worktree -- boss-phase-2 ai-task/combat-balance
```

## Per-Agent Workflow

Inside each worktree:

```sh
pnpm install
pnpm dev -- --port 5173
```

Use a unique port per worktree:

- first extra worktree: `5173`
- second extra worktree: `5174`
- third extra worktree: `5175`

Before pushing:

```sh
pnpm typecheck
pnpm test
pnpm build
```

Then publish the branch:

```sh
git push -u origin ai-task/ui-polish
gh pr create --base ai-dev --head ai-task/ui-polish
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
- One task branch per AI
- One PR per task branch
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
  - `docs/game-requirements.md`
  - `.omx/plans/prd-safe-topdown-combine-action-game-v1.md`
  - `.omx/plans/test-spec-safe-topdown-combine-action-game-v1.md`
