# Melee Weapon Line

## Status

Durable architecture and verification note for NeoD V1 frontal-cleave melee weapons.

## Sources

- Deep-interview spec: `.omx/specs/deep-interview-weapon-capsule-variety.md`
- Interview transcript: `.omx/interviews/weapon-capsule-variety-20260425T111040Z.md`
- PRD: `.omx/plans/prd-melee-weapon-line.md`
- Test spec: `.omx/plans/test-spec-melee-weapon-line.md`
- Post-interview context: `.omx/context/post-interview-melee-weapon-line-20260425T114954Z.md`

## Decision

Model melee as a first-class attack-plan path: `WeaponAttackBehavior.kind = "melee-cleave"` produces `AttackPlan.meleeSwings` specs. Do not represent V1 frontal cleave as fake projectiles or hazard zones.

This keeps the intended behavior explicit: melee is an instantaneous frontal arc whose range, arc, damage, knockback, and target selection can be tested with pure rules before Phaser runtime integration.

## V1 Invariants

- **Control model:** melee preserves existing auto-fire; no new required manual attack, dash, or aim input.
- **Facing:** the melee front vector is the player-to-auto-target direction supplied to attack planning.
- **Actionability:** an attack plan is fireable when it contains at least one projectile or at least one melee swing.
- **Geometry:** target radius extends range inclusion; angular inclusion is based on target center.
- **Knockback:** `melee-swing` is allowed; hazard and chain knockback remain disabled.
- **Tuning:** capsule effects must produce visible melee-relevant derived stats. Nested `attackBehavior` changes must be immutable.
- **Content:** new weapons need recipe ids, weapon definitions, visual manifest entries, HUD assets, and codex/recipe coverage.
- **Scope:** do not broaden this pass into enemy, wave, or ranged weapon rebalance.

## Implementation Surfaces

- Domain: `src/domain/types.ts`
- Pure behavior planning: `src/systems/weaponBehaviors.ts`
- Runtime application/VFX: `src/scenes/ArenaScene.ts`
- Knockback source policy: `src/systems/knockback.ts`
- Capsule derivation: `src/systems/tuning.ts`
- Weapon/recipe ids and data: `src/data/contentIds.ts`, `src/data/weapons.ts`, `src/data/recipes.ts`
- Visual contract: `src/game/visualManifest.ts`, `public/assets/hud/weapons/*.svg`
- Tests: `tests/weapon-behaviors.test.mjs`, `tests/game-logic.test.mjs`, `tests/knockback.test.mjs`

## Accepted V1 Content

- `slime-glaive`: wider/slower frontal cleave identity.
- `prism-cutter`: faster/narrower melee identity.

Exact numbers are first-pass tuning. Treat playtest feedback as a future balancing task, not as part of the original melee architecture decision.

## Verification Expectations

For future changes touching this surface, run the repo-standard checks:

```sh
pnpm typecheck
pnpm test
pnpm build
```

Also preserve or update deterministic tests for:

- melee attack-plan generation;
- inside/outside frontal cleave range and arc;
- boundary semantics for target radius and target-center angular checks;
- melee capsule tuning and immutable nested behavior updates;
- `melee-swing` knockback without enabling hazard/chain knockback;
- visual manifest/HUD asset presence for melee weapons.

## Rejected Alternatives

- **Short-lived projectiles:** rejected because cone semantics become implicit physics-body behavior and projectile-speed tuning stays awkward.
- **Hazard zones:** rejected because lingering area ticks do not match the requested immediate frontal cleave feel and blur knockback semantics.

## Remaining Risks

- Manual browser smoke should confirm visible swing VFX and front-vs-behind hit behavior.
- Balance values are intentionally first-pass and should be playtested before global difficulty adjustments.
- Future manual-facing or active-skill melee should be introduced as a separate plan, not folded into this auto-fire cleave invariant.
