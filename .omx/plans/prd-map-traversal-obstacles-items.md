# PRD: Map Traversal, Obstacles, and Intermittent Items

## Source of Truth

- Deep-interview spec: `.omx/specs/deep-interview-map-traversal-obstacles-items.md`
- Context snapshot: `.omx/context/map-traversal-obstacles-items-20260425T115901Z.md`
- Ralplan completed: 2026-04-25T12:18:24Z
- Consensus: Architect APPROVE, Critic APPROVE

## Requirements Summary

Expand NeoD from a fixed single-screen arena into a first-pass larger scrolling map. The player should move through a world larger than the viewport while the camera follows. Sparse placeholder obstacles should exist across the world and block both player and enemies. Existing item types should appear intermittently at safe map positions using the current loot pickup/inventory path. Existing combat, waves, drops, auto-attack, combine/inventory, tuning, and result flow should remain intact.

## RALPLAN-DR Summary

### Principles

1. **Traversal first:** The implementation must visibly replace the single-screen arena feel with a larger camera-follow world, not merely add decorative clutter.
2. **Fair blocking terrain:** Obstacles block both player and enemies, but sparse placement and safe zones must prevent softlocks, impossible starts, or excessive enemy pathing frustration.
3. **Reuse current loops:** Existing enemy waves, auto-attack, loot attraction/pickup, inventory/combine, and tuning systems should continue to work with minimal rule churn.
4. **Small reversible V1:** No procedural map generation, no room transitions, no new item types, no new dependencies, no full art pass.
5. **Pure-rule testability:** World bounds, obstacle/item placement, safe spawn selection, and bounds checks should be represented through deterministic helpers where practical.

### Decision Drivers

1. The deep-interview requires a larger scrolling map, real obstacles that block player and enemies, intermittent existing items, and preserved combat flow.
2. Current `ArenaScene` hardcodes `GAME_WIDTH`/`GAME_HEIGHT` for Arcade world bounds, arena rectangle, player spawn, enemy edge spawning, projectile out-of-bounds, and player healthbar coordinates.
3. No obstacle/map-object system currently exists, so collision and placement need a small new boundary rather than ad hoc scene-only constants.
4. Current enemy AI is velocity-based chasing/orbit/dash without pathfinding; blocking terrain must be sparse/open rather than maze-like.
5. Current loot pickup already supports existing item attraction/collection, so ambient map items should reuse that path instead of introducing a new pickup model.

### Viable Options

#### Option A — Static larger world + authored sparse layout (chosen)

Add named world/map config and a pure `mapLayout` system that returns deterministic obstacle rectangles, safe item spawn points, and safe enemy spawn candidates. `ArenaScene` sets larger world/camera bounds, renders placeholder floor/obstacles, creates static Arcade obstacle bodies colliding with player and enemies, spawns intermittent existing loot via the current loot pickup path, and spawns enemies near the player/world bounds using safe candidate helpers.

Pros:
- Best match for “larger scrolling map” while staying small and reversible.
- Avoids procedural generation and room progression non-goals.
- Keeps obstacle fairness rules testable and visible.
- Requires no new dependencies or assets.

Cons:
- Introduces obstacle collision without pathfinding, so layout must stay sparse.
- `ArenaScene` needs careful refactoring to avoid accumulating one-off map code.

#### Option B — Camera-scroll illusion with decorative props only

Rejected because it fails the selected larger-map and blocking-obstacle requirements.

#### Option C — Large world with semi-solid/visual-only obstacles first

Rejected because it conflicts with the explicit requirement that obstacles block both player and enemies.

## Decision

Build V1 traversal as a static larger scrolling world with sparse authored blocking obstacles, deterministic safe placement helpers, and reused current loot/combat loops.

## Problem

NeoD currently plays inside a fixed 960x540 arena. The player moves and fights, but the world itself does not feel like a traversable map. The next V1 pass should create a stronger “moving through a map” feeling by expanding the world beyond the viewport, following the player with the camera, and placing sparse blocking obstacles plus intermittent existing item pickups across the map.

## Goals

- Make the world larger than the visible viewport and have the camera follow the player.
- Add placeholder map/floor treatment that communicates movement through space.
- Add sparse real obstacles that block both player and enemies.
- Keep obstacle layout fair: safe start area, open lanes, no obvious softlocks, no maze/pathfinding requirement.
- Place existing loot item types intermittently across the map using the current pickup/inventory path.
- Adjust enemy spawning so waves remain active and readable in a larger world.
- Preserve existing combat, wave progression, drops, loot attraction, inventory/combine, tuning, and result flow.

