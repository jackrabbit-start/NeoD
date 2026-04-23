# Test Spec: Safe Topdown Combine Action Game V1

## Status

- Companion to: `.omx/plans/prd-safe-topdown-combine-action-game-v1.md`
- Upstream baseline: `docs/game-requirements.md`
- Planning state: draft for consensus review

## Scope Under Test

The first playable prototype of the safe top-down combine action game:

- top-down movement and combat,
- slime drop loop,
- combine-driven weapon growth,
- wave escalation,
- boss-clear run ending.

## Test Strategy

Prioritize thin but meaningful coverage around deterministic gameplay rules, then use manual playthrough checks for moment-to-moment combat feel.

## Verification Layers

### Build And Tooling

- Project installs successfully
- Dev server starts
- Production build succeeds
- TypeScript compilation succeeds

### Logic Tests

- Drop-table resolver returns only allowed loot and respects configured weights
- Combine recipe resolver upgrades only when the required inputs are present
- Wave progression triggers the boss only after the configured prerequisite state
- Run-end state fires only on boss defeat

### Scene Or Integration Checks

- Player can move and attack in the arena
- Defeated slime can create a collectible drop
- Collecting and combining loot changes weapon output or combat effectiveness
- Boss encounter is reachable in one run
- Boss clear transitions to a run-end result state

### Manual Play Checks

- One full run can be completed without dead-end progression
- Growth is noticeable from early run to pre-boss phase
- At least two build outcomes are actually reachable in repeated runs
- HUD feedback is sufficient to understand held drops and combine outcomes

## Acceptance Mapping

1. `Run boots into arena`
   - Verified by dev-server run and manual start
2. `Movement and attack work`
   - Verified by scene/integration check
3. `Slimes drop loot`
   - Verified by logic tests and manual pickup confirmation
4. `Combine flow upgrades power`
   - Verified by recipe tests and combat comparison
5. `Wave escalation reaches boss`
   - Verified by wave progression test and manual run-through
6. `Boss defeat ends run`
   - Verified by scene transition or result-state check
7. `Two build outcomes exist`
   - Verified by repeatable manual runs and recipe availability review

## Proposed Test Assets

- Small deterministic test data for:
  - slime drop weights,
  - starter weapon definitions,
  - at least one upgrade recipe,
  - minimal wave schedule including boss trigger.

## Exit Criteria

- Build and typecheck pass
- Deterministic logic tests for drop/combine/wave core rules pass
- Manual run from start to boss clear succeeds
- Two meaningfully different upgrade outcomes are demonstrated
- No out-of-scope V1 features are required to complete the run

## Known Gaps At Plan Time

- Exact test runner is not yet chosen because the repo is still scaffold-only
- Automated combat-feel validation will remain limited until implementation exists
- HUD readability is likely to need manual review even if logic tests pass
