# Difficulty Survival Pressure

This page summarizes the durable balancing lesson from the “difficulty too low” interview, planning, implementation, and PR #25.

## Intent

NeoD V1 should feel mostly clearable for a first-time demo player, but sloppy play should not feel safe. The current balance target from the interview is:

- **3–4 meaningful contact/AOE mistakes should put a 100 HP player in danger.**
- The default run should remain readable and fair, not challenge-first.

## Current Pattern

Use a constrained survival-pressure pass before adding new product surface:

1. Prefer existing data levers:
   - enemy speed
   - contact damage
   - telegraphed AOE damage/cooldown
   - regular-wave spawn cadence
2. Keep player reward feel intact:
   - do not nerf weapons/tuning as a first response to low difficulty
3. Keep run shape stable:
   - avoid adding waves or materially lengthening the run
4. Keep hit cadence explicit:
   - player damage gating belongs in `src/systems/playerDamageRules.ts`
   - avoid reintroducing inline scene magic numbers for hit cooldowns

## Important Constraints From the Interview

The first pass explicitly excluded:

- new enemy types or attack patterns
- weapon/tuning nerfs
- difficulty selection UI
- materially longer run length

Future agents should not treat the merged pass as permission to violate those constraints. Reopen requirements if a future difficulty pass needs any of them.

## Implementation Notes

PR #25 added:

- `src/systems/playerDamageRules.ts`
  - `PLAYER_HIT_COOLDOWN_MS = 375`
  - `shouldApplyPlayerDamage(...)`
- `tests/player-damage-rules.test.mjs`
  - locks the cooldown boundary and interaction-block immunity

The PR also tuned existing enemies and regular-wave cadence. During rebase, `ai-dev` had already introduced mixed-wave `entries` with dash/orbit slimes, so the conflict resolution preserved those entries and applied the shorter spawn intervals on top.

## Verification Baseline

The merged pass was verified with:

- `pnpm typecheck`
- `pnpm test` — 87 passing tests
- `pnpm build`

Known non-blocking warnings at the time:

- Node engine warning because the local runtime was Node `v25.5.0` while the repo expects Node `22.x`
- Vite chunk-size warning from the existing bundle size

## Residual Risk

Automated tests lock constants and invariants, but they do not prove play feel. For future tuning:

- run a browser/manual play check when possible
- if contact overlap feels unfair, first consider moving `PLAYER_HIT_COOLDOWN_MS` toward `400–425ms`
- do not immediately undo all enemy data tuning unless manual play suggests the whole pass overshot

## Source Artifacts

- `.omx/specs/deep-interview-difficulty-too-low.md`
- `.omx/interviews/difficulty-too-low-20260425T101734Z.md`
- `.omx/context/post-interview-difficulty-survival-pressure-20260425T105130Z.md`
- `.omx/plans/ralplan-difficulty-survival-pressure-pass.md`
- PR: https://github.com/jackrabbit-start/NeoD/pull/25