## Non-goals

- Procedural map/dungeon generation.
- Room, portal, or zone-transition progression.
- New item types or new pickup mechanics.
- New art asset pass or dependency addition.
- Enemy pathfinding or obstacle-aware steering beyond sparse-layout mitigation.
- Full combat rebalance.
- Projectile-blocking terrain unless implementation proves it trivial and non-disruptive; player/enemy blocking is the required V1 semantic.

## Proposed Architecture

1. **Map constants/config**
   - Add named world bounds/dimensions and margins in `src/game/config.ts` or a small `src/game/mapConfig.ts`.
   - Prefer a rectangle-style `WorldBounds { x, y, width, height }` contract rather than width/height only, so physics bounds and projectile bounds cannot diverge.
   - Keep viewport constants (`GAME_WIDTH`, `GAME_HEIGHT`) separate from world constants to avoid UI regressions.
   - Use first-pass dimensions in a small multiple of the viewport, e.g. roughly 2.5–3x width/height, but execution may tune exact values.

2. **Pure map layout system**
   - Add `src/systems/mapLayout.ts` with small types such as `WorldBounds`, `RectObstacle`, `Point`, and helpers:
     - `createMapLayout(worldBounds)` / `getStaticMapObstacles(worldBounds)`
     - `getAmbientItemSpawnPoints(worldBounds, obstacles)`
     - `isCircleClearOfObstacles(point, radius, obstacles)`
     - `isPointWithinWorld(point, worldBounds, margin)`
     - `selectEnemySpawnPoint(player, worldBounds, obstacles, random)` or candidate-based equivalent
     - `selectAmbientItemSpawnPoint(...)` with deterministic random injection
   - Keep rules deterministic and unit-testable; no procedural generation beyond selecting among safe authored/candidate positions.

3. **ArenaScene world/camera integration**
   - Replace fixed Arcade world bounds with larger world bounds.
   - Draw a larger placeholder arena/floor/grid/tiles using existing Phaser primitives.
   - Spawn player at the larger world center.
   - Set camera bounds to the larger world and follow the player.
   - Ensure fixed HUD-like Phaser objects, especially player healthbar, use `setScrollFactor(0)` so they remain screen-fixed.
   - Update projectile out-of-bounds checks to use world bounds, not viewport dimensions.

4. **Obstacle integration**
   - Create a static Arcade group for obstacles using rectangle bodies/visuals.
   - Add colliders: player vs obstacles and enemy group vs obstacles.
   - Keep obstacles sparse and non-maze-like; prefer islands/walls around open lanes.

5. **Ambient item integration**
   - Reuse current `LootEntity` creation/attraction/collection code by extracting a small helper such as `spawnLootDrop(x, y, itemId)` from enemy death handling.
   - Seed a small number of existing material items at safe spawn points on run start.
   - If replenishment is added, enforce an explicit low ambient-item cap and slow timer; implementation may choose fixed seeded items only for V1.
   - Prefer non-capsule recipe materials for ambient map items unless execution deliberately chooses a very rare tuning-capsule placement and tests the balance.

6. **Enemy spawn adjustment**
   - Replace fixed screen-edge spawning with a larger-world-safe spawn helper.
   - Prefer candidate positions outside or near the camera/player vicinity, not global world edges so enemies still engage.
   - Enforce minimum distance from player, world bounds, and obstacle clearance.
   - Fallback to current edge-like positions around the player/camera if no candidate is valid.

## Acceptance Criteria

1. The player can traverse a world larger than the viewport, and the camera follows the player smoothly enough that the fixed-arena feel is reduced.
2. World/camera bounds prevent leaving the map and keep the player visible.
3. Placeholder floor/map visuals make movement through space legible.
4. Obstacles are present across the world and block both player and enemies.
5. Obstacle layout leaves the starting area and major movement lanes clear.
6. Existing item types appear intermittently across safe map positions and can be attracted/collected through the existing loot pickup/inventory flow; any replenishment is low-capped or omitted in favor of fixed seeded items for V1.
7. Enemy waves still spawn, approach, fight, die, drop loot, and advance waves in the larger world.
8. Projectile lifetime/out-of-bounds behavior remains correct for the larger world.
9. Player healthbar/HUD remains screen-fixed after camera scrolling.
10. Required verification passes: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Implementation Plan

