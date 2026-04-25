# Enemy Boss Pressure

This page preserves the durable lesson from the enemy/boss pressure interview, implementation, and PR #31.

## Intent

The clarified goal was not simply “make the game harder.” The player wanted the late game to feel like **살아남기 벅참**: many enemies force constant movement, dodging, and target selection, while skilled play can still survive.

## Current Extreme Experiment

PR #31 intentionally made a challenge-first tuning pass:

- Regular wave counts moved from `6 / 8 / 9` to `18 / 24 / 27`.
- Regular spawn intervals moved to `650 / 520 / 420ms`.
- `slime-boss` health increased substantially, but not as a standalone sponge.
- Boss AOE became faster, larger, and player-anchored so the longer fight has active dodge pressure.

This is an experiment, not a permanent proof of final balance.

## Rules For Future Tuning

1. Preserve readable pressure over literal maximum density.
2. If the pass feels unfair, first reduce wave density, spawn cadence, or boss AOE values before discarding the survival-pressure target.
3. Do not increase boss HP without adding or preserving active pattern pressure.
4. Keep boss defeat mapped to the existing win flow.
5. Avoid new dependencies and new attack schemas unless a later requirement explicitly needs them.
6. Pair deterministic tests with at least one manual browser play-feel check when tuning challenge.

## Implementation Notes

Primary files from PR #31:

- `src/data/waves.ts`: regular-wave density and cadence.
- `src/data/enemies.ts`: boss HP/stat pressure and player-anchored AOE tuning.
- `tests/wave-runtime.test.mjs`: runtime cadence and localized wave-start expectations.
- `tests/game-logic.test.mjs`: deterministic mixed-wave spawn sequence and count.
- `tests/enemy-behaviors.test.mjs`: boss constants and AOE anchor behavior.
- `tests/knockback.test.mjs`: boss knockback expectation after resistance/weight changes.

The implementation deliberately stayed data-first and reused the existing `telegraphed-aoe` behavior instead of adding a new boss phase schema.

## Verification Baseline

After rebasing on updated `ai-dev`, the merged PR passed:

- `pnpm typecheck`
- `pnpm test` — 94 passing tests
- `pnpm build`
- `git diff --check`

Known caveats:

- No manual browser play-feel pass was recorded after the 3x density merge.
- Local commands emitted the known Node engine warning when run under Node `v25.5.0`; the repo expects Node `22.x`.
- The build emitted the known Vite chunk-size warning.

## Source Artifacts

- `.omx/specs/deep-interview-enemy-boss-pressure.md`
- `.omx/interviews/enemy-boss-pressure-20260425T111248Z.md`
- `.omx/context/enemy-boss-pressure-20260425T110714Z.md`
- `.omx/context/post-interview-enemy-boss-pressure-20260425T112833Z.md`
- PR #31: https://github.com/jackrabbit-start/NeoD/pull/31
