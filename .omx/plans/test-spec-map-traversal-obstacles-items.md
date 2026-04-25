# Test Spec: Map Traversal, Obstacles, and Intermittent Items

## Source

- PRD: `.omx/plans/prd-map-traversal-obstacles-items.md`
- Deep-interview spec: `.omx/specs/deep-interview-map-traversal-obstacles-items.md`
- Context snapshot: `.omx/context/map-traversal-obstacles-items-20260425T115901Z.md`

## Unit / Pure Rule Tests

1. `createMapLayout` or equivalent returns obstacles within `WorldBounds { x, y, width, height }`, not only implicit `0..width/height` dimensions.
2. Obstacle layout keeps a clear start area around the player spawn/world center.
3. Obstacle layout leaves all ambient item spawn points clear of obstacles and within world bounds.
4. `isCircleClearOfObstacles` rejects points overlapping obstacle rectangles with radius padding and accepts safe points.
5. Enemy spawn candidate selection respects minimum player distance, world bounds, and obstacle clearance with injected deterministic random/candidate order.
6. Ambient item selection uses only existing `LootId` values and can be deterministic with an injected random source.
7. Projectile out-of-bounds helper, if parameterized, uses supplied world bounds rather than viewport constants.

## Data / Scene Integration Checks

1. `ArenaScene.create` sets Arcade world/camera bounds to the larger map bounds.
2. Player starts at a safe central position and remains constrained by world bounds.
3. Camera follows the player and has bounds matching the larger world.
4. Obstacle static bodies collide with the player and enemy group.
5. Ambient map items are created through the same `LootEntity`/pickup path as drops.
6. Enemy spawning no longer assumes `GAME_WIDTH`/`GAME_HEIGHT` screen edges; it uses safe larger-world positions.
7. Player healthbar remains screen-fixed during camera movement, e.g. via `setScrollFactor(0)` for Phaser healthbar objects.
8. Existing enemy drops still spawn loot at enemy death positions.
9. Any ambient item replenishment is low-capped or omitted for fixed seeded V1.

## Regression Tests

1. Existing loot pickup attraction and collection tests remain green.
2. Existing wave progression tests remain green.
3. Existing weapon behavior and projectile tests remain green after world-bounds parameterization.
4. Existing inventory/combine/tuning tests remain green.
5. Existing run-result and boss-wave completion behavior remains green.

## Acceptance Mapping

- Larger camera-follow world: Data / Scene checks 1–3 and Manual Smoke 1–2.
- Blocking obstacles for player and enemies: Unit tests 1–4 and Scene check 4.
- Intermittent existing items: Unit tests 3 and 6, Scene checks 5 and 9, Manual Smoke 5.
- Preserved combat/waves/loot flow: Scene checks 6–8 and Regression tests 1–5.
- Automated verification: Required commands below.

## Manual Smoke

Run the browser prototype and confirm:

1. Move continuously in all directions and confirm the camera scrolls over a larger map.
2. Confirm the map has placeholder floor/space treatment that makes traversal legible.
3. Confirm obstacles block player movement.
4. Confirm enemies collide with obstacles without obvious mass softlocks in normal play.
5. Confirm ambient items appear sparsely, attract, collect, and update inventory/status.
6. Confirm enemies still spawn near enough to engage rather than only at unreachable distant world edges.
7. Confirm waves still progress through elite/boss and run result still works.
8. Confirm the player healthbar/HUD remains fixed on screen during camera movement.

## Required Verification Commands

```sh
pnpm typecheck
pnpm test
pnpm build
```

## Known Verification Gaps for Execution Owner

- Browser/manual camera feel cannot be fully proven by unit tests; include a manual smoke note in the final execution report.
- Phaser Arcade collision with static obstacles should be manually checked because pure tests only prove layout rules, not runtime collision feel.
