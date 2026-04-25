# Dropped Loot Pickup UX

NeoD currently treats enemy-death drops as `LootId` inventory items, not as actual floor-dropped `WeaponId` entities.

This page captures the durable lesson from the dropped-loot readability and pickup UX slice so future changes do not accidentally widen progression semantics.

## Source artifacts

- Deep-interview spec: `../../.omx/specs/deep-interview-dropped-loot-pickup-design.md`
- Transcript: `../../.omx/interviews/dropped-loot-pickup-design-20260425T100726Z.md`
- Initial context snapshot: `../../.omx/context/dropped-loot-pickup-design-20260425T095127Z.md`
- PRD/test spec: `../../.omx/plans/prd-dropped-loot-pickup-design.md`, `../../.omx/plans/test-spec-dropped-loot-pickup-design.md`
- Post-interview context: `../../.omx/context/post-interview-dropped-loot-pickup-design-20260425T111351Z.md`
- Implementation PR: GitHub PR #30

## Locked interpretation

When a prompt mentions dropped weapons/cores in the current V1, first check whether it means existing enemy-death `LootId` drops.

The shipped current-loot slice improved only these drops:

- `gel-shard`
- `acid-core`
- `frost-mote`
- `spark-knot`
- `mist-bead`
- `tuning-capsule`

It did **not** add true floor-dropped weapons and did **not** add direct `WeaponId` pickup into `ownedWeaponIds`.

## Shipped behavior

Current drops use a two-stage proximity model:

- `LOOT_ATTRACTION_RADIUS = 72`
- `LOOT_COLLECT_RADIUS = 32`
- previous hardcoded pickup distance is preserved as `LEGACY_LOOT_PICKUP_DISTANCE = 20` for regression clarity

`src/systems/lootPickup.ts` owns the pure pickup phase math. `ArenaScene` owns Phaser presentation:

- loot aura/ring presentation
- light magnet movement toward the player while in attraction range
- collection through the existing `applyLootPickup` workflow
- companion visual/tween cleanup when loot is collected or the scene resets
- aura tween pause/resume when interaction blocking pauses gameplay

## Design constraints

Preserve these constraints unless a later scoped workflow explicitly reopens them:

- Keep enemy drop tables and probabilities stable.
- Keep inventory, combine, recipe, tuning, and owned-weapon semantics stable.
- Keep `ITEM_DEFINITIONS` texture keys stable for the current six loot items.
- Do not add audio or package dependencies for this pickup slice.
- Keep pickup helper logic deterministic and covered by tests when thresholds change.

## Verification baseline

The implementation was verified with:

- `pnpm run typecheck`
- `pnpm test` — 94 passing tests after rebase
- `pnpm build` — passed with the existing Vite chunk-size warning
- `git diff --check`
- controlled browser evidence recorded in `.omx/state/sessions/019dc402-476f-7ca1-87e4-ee95469607e3/ralph-progress.json`

Future tuning should add a human playtest pass for subjective readability under combat clutter.

## Reopen path for real weapon drops

Actual `WeaponId` floor drops remain a separate feature. Before implementing them, run a new interview/plan that explicitly decides:

- which enemies can drop weapons
- how weapon drops interact with recipes and `ownedWeaponIds`
- whether duplicates, replacement, or immediate equip behavior exist
- how the UI distinguishes a weapon drop from a component/core drop
