# Map Traversal and Blocking Obstacles

## Status

Durable architecture and verification note for NeoD V1 map traversal, sparse blocking obstacles, and intermittent existing item placement.

## Sources

- Deep-interview spec: `.omx/specs/deep-interview-map-traversal-obstacles-items.md`
- Interview transcript: `.omx/interviews/map-traversal-obstacles-items-20260425T120839Z.md`
- PRD: `.omx/plans/prd-map-traversal-obstacles-items.md`
- Test spec: `.omx/plans/test-spec-map-traversal-obstacles-items.md`
- Post-interview context: `.omx/context/post-interview-map-traversal-obstacles-items-20260425T123230Z.md`

## Decision

Model V1 traversal as a static larger scrolling world, not as a decorative camera illusion or room/portal progression. The player moves through a world larger than the viewport, the camera follows the player, and sparse authored obstacles create real terrain by blocking both player and enemies.

The map layout belongs in pure rules where possible. Runtime Phaser code should consume those rules for camera/world bounds, obstacle bodies, safe enemy spawns, and ambient item placement.

## V1 Invariants

- **Viewport vs world:** keep `GAME_WIDTH` / `GAME_HEIGHT` as viewport/UI metrics. Use a separate rectangular world-bounds contract for map/physics/projectile cleanup.
- **World bounds shape:** prefer `WorldBounds { x, y, width, height }` over width/height-only helpers so origin and margins remain explicit.
- **Obstacles:** static authored obstacles block player and enemies. They should be sparse, non-maze-like, and tested for start/spawn clearance.
- **Enemy movement:** V1 enemies are not pathfinding-aware. Mitigate with layout and spawn rules before adding new AI/pathfinding complexity.
- **Ambient items:** map-placed pickups reuse existing `LootId` item definitions and the existing `LootEntity` attraction/collection path.
- **Item economy:** do not ambient-spawn `tuning-capsule` in the first pass; keep ambient materials sparse so recipe progression is not flooded.
- **Projectile terrain:** projectiles are cleaned up against world bounds but are not obstacle-blocked in V1 unless a later plan explicitly reopens that scope.
- **HUD:** Phaser HUD-like objects that should remain screen-fixed must use `setScrollFactor(0)` after camera follow is introduced.

## Implementation Surfaces

- Pure layout rules: `src/systems/mapLayout.ts`
- Runtime scene integration: `src/scenes/ArenaScene.ts`
- Projectile bounds helper: `src/systems/weaponBehaviors.ts`
- Tests: `tests/game-logic.test.mjs`, `tests/weapon-behaviors.test.mjs`

## Verification Expectations

For future changes touching this surface, run:

```sh
pnpm typecheck
pnpm test
pnpm build
```

Preserve or update deterministic tests for:

- obstacle rectangles staying inside rectangular world bounds;
- player start area staying clear;
- ambient item spawn points staying inside bounds and clear of obstacles;
- enemy spawn points staying distant from the player, in bounds, and clear of obstacles;
- projectile cleanup using rectangular world bounds;
- existing loot pickup, wave progression, and weapon behavior regressions.

Manual browser smoke is still important because unit tests cannot prove camera feel or Phaser collision feel. Check camera scrolling, obstacle blocking, enemy engagement, ambient pickup readability, and wave progression.

## Rejected Alternatives

- **Decorative-only scroll illusion:** rejected because the user explicitly selected a larger scrolling map and real blocking obstacles.
- **Player-only or visual-only obstacles:** rejected because the requested V1 terrain blocks both player and enemies.
- **Procedural maps or room transitions:** rejected as out of scope for this first pass.
- **Immediate pathfinding:** rejected for V1; collision-only enemy behavior is acceptable while layout stays sparse.

## Remaining Risks

- Collision-only enemies can still get stuck or create exploits if future obstacle layouts become too dense.
- Large-world combat can feel too sparse if enemy spawns drift too far from the player/camera.
- Ambient item economy should be playtested before adding replenishment or rare capsules.
