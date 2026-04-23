# NeoD Stack Foundation

## Goal

Lock the first practical stack for a browser-first prototype of a game where defeated enemies drop weapons and items, and the player combines those drops into higher-grade gear.

## Facts

- The repo is still a scaffold with no framework or package manager locked in yet.
- Local tooling already available in this workspace:
  - `node v25.5.0`
  - `npm 11.8.0`
  - `yarn 1.22.22`
  - `pnpm 10.11.1`
- Vite's official guide says it provides a fast dev server, production build pipeline, and supports TypeScript templates out of the box.
- Vite's official guide also says current versions require Node.js `20.19+` or `22.12+`.
- Phaser's official install docs say the fastest official start path is the `create-phaser-game` CLI and that Phaser can also be installed from npm.
- PixiJS presents itself as an HTML5 creation engine and a flexible 2D WebGL renderer.
- Tauri presents itself as a way to package an existing web frontend into small, fast, secure, cross-platform apps.

## Inferences

- `Vite + TypeScript` is the lowest-friction starting point for this repo because the environment already satisfies Vite's Node requirement.
- `Phaser` fits the first version better than `PixiJS` because this project needs a game framework, not only a rendering layer.
- A web-first prototype is the safest first target because it minimizes setup cost while letting combat, drop tables, and item-combine loops be tested quickly.
- `Tauri` should stay out of the first scaffold. It is a packaging decision, not a core gameplay decision.
- `pnpm` is the cleanest default package manager here because it is already installed and officially supported by both Vite and Phaser scaffolding flows.

## Locked Decision

Use this V1 stack:

- Package manager: `pnpm`
- Language: `TypeScript`
- App scaffold: `Vite`
- Game framework: `Phaser`
- Rendering target: browser first
- Desktop packaging: postpone until core loop validation
- Remaining art/tone and naming/flavor choices: keep placeholder-safe and generic until they become necessary

## Suggested Project Shape

Keep the first structure small:

- `src/main.ts`: bootstrap and mount the game
- `src/game/config.ts`: screen, scale, and shared game config
- `src/scenes/`: boot, preload, arena, result, and other Phaser scenes
- `src/systems/`: drop generation, combine rules, combat, spawning
- `src/domain/`: item grades, weapon definitions, stat formulas
- `src/data/`: item tables, rarity tables, enemy definitions
- `src/ui/`: non-core HUD and menu components if needed later
- `assets/`: sprites, audio, icons, placeholder art

## First Implementation Pass

When moving from investigation to implementation, the first scaffold should aim for:

1. A single playable arena scene.
2. One enemy type with a drop table.
3. A small item pool with grades like `common -> rare -> epic`.
4. A combine system driven by plain data, not hardcoded scene logic.
5. A debug-friendly HUD showing current drops, inventory, and combine outcomes.

## Proposed Next Commands

If we convert this into execution work, the likely path is:

```sh
pnpm create vite . --template vanilla-ts
pnpm add phaser
```

I am intentionally not locking testing, linting, or desktop packaging yet. Those should follow the first playable slice.

## Deferred Questions

- Exact public-facing art direction
- Exact enemy/item naming flavor
- Post-V1 packaging or expansion priorities

These stay intentionally deferred so the first playable slice can optimize for speed instead of polish decisions.

## Confidence

High.

The stack is now the explicit V1 source of truth for this repository.
