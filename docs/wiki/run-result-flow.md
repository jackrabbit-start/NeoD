# Run Result Flow

## Purpose

Run-ending presentation must be visible in both the Phaser scene and the DOM-backed HUD. The boss-result-screen slice fixed a player-facing issue where defeating the boss could feel like nothing happened.

## Source Artifacts

- `.omx/specs/deep-interview-boss-patterns-end-screen.md`
- `.omx/interviews/boss-patterns-end-screen-20260425T104750Z.md`
- `.omx/context/post-interview-boss-result-screen-20260425T110444Z.md`
- PR #27: `https://github.com/jackrabbit-start/NeoD/pull/27`

## Current Pattern

- `src/systems/runResult.ts` owns the deterministic run-result presentation.
- `ArenaScene.endRun` creates a result payload, updates the HUD with `createRunResultHudState`, then starts `ResultScene` immediately.
- `ResultScene` renders the same presentation and refreshes the HUD again when opened.
- Pure tests in `tests/game-logic.test.mjs` cover win/loss presentation copy and reward-neutral constraints.

## Rules For Future Changes

1. Keep run-end copy and summary data centralized in `src/systems/runResult.ts`.
2. Do not duplicate divergent win/loss copy between `ArenaScene`, `ResultScene`, and HUD code.
3. After an enemy damage path can call `endRun`, stop follow-up combat processing when `isRunEnding` becomes true.
4. Boss defeat must map to win; non-boss defeat must continue the run.
5. Do not add run-end rewards, unlocks, persistent progression, loot IDs, weapons, or recipes unless a later requirement explicitly reopens reward scope.
6. For player-facing confidence, pair deterministic tests with at least one manual/browser boss-clear check when the visual path matters.

## Verification Baseline

The merged boss result-screen slice passed:

- `pnpm run typecheck`
- `pnpm test` with 90 tests after rebase conflict resolution
- `pnpm run build`

Known verification caveat: no manual browser boss-kill playthrough was recorded for PR #27. Local commands also emitted the known Node engine warning because the shell used Node v25.5.0 while `package.json` declares Node 22.x.
