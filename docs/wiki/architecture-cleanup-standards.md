# Architecture Cleanup Standards

This page records the first approved cleanup rule set for NeoD's gameplay code.

## Purpose

Use small, behavior-preserving refactors to improve feature velocity without forcing a full repo-wide architecture rewrite.

## First-pass boundary

The first cleanup pass targets the **combine / inventory workflow** only.

Current non-goals for this pass:

- no gameplay or balance changes
- no new features
- no HUD redesign
- no new dependencies

## Dependency direction

Preferred dependency flow for this pass:

`Scene -> workflow/presenter -> systems/domain`

Forbidden dependency direction:

`systems -> ui`

## Responsibility rules

### Phaser scenes

Phaser scenes should own:

- input handling
- timers / delayed callbacks
- combat pause orchestration
- scene transitions
- final `hud.update(...)` invocation

### Scene-adjacent workflow / presenter helpers

Scene-adjacent helpers may own:

- combine decision outcomes
- loot-pickup inventory mutation outcomes
- inventory / recipe text projection used by the scene

These helpers should stay free of direct Phaser scene objects.

### `src/systems/*`

`src/systems/*` should stay focused on reusable rule/state logic and should not absorb:

- HUD formatting
- UI-facing projection helpers
- Phaser scene orchestration

## Testability rule

If a cleanup pass introduces testable helpers outside `src/systems/**`, update the deterministic test build (`tsconfig.logic.json` / `pnpm run build:test`) in the same change so the new boundary is covered by `pnpm test`.

## Documentation maintenance

- Keep this page aligned with the shipped boundary names and folder choices.
- Update `docs/index.md` when this page is added, removed, or renamed.
- Update `docs/log.md` only when the documentation structure changes materially under `docs/schema.md`.
