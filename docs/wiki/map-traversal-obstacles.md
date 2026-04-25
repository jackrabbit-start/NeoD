# Map Traversal, Minimap, and Recovery Pickups

## Status

Durable architecture and verification note for NeoD V1 larger-map traversal, obstacle-free movement, top-right minimap display, intermittent existing-material pickups, and intermittent heart recovery pickups.

## Sources

- Deep-interview spec: `.omx/specs/deep-interview-map-traversal-obstacles-items.md`
- Interview transcript: `.omx/interviews/map-traversal-obstacles-items-20260425T120839Z.md`
- PRD: `.omx/plans/prd-map-traversal-obstacles-items.md`
- Test spec: `.omx/plans/test-spec-map-traversal-obstacles-items.md`
- Post-interview context: `.omx/context/post-interview-map-traversal-obstacles-items-20260425T123230Z.md`
- Follow-up change: obstacle-free traversal with top-right minimap and heart recovery pickups.

## Current Decision

Model V1 traversal as a static larger scrolling world, not as a decorative camera illusion or room/portal progression. The player moves through a world larger than the viewport and the camera follows the player.

The current play direction is **obstacle-free traversal**. Keep the map open so enemies can pressure the player without pathfinding or terrain-stuck edge cases. Use the top-right minimap to preserve orientation, and use sparse heart pickups as recovery pressure relief without adding them to the material inventory economy.

Pure helper modules should own projection, bounds, spawn, and healing rules where possible. Runtime Phaser code should consume those helpers for world bounds, safe enemy spawns, ambient item placement, minimap projection, and timed heart pickup behavior.

## V1 Invariants

- **Viewport vs world:** keep `GAME_WIDTH` / `GAME_HEIGHT` as viewport/UI metrics. Use a separate rectangular world-bounds contract for map/physics/projectile cleanup.
- **World bounds shape:** prefer `WorldBounds { x, y, width, height }` over width/height-only helpers so origin and margins remain explicit.
- **Obstacles:** current V1 traversal has no blocking obstacles. Preserve `layout.obstacles = []` unless a new interview/plan explicitly reopens terrain blockers.
- **Enemy movement:** V1 enemies are velocity-driven and not pathfinding-aware. The obstacle-free map is intentional to avoid stuck enemies while keeping pressure readable.
- **Ambient material items:** map-placed material pickups reuse existing `LootId` item definitions and the existing `LootEntity` attraction/collection path.
- **Heart recovery item:** heart pickups are health-only runtime pickups, not `LootId` inventory items and not codex/recipe materials.
- **Item economy:** do not ambient-spawn `tuning-capsule` in the first pass; keep ambient materials sparse so recipe progression is not flooded.
- **Minimap:** keep the minimap screen-fixed in the top-right via `setScrollFactor(0)` and deterministic projection helpers.
- **Projectile terrain:** projectiles are cleaned up against world bounds; there is no obstacle collision in the current map pass.
- **HUD:** Phaser HUD-like objects that should remain screen-fixed must use `setScrollFactor(0)` after camera follow is introduced.

## Implementation Surfaces

- Pure layout rules: `src/systems/mapLayout.ts`
- Minimap projection rules: `src/systems/minimap.ts`
- Heart pickup timing/healing rules: `src/systems/healthPickups.ts`
- Runtime scene integration: `src/scenes/ArenaScene.ts`
- Projectile bounds helper: `src/systems/weaponBehaviors.ts`
- Heart visual asset: `public/assets/loot/heart-pickup.svg`, registered in `src/game/visualManifest.ts`
- Tests: `tests/game-logic.test.mjs`, `tests/weapon-behaviors.test.mjs`

## Verification Expectations

For future changes touching this surface, run:

```sh
pnpm typecheck
pnpm test
pnpm build
```

Preserve or update deterministic tests for:

- world bounds staying larger than the viewport;
- player start area staying clear;
- obstacle list staying empty while this follow-up decision stands;
- ambient material spawn points staying inside bounds and excluding `tuning-capsule`;
- heart spawn points staying inside bounds and outside the `LootId` inventory list;
- heart pickup healing clamp and intermittent spawn gates;
- minimap top-right placement and world/viewport projection;
- enemy spawn points staying distant from the player and in bounds;
- projectile cleanup using rectangular world bounds;
- existing loot pickup, wave progression, dash, and weapon behavior regressions.

Manual browser smoke is still important because unit tests cannot prove camera feel or Phaser rendering feel. Check camera scrolling, minimap readability, heart pickup readability, recovery amount feedback, enemy engagement, ambient pickup readability, and wave progression.

## Rejected / Reversed Alternatives

- **Decorative-only scroll illusion:** rejected because the user explicitly selected a larger scrolling map.
- **Blocking obstacles as the current traversal constraint:** reversed by follow-up request; current V1 map should be obstacle-free.
- **Heart as inventory loot/material:** rejected because recovery hearts should not pollute recipes, codex material lists, or inventory counts.
- **Procedural maps or room transitions:** still out of scope for this first pass.
- **Immediate pathfinding:** unnecessary while the map remains obstacle-free.

## Remaining Risks

- Large-world combat can feel too sparse if enemy spawns drift too far from the player/camera.
- Heart spawn interval and heal amount need playtesting; too many hearts can erase survival pressure, too few may be invisible.
- Minimap symbols may need an art/UI pass for readability at small sizes.
