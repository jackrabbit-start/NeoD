# Deep Interview: Map Traversal, Obstacles, and Intermittent Items

## Metadata
- Profile: standard
- Context type: brownfield
- Rounds: 5
- Final ambiguity: 11.8%
- Threshold: 20%
- Context snapshot: `.omx/context/map-traversal-obstacles-items-20260425T115901Z.md`
- Prompt-safe initial-context summary: not needed

## Clarity Breakdown
| Dimension | Score | Notes |
| --- | ---: | --- |
| Intent | 0.90 | User wants the current fixed arena to feel like traversing a larger map. |
| Outcome | 0.92 | Larger scrolling world, camera follows player, obstacles/items distributed around the map. |
| Scope | 0.88 | First pass excludes procedural generation, room transitions, and new item types. |
| Constraints | 0.84 | Keep V1 small/reversible, no new dependencies, use placeholders/existing items. |
| Success | 0.90 | Camera traversal, fair collisions, intermittent items, preserved combat flow, automated verification. |
| Context | 0.84 | ArenaScene, loot pickup, world bounds, and missing obstacle system are identified. |

## Intent
Make the current prototype feel less like a fixed single-screen arena and more like the player is moving through a larger map. The map should create spatial movement goals and tactical navigation, not just provide a larger empty rectangle.

## Desired Outcome
- Replace the fixed-arena feeling with a larger world than the viewport.
- Camera follows the player naturally while combat remains readable.
- Obstacles and existing item pickups appear intermittently across the map.
- The player has reasons to move around the map while preserving the current auto-attack, enemy wave, loot attraction, and inventory/combine loop.

## In Scope
- Larger scrolling Arcade world with camera follow.
- Placeholder map/floor treatment sufficient to communicate movement through space.
- Real obstacle colliders that block both player and enemies.
- Safe obstacle layout rules so spawn/start paths are not unfairly blocked.
- Intermittent placement of existing item types across the map; no new item class required.
- Enemy spawn-position adjustment for the larger world.
- Deterministic rule tests for placement/safety where practical.

## Out of Scope / Non-goals
- Procedural dungeon/map generation.
- Room, portal, or zone-transition progression.
- New item types such as new healing/buff categories.
- Direct implementation inside deep-interview mode.

## Decision Boundaries
OMX may decide without further confirmation:
- Exact first-pass map dimensions, likely within a small multiple of the current viewport.
- Obstacle count, shape, size, and placement, as long as fairness rules hold.
- Intermittent item placement/spawn rate using existing item definitions.
- Placeholder visual language for map floor, obstacles, and item markers.
- Enemy spawn adjustment rules for the larger world.

## Constraints
- Keep the repo small, reversible, and V1-aligned.
- Use existing Vite/TypeScript/Phaser stack; no new dependency.
- Preserve browser-first target.
- Preserve existing combat loop and current inventory/combine mechanics.
- Player and enemies should collide with obstacles; avoid enemy/player softlocks or excessive pathing frustration.

## Testable Acceptance Criteria
1. Player can move through a world larger than the 960x540 viewport and the camera follows smoothly enough that the fixed arena feeling is reduced.
2. Obstacles exist across the world and block both player and enemies.
3. Obstacle placement preserves fair start area, passable routes, and avoids obvious enemy/player trapping.
4. Existing item types appear intermittently across the map and can still be attracted/collected through the existing pickup/inventory flow.
5. Enemy spawning and wave progression still work in the larger world.
6. Auto-attack, projectile behavior, enemy damage, drops, and loot pickup remain functional.
7. Verification includes `pnpm typecheck`, `pnpm test`, and `pnpm build`, plus deterministic tests for pure placement/safety rules where possible.

## Assumptions Exposed + Resolutions
- Assumption: "map feel" could mean a visual-only arena treatment. Resolution: user selected a larger scrolling map.
- Assumption: obstacles might be decorative only to avoid AI issues. Resolution: user wants obstacles to block both player and enemies.
- Assumption: item placement could require new item types. Resolution: first pass should reuse existing item types.

## Pressure-pass Findings
Round 3 revisited the large-map answer with a contrarian/assumption probe: a large world alone may not create good movement if obstacles make combat frustrating. The resolved direction is to use real blocking obstacles for both player and enemies, but constrain implementation with fairness/pathing safeguards.

## Brownfield Evidence vs Inference
Evidence:
- `src/scenes/ArenaScene.ts` currently configures a fixed world bound near `GAME_WIDTH`/`GAME_HEIGHT`, draws a static arena rectangle, creates the player at screen center, and uses WASD Arcade velocity.
- `src/systems/lootPickup.ts` already supports idle/attract/collect phases.
- Enemy defeat drops in `ArenaScene.damageEnemy` create loot using existing item definitions.
Inference:
- A new or extracted map-object/placement rule layer would likely be useful for deterministic tests and keeping `ArenaScene` from growing too much.
- Enemy spawning needs adjustment because current spawn coordinates assume fixed screen edges.

## Likely Technical Touchpoints
- `src/scenes/ArenaScene.ts`
- `src/game/config.ts`
- `src/systems/lootPickup.ts`
- New or extended pure rules such as `src/systems/mapObjects.ts`
- Tests in `tests/game-logic.test.mjs` or a new focused test file

## Full Condensed Transcript
### Round 1 — intent/outcome
- Q: 현재 코드가 고정 960x540 아레나인 상황에서, 이번 변경의 맵 이동 느낌은 무엇에 가까워야 하나요?
- A: 넓은 스크롤 맵
- Ambiguity after round: 42.5%

### Round 2 — scope/non-goals
- Q: 넓은 스크롤 맵 첫 구현 패스에서 제외할 것은 무엇인가요?
- A: 절차적 맵 생성 제외, 방/구역 전환 제외, 새 아이템 종류 제외
- Ambiguity after round: 31.5%

### Round 3 — obstacle behavior / assumption probe
- Q: 첫 패스의 장애물은 플레이어에게 어떤 역할을 해야 하나요?
- A: 플레이어와 적 모두 막기
- Ambiguity after round: 25.5%

### Round 4 — decision boundaries
- Q: 첫 패스에서 제가 확인 없이 자율 결정해도 되는 항목은 무엇인가요?
- A: 정확한 맵 크기, 장애물 개수/모양/위치, 간헐적 아이템 배치율, 플레이스홀더 비주얼, 적 스폰 위치 보정
- Ambiguity after round: 21.2%

### Round 5 — success criteria
- Q: 첫 구현을 완료했다고 판단하려면 어떤 검증이 반드시 만족되어야 하나요?
- A: 카메라 추적 이동감, 장애물 충돌 공정성, 아이템 간헐 배치, 전투 흐름 유지, 자동 검증 통과
- Ambiguity after round: 11.8%


## Recommended Handoff
Recommended next step: `$ralplan` with this spec to produce PRD and test-spec before implementation, because the feature touches camera/world bounds, collision, spawning, item placement, and fairness rules.

Handoff command:

```bash
$plan --consensus --direct .omx/specs/deep-interview-map-traversal-obstacles-items.md
```