1. Add pure map layout helpers and tests for world bounds, obstacle clearance, safe start area, item spawn positions, and enemy spawn candidate selection.
2. Add map/world constants while preserving viewport constants.
3. Integrate larger world/camera/player spawn in `ArenaScene` and keep screen-fixed healthbar stable.
4. Add obstacle rendering/static bodies and player/enemy colliders.
5. Extract reusable loot spawn helper and add ambient item seeding/replenishment using existing item ids.
6. Replace enemy spawn coordinate logic with the safe larger-world helper.
7. Update projectile out-of-bounds to use world bounds.
8. Run full verification and manual/browser smoke.

## Risks and Mitigations

- **Enemy stuck behind obstacles:** Keep obstacles sparse; test clearance; avoid maze layouts; spawn near open lanes.
- **Combat becomes too spread out:** Spawn enemies around the player/camera vicinity, not only at far world edges.
- **Item economy floods recipes:** Low ambient item cap, slow replenishment or fixed seeded items, and non-capsule material preference.
- **HUD scroll regression:** Explicitly set Phaser HUD objects to scroll factor 0 and smoke test while moving camera.
- **Scene bloat:** Extract pure map layout and loot creation helper instead of embedding all rules inline.

## ADR

### Decision

Build the first traversal pass as a static larger scrolling world with sparse authored blocking obstacles and intermittent existing loot placements.

### Drivers

- User explicitly selected large scrolling map.
- User explicitly selected obstacles that block both player and enemies.
- User excluded procedural generation, room transitions, and new item types.
- Current codebase already has reusable loot pickup and wave/combat loops.

### Alternatives Considered

- Decorative-only movement illusion: rejected because it fails larger-map and blocking-obstacle requirements.
- Semi-solid/player-only obstacles: rejected because it conflicts with “player and enemies both blocked.”
- Procedural/room map: rejected by non-goals and would be too broad for V1.

### Why Chosen

It directly satisfies the clarified user intent while limiting new systems to deterministic layout/spawn helpers and Phaser scene integration.

### Consequences

- `ArenaScene` must distinguish viewport size from world size.
- Enemy spawning must become player/world-relative instead of screen-edge fixed.
- Obstacle layout must be sparse because enemy pathfinding is out of scope.
- Ambient item economy needs caps to avoid overfeeding recipes.

### Follow-ups

Later passes may add procedural generation, room transitions, destructible obstacles, projectile-blocking terrain, richer map art, or smarter enemy pathing if this first pass proves fun.

## Available-Agent-Types Roster

- `explore`: repo mapping and targeted code lookup.
- `executor`: implementation/refactor work.
- `test-engineer`: pure and scene-adjacent test coverage.
- `architect`: review world/camera/collision boundaries.
- `critic`: verify plan consistency and risk handling.
- `verifier`: final evidence validation.
- `code-reviewer`: optional final multi-file review.

## Follow-up Staffing Guidance

### `$ralph` recommended

Use one sequential owner with verification loop because this is a cohesive scene/system refactor. Suggested phases: pure map layout/tests → world/camera integration → obstacles/items/spawns → full verification.

Suggested reasoning: executor high, verifier high, optional architect medium after first green pass.

### `$team` optional

Use team only if speed matters. Suggested lanes:

1. Pure systems/tests lane: `src/systems/mapLayout.ts`, tests.
2. Scene world/obstacle lane: `src/scenes/ArenaScene.ts`, camera/world/obstacle integration.
3. Loot/spawn lane: ambient item spawning and enemy spawn helper integration; coordinate carefully because this likely also touches `ArenaScene.ts`.
4. Verification lane: typecheck/test/build plus manual smoke checklist.

Sequential `$ralph` remains preferred because several lanes converge on `ArenaScene.ts`.

## Launch Hints

- Sequential execution: `$ralph .omx/plans/prd-map-traversal-obstacles-items.md`
- Parallel execution: `$team .omx/plans/prd-map-traversal-obstacles-items.md`

## Team Verification Path

1. Pure map layout tests pass.
2. Existing game logic/weapon/wave/loot tests remain green.
3. `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
4. Manual/browser smoke confirms camera traversal, obstacle collision, sparse ambient items, and wave progression.
