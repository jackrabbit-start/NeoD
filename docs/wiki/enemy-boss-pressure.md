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


## Near-Miss Low-Clear-Rate Follow-Up

The follow-up interview after PR #31 clarified that the 3x density pass was still too easy. The new target is a default balance that feels like a hard, low-clear-rate mode: roughly **under 20% clear rate before mastery**.

Durable rules from the follow-up:

- Use near-miss reach: dash distance/speed and AOE range should feel like they barely miss when dodged correctly.
- Add grouped pressure: waves may use burst/group spawning so several enemies enter at once instead of only one enemy per timer tick.
- Idle/static play should not survive regular waves.
- Even at low clear rate, preserve the non-goals: no unreadable deaths, no opening instant deaths, and no literally unavoidable hitboxes.
- Do not use player hit cooldown as the primary tuning lever unless a later requirement explicitly reopens it.

Implementation currently in progress on `ai-task/difficulty-near-miss-pressure` adds optional `WaveDefinition.burstSize`, burst-spawn runtime behavior, stronger enemy movement/attack constants, and a small starter weapon nerf.

Verification recorded before this context capture:

- `pnpm typecheck`
- `pnpm test` — 94 passing tests
- `pnpm build`
- `git diff --check`

Known caveat: no manual browser play-feel validation has proven the <20% clear-rate target yet.

Source artifacts:

- `.omx/specs/deep-interview-difficulty-near-miss-pressure.md`
- `.omx/interviews/difficulty-near-miss-pressure-20260425T114801Z.md`
- `.omx/context/difficulty-near-miss-pressure-20260425T114145Z.md`
- `.omx/context/post-interview-difficulty-near-miss-pressure-20260425T115729Z.md`


## Boss Dash Dodge Follow-Up

A later interview clarified that a large boss AOE should be avoidable through an explicit player action rather than by reducing overall pressure. The chosen V1 answer is **Space dash with a short invulnerability window**.

Durable rules from this follow-up:

- Space dash is the intended player agency tool for dodging boss telegraphed AOE.
- Preserve wave pressure and boss pressure; do not solve dodgeability by globally nerfing density, spawn cadence, or boss threat.
- Keep dash tuning deterministic and test-covered: duration, cooldown, i-frame window, and the relationship between dash+walk distance and boss AOE radius/telegraph time should remain explicit.
- The shared player damage gate may treat dash i-frames as temporary immunity, including contact damage, but only inside the short dash window.
- Manual browser play-feel is still recommended after future dash or boss AOE tuning.

Implementation notes from the first pass:

- `src/systems/playerDash.ts`: pure dash constants and timing/direction helpers.
- `src/scenes/ArenaScene.ts`: Space input, dash velocity, and dash invulnerability wiring.
- `src/systems/playerDamageRules.ts`: optional invulnerability gate for player damage.
- `tests/player-dash.test.mjs`: deterministic dash timing and boss AOE escape-distance coverage.
- `tests/player-damage-rules.test.mjs`: dash invulnerability damage-gate coverage.

Verification recorded before this context capture:

- `pnpm typecheck`
- `pnpm test` — 104 passing tests
- `pnpm build`
- `git diff --check`

Known caveat: no manual browser play-feel validation has proven the dash timing against the live boss fight yet.

Source artifacts:

- `.omx/specs/deep-interview-boss-dash-dodge.md`
- `.omx/interviews/boss-dash-dodge-20260425T121731Z.md`
- `.omx/context/boss-aoe-dodgeability-20260425T121010Z.md`
- `.omx/context/post-interview-boss-dash-dodge-20260425T122704Z.md`

## Source Artifacts

- `.omx/specs/deep-interview-enemy-boss-pressure.md`
- `.omx/interviews/enemy-boss-pressure-20260425T111248Z.md`
- `.omx/context/enemy-boss-pressure-20260425T110714Z.md`
- `.omx/context/post-interview-enemy-boss-pressure-20260425T112833Z.md`
- PR #31: https://github.com/jackrabbit-start/NeoD/pull/31
