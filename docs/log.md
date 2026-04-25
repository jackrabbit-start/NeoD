# NeoD Docs Log

## [2026-04-23] docs-structure | Adopted Karpathy LLM wiki pattern

- Added `docs/index.md` as the content catalog.
- Added `docs/log.md` as the append-only change log.
- Added `docs/schema.md` to define raw/wiki/schema responsibilities.
- Moved repo-authored documentation pages under `docs/wiki/`.
- Added `docs/raw/README.md` as the landing page for immutable or external source inputs.

## [2026-04-25] workflow | Added post-interview context capture wiki

- Added `docs/wiki/post-interview-context-workflow.md` to document the manual `$post-interview-context` flow.
- Updated `docs/index.md` so future agents can find the workflow.
- Source artifacts: `.omx/specs/deep-interview-post-deep-interview-context-skill.md` and `.codex/skills/post-interview-context/SKILL.md`.

## [2026-04-25] gameplay | Captured difficulty survival-pressure lesson

- Added `docs/wiki/difficulty-survival-pressure.md` to synthesize the difficulty-too-low interview, plan, implementation, and PR #25.
- Updated `docs/index.md` so future agents can find the balance guidance.
- Source artifacts: `.omx/specs/deep-interview-difficulty-too-low.md`, `.omx/interviews/difficulty-too-low-20260425T101734Z.md`, and `.omx/context/post-interview-difficulty-survival-pressure-20260425T105130Z.md`.

## [2026-04-25] ui | Added overlay rendering lifecycle rule

- Added `docs/wiki/ui-overlay-rendering.md` to preserve the Codex scroll-reset lesson for future DOM-backed overlays.
- Updated `docs/index.md` so future agents can find the UI overlay rendering rule.
- Source artifacts: `.omx/context/post-interview-codex-scroll-reset-20260425T105023Z.md` and PR #24.

## [2026-04-25] gameplay-ui | Captured player health bar placement rule

- Updated `docs/wiki/game-requirements.md` to record that moment-to-moment survival feedback should be visible in the gameplay canvas when it affects dodging/positioning.
- Recorded the shipped player health bar as a compact Phaser canvas overlay with deterministic placement/fill helpers.
- Source artifacts: `.omx/specs/deep-interview-health-bar-bottom.md`, `.omx/interviews/health-bar-bottom-20260425T013800Z.md`, `.omx/context/post-interview-health-bar-bottom-20260425T110701Z.md`, and PR #28.

## [2026-04-25] gameplay-ui | Captured dropped loot pickup UX boundary

- Added `docs/wiki/dropped-loot-pickup-ux.md` to preserve the current-loot-only interpretation, pickup radii, magnet feedback, and true-weapon-drop non-goal.
- Updated `docs/index.md` so future agents can find the dropped loot pickup guidance.
- Source artifacts: `.omx/specs/deep-interview-dropped-loot-pickup-design.md`, `.omx/interviews/dropped-loot-pickup-design-20260425T100726Z.md`, `.omx/context/post-interview-dropped-loot-pickup-design-20260425T111351Z.md`, and PR #30.

## [2026-04-25] gameplay | Added run result flow rule

- Added `docs/wiki/run-result-flow.md` to preserve the boss-clear result-screen fix and shared presentation boundary.
- Updated `docs/index.md` so future agents can find the run-ending flow rules.
- Source artifacts: `.omx/specs/deep-interview-boss-patterns-end-screen.md`, `.omx/context/post-interview-boss-result-screen-20260425T110444Z.md`, and PR #27.

## [2026-04-25] gameplay | Captured enemy boss pressure experiment

- Added `docs/wiki/enemy-boss-pressure.md` to preserve the 3x density extreme-experiment target, boss anti-sponge rule, and follow-up tuning boundaries.
- Updated `docs/index.md` so future agents can find the enemy/boss pressure guidance.
- Source artifacts: `.omx/specs/deep-interview-enemy-boss-pressure.md`, `.omx/interviews/enemy-boss-pressure-20260425T111248Z.md`, `.omx/context/post-interview-enemy-boss-pressure-20260425T112833Z.md`, and PR #31.

## [2026-04-25] gameplay | Captured melee weapon line architecture lesson

- Added `docs/wiki/melee-weapon-line.md` to synthesize the melee-first interview, PRD, test spec, and implementation verification.
- Updated `docs/index.md` so future agents can find the melee architecture guidance.
- Source artifacts: `.omx/specs/deep-interview-weapon-capsule-variety.md`, `.omx/plans/prd-melee-weapon-line.md`, `.omx/plans/test-spec-melee-weapon-line.md`, and `.omx/context/post-interview-melee-weapon-line-20260425T114954Z.md`.

## [2026-04-25] gameplay | Captured map traversal and obstacle architecture

- Added `docs/wiki/map-traversal-obstacles.md` to synthesize the larger scrolling map, sparse blocking obstacle, ambient item, and safe spawn rules.
- Updated `docs/index.md` so future agents can find the traversal/obstacle guidance.
- Source artifacts: `.omx/specs/deep-interview-map-traversal-obstacles-items.md`, `.omx/plans/prd-map-traversal-obstacles-items.md`, `.omx/plans/test-spec-map-traversal-obstacles-items.md`, and `.omx/context/post-interview-map-traversal-obstacles-items-20260425T123230Z.md`.

## [2026-04-25] gameplay | Captured near-miss difficulty follow-up

- Updated `docs/wiki/enemy-boss-pressure.md` with the low-clear-rate near-miss follow-up: burst/group spawns, harder dash/AOE reach, and explicit readability non-goals.
- Source artifacts: `.omx/specs/deep-interview-difficulty-near-miss-pressure.md`, `.omx/interviews/difficulty-near-miss-pressure-20260425T114801Z.md`, and `.omx/context/post-interview-difficulty-near-miss-pressure-20260425T115729Z.md`.

## [2026-04-25] gameplay | Captured boss dash dodge follow-up

- Updated `docs/wiki/enemy-boss-pressure.md` with the Space dash + short i-frame rule for avoiding boss telegraphed AOE without reducing wave or boss pressure.
- Source artifacts: `.omx/specs/deep-interview-boss-dash-dodge.md`, `.omx/interviews/boss-dash-dodge-20260425T121731Z.md`, and `.omx/context/post-interview-boss-dash-dodge-20260425T122704Z.md`.

## [2026-04-25] gameplay-ui | Switched dash input away from Space

- Updated the boss dash guidance and player-facing control copy from Space to J because Space can scroll the browser page in the web prototype.
- Preserved the existing short i-frame dash behavior and boss-pressure constraints.

## [2026-04-25] gameplay-ui | Reworked traversal map toward minimap recovery flow

- Updated `docs/wiki/map-traversal-obstacles.md` to record the follow-up direction: no blocking obstacles, top-right minimap, and intermittent health-only heart pickups.
- Preserved larger-map traversal rules while marking blocking obstacles as reversed unless a later plan reopens terrain blockers.
