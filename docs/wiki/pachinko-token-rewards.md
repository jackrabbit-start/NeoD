# Pachinko Token Rewards

NeoD's V1 reward loop now centers on a safe-fiction arcade pachinko machine: defeated enemies create token rewards, collected tokens feed a visible right-side pachinko board, and pachinko outcomes grant complete weapon stacks with star grades.

This page captures the durable decisions from the token/pachinko interview and the first implementation/fix pass so future agents do not accidentally revert to instant material-icon rewards or direct enemy-death weapon grants.

## Source artifacts

- Deep-interview spec: `../../.omx/specs/deep-interview-pachinko-token-weapons.md`
- Transcript: `../../.omx/interviews/pachinko-token-weapons-20260425T122020Z.md`
- Initial context snapshot: `../../.omx/context/pachinko-token-weapons-20260425T122020Z.md`
- PRD/test spec: `../../.omx/plans/prd-pachinko-token-weapons.md`, `../../.omx/plans/test-spec-pachinko-token-weapons.md`
- Post-interview context: `../../.omx/context/post-interview-pachinko-token-rewards-20260425T143344Z.md`
- Implementation/fix PRs: GitHub PR #42 and PR #46
- Capacity/visual follow-up: `../../.omx/specs/deep-interview-pachinko-machine-capacity-visuals.md`, `../../.omx/interviews/pachinko-machine-capacity-visuals-20260425T152330Z.md`, `../../.omx/context/post-interview-pachinko-machine-capacity-visuals-20260425T161614Z.md`, commits `362618b` and `bba27bc`

## Locked reward loop

Preserve this first-pass sequence unless a later interview/plan explicitly reopens it:

1. Defeating configured enemies creates a token reward.
2. The token appears as a field pickup near the defeated enemy.
3. The player character collects the token through the normal proximity/magnet-style pickup feel.
4. Collection adds enemy-specific token XP and enqueues one pachinko token.
5. The visible right-side pachinko board drops the token using Phaser Arcade physics.
6. The landing lane resolves a random complete weapon and random star grade using reward-level odds.
7. Duplicate weapon-star stacks can be fused manually in the inventory.

Do **not** enqueue pachinko rewards directly on enemy death. The field token pickup is part of the intended feedback loop.

## Machine capacity and exact slot visuals

The capacity/visual follow-up made the board intentionally busier while preserving the token pickup gate:

- Up to 15 pachinko tokens may be active/falling inside the machine at once.
- Additional collected tokens remain queued instead of disappearing or resolving instantly.
- The queue count must be visible beside/adjacent to the pachinko machine; when the viewport is too narrow for an outside badge, keep the badge visibly inside the board area.
- Bottom lanes are live reward slots. Each slot displays the weapon icon and star grade that the slot will grant at resolution time.
- The displayed slot table and landing resolver must share one helper/model. Do not implement visual-only previews that can diverge from awarded rewards.
- Slot dividers, reward frames, trims, lights, and badges are Phaser-owned board chrome and must be kept synchronized with camera/viewport updates.

The accepted V1 implementation uses 10 compact reward slots because the current weapon catalog has 10 weapons. If the weapon catalog or slot count changes, update deterministic slot tests and keep display/resolution parity.

## Reward-level semantics

Token rewards increase the pachinko reward level only. Other level systems are future scope.

Current durable model:

- Enemy types grant differentiated token XP through `src/systems/pachinkoRewards.ts`.
- `PACHINKO_LEVEL_THRESHOLDS` controls reward-level breakpoints.
- `STAR_ODDS_BY_LEVEL` controls star odds by reward level.
- `buildPachinkoSlotRewards()` creates the live bottom-slot table used by both visuals and tests.
- `resolvePachinkoLandingReward()` must continue to resolve through the same slot reward semantics so displayed lanes and grants stay aligned.

Future changes to token pacing, thresholds, or odds should update deterministic tests in `tests/game-logic.test.mjs`.

## Weapon fusion semantics

Pachinko grants complete weapon stacks, not materials or fragments.

Fusion rules:

- same weapon kind + same star + two copies -> one next-star stack of the same weapon kind
- 5★ is the current maximum
- fusion is manual in the inventory UI
- fusion should preserve the currently equipped stack when possible through `src/systems/weaponOwnership.ts`

This keeps the combine concept alive as weapon-star fusion rather than deleting it.

## Naming and tone constraints

Weapon names may use meme/parody energy, but future content must avoid direct real creator, YouTuber, channel, brand, or trademark names unless a later policy/legal review explicitly permits them.

Pachinko is an arcade toy/reward resolver in NeoD. Avoid real-money, betting, gambling, monetization, wager, or casino framing.

## Phaser overlay lifecycle rule

The pachinko machine is gameplay presentation, not just HUD text. It should remain visible on the right side while the map scrolls.

Preserve these implementation lessons:

- Do not destroy the pachinko board from per-frame entity cleanup.
- Keep board lifecycle tied to scene/reset teardown, not normal active-entity filtering.
- Because the game uses `Phaser.Scale.RESIZE` and a larger scrolling world, right-side board coordinates must be synchronized from viewport/camera state instead of assuming fixed 960x540 screen coordinates.
- Do not convert the board to DOM-only UI unless the physics token path is also redesigned; otherwise visible board and collision/lane resolution can diverge.

## Relationship to old dropped-loot guidance

`docs/wiki/dropped-loot-pickup-ux.md` still describes the older material/item pickup UX and its magnet thresholds. The pachinko token reward loop is a newer feature layered on top of that pickup feel:

- token pickups may reuse the magnet/collect readability pattern
- token pickups should feed pachinko, not item recipes
- true direct floor-dropped weapons remain out of scope for this pass

## Verification baseline

The implementation and pickup-flow fix were verified with:

- `pnpm typecheck`
- `pnpm test` — 148 passing tests after the capacity/visual follow-up was merged into current `ai-dev`
- `pnpm build`

Known local warnings at capture time:

- local Node v25.5.0 while `package.json` requests Node 22.x
- existing Vite large chunk-size warning

## Future reopen points

Run a fresh interview/plan before changing any of these materially:

- making pachinko interactive or spend-choice based
- adding non-pachinko level effects
- adding true direct weapon floor drops
- changing star maximum or fusion inputs
- replacing the Phaser physics board with a DOM/animation-only resolver
- making bottom slot icons loose previews instead of exact lane rewards
- changing active-token capacity or queue badge behavior without checking narrow viewport visibility
- adding real-money, betting, or casino-like language
