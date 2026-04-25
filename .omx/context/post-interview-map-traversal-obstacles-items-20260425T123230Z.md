# Post-Interview Context — Map Traversal, Obstacles, and Intermittent Items

- Source spec: `.omx/specs/deep-interview-map-traversal-obstacles-items.md`
- Source transcript/context: `.omx/interviews/map-traversal-obstacles-items-20260425T120839Z.md`, `.omx/context/map-traversal-obstacles-items-20260425T115901Z.md`
- Planning artifacts: `.omx/plans/prd-map-traversal-obstacles-items.md`, `.omx/plans/test-spec-map-traversal-obstacles-items.md`, `.omx/plans/ralplan-map-traversal-obstacles-items.md`
- Branch/worktree: `ai-task/84u892rhf8h23` before merge to `ai-dev`
- Summary: Post-interview plus post-implementation capture for the first traversal-map pass. The feature expands the fixed arena into a larger scrolling world, adds sparse static obstacles that block player and enemies, seeds existing loot items across safe map positions, and adjusts enemy/projectile bounds for the larger world.

## Lessons

- Keep viewport constants (`GAME_WIDTH`, `GAME_HEIGHT`) distinct from map/world bounds. UI overlays and camera-independent HUD elements still use viewport metrics.
- Use a rectangular `WorldBounds { x, y, width, height }` contract for map, physics, enemy spawn, and projectile bounds so origin/margin assumptions do not diverge.
- Since enemies are velocity-driven and not pathfinding-aware, V1 blocking obstacles must stay sparse, non-maze-like, and pure-tested for start/spawn clearance.
- Ambient map items should reuse the existing `LootEntity` attraction/collection path rather than introducing a new pickup system.
- Existing material items are safe for ambient placement; `tuning-capsule` is excluded from first-pass ambient map spawns to avoid flooding run progression.

## New Files

- `src/systems/mapLayout.ts` — pure map layout, world bounds, obstacle, ambient item, and enemy spawn safety helpers.
- `docs/wiki/map-traversal-obstacles.md` — durable synthesis of the traversal/obstacle architecture and V1 invariants.

## Modified Files

- `src/scenes/ArenaScene.ts` — larger Arcade world/camera follow, grid/floor placeholder, static obstacle bodies, player/enemy obstacle colliders, ambient loot seeding, world-aware enemy spawns, shared `spawnLootDrop`, world-bound projectile cleanup, and fixed-scroll player healthbar.
- `src/systems/weaponBehaviors.ts` — `isProjectileOutOfBounds` now supports either legacy width/height arguments or rectangular world bounds.
- `tests/game-logic.test.mjs` — added deterministic map layout, ambient item, and enemy spawn safety tests.
- `tests/weapon-behaviors.test.mjs` — added rectangular world-bounds projectile cleanup tests.
- `docs/index.md`, `docs/log.md` — added wiki catalog/log entries for the traversal architecture page.

## Decisions / Constraints

- In scope: larger scrolling world, camera follow, sparse blocking obstacles, existing ambient item placement, safe enemy spawn adjustment, world-aware projectile cleanup.
- Out of scope: procedural generation, room/portal transitions, new item types, full art pass, pathfinding, full combat rebalance.
- Projectiles are not blocked by obstacles in V1; player and enemy collision is the required terrain semantic.
- Sequential Ralph remains preferred for future changes because several surfaces converge in `ArenaScene.ts`.

## Verification

Latest Ralph verification evidence:

- `pnpm typecheck` — passed; Node engine warning only (`node v25.5.0` vs repo `22.x`).
- `pnpm test` — passed; 101 tests, 0 failures; Node engine warning only.
- `pnpm build` — passed; Vite chunk-size warning only.
- Architect verification — APPROVE.
- Deslop pass — completed with no code changes; post-deslop typecheck/test/build passed.

## Residual Risks

- Manual browser smoke was not run in this session. Future agents should manually confirm camera feel, obstacle collision feel, ambient item pickup readability, and wave progression in the browser.
- Enemy obstacle behavior is collision-only without pathfinding by design. If playtests show stuck enemies or exploits, adjust the authored layout/spawn candidates before adding pathfinding.

## Next Recommended Use

Use this note plus `docs/wiki/map-traversal-obstacles.md` when modifying map size, obstacle layout, enemy spawning, projectile bounds, or map item placement. Preserve the V1 non-goals unless a new interview/plan explicitly reopens them.
