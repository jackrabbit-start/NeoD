# NeoD Game Requirements Baseline

## Purpose

This document is the canonical requirements baseline for building the game in this repository.

Use it as the shared upstream artifact for later workflows:

- `deep-interview`: clarify only the still-open areas
- `ralplan`: derive slice-specific PRD and test spec
- `ralph` / `team`: implement only after a scoped plan exists

## Requirement Sources

- `README.md`
- `docs/stack-foundation.md`
- `.omx/specs/deep-interview-safe-topdown-combine-action-game.md`
- `.omx/context/safe-topdown-combine-action-game-20260422T132330Z.md`

## Repo State

- The repo is still scaffold-first and has no game runtime yet.
- Current recommended prototype stack is:
  - `pnpm`
  - `TypeScript`
  - `Vite`
  - `Phaser`
- The safest first delivery target is a browser-playable prototype.

## Product Vision

Build a safe, fictional, top-down 2D action game where the player defeats enemies, acquires drop-based weapons or components, combines them into stronger weapons, grows meaningfully within a single run, and clears the run by defeating a boss.

The first goal is not content breadth. The first goal is proving that the movement, combat, loot, combine, and boss-clear loop is actually fun and buildable in this repo.

## Locked Product Principles

1. The game must remain safely fictional.
2. The first implementation must prove the core loop before adding breadth.
3. Growth must be driven by enemy drops plus combining, not by unrelated side systems.
4. Core gameplay rules should be data-driven and testable.
5. Scope must stay compact enough to ship a playable prototype quickly.

## Locked Decisions

These are the default requirements for the repo unless a later workflow explicitly revises them.

### Platform And Input

- Primary target: browser-first prototype
- Default controls for V1: `keyboard + mouse`
- Desktop packaging is deferred until the core loop is proven

### Content Safety

- No real-person targets
- No real-person likeness-driven violence
- No unsafe framing carried over from the original rejected concept
- Meme influence, if used at all, stays at broad tone level unless later clarified

### Game Shape

- Camera/view: top-down 2D
- Combat: real-time
- Run structure: start arena -> waves -> boss -> result
- Progression focus: within-run only
- Initial enemy scope: `slime` family plus `1 boss`

## Functional Requirements

### Core Loop Requirements

The game must support this loop:

1. Start a run
2. Move and fight in real time
3. Defeat enemies
4. Receive loot from enemy drops
5. Combine loot into stronger weapons
6. Survive escalating waves
7. Defeat the boss
8. End the run with a clear result

### Player Requirements

- The player must be able to move freely in the arena
- The player must be able to attack during movement-oriented play
- The player must have health or a failure condition that can end a run early
- The player must have an inventory or equivalent held-state for combine inputs

### Enemy Requirements

- Normal enemies in V1 are slime-type enemies only
- Slimes must spawn in waves
- Slimes must be defeatable
- Slimes must be able to drop loot based on configured drop rules
- A boss must appear after wave progression conditions are met

### Loot Requirements

- Loot must come from defeated enemies, not arbitrary floor spawns
- V1 loot model defaults to:
  - slimes drop components most of the time
  - slimes may occasionally drop a base weapon
- Loot rules must be configurable by data, not hardcoded entirely inside scenes

### Combine Requirements

- The player must be able to combine owned loot into stronger weapons
- V1 combine interaction defaults to:
  - combine is initiated from an always-visible HUD or quick inventory panel
  - combine pauses or safely gates combat while the action resolves
- Recipe validation must be deterministic
- Invalid recipe attempts must fail without consuming unrelated items

### Progression Requirements

- Waves must become more difficult through data-configured pressure changes
- Difficulty growth may come from enemy count, spawn cadence, or boss trigger state
- The player must feel stronger by mid-run than at run start through upgrade outcomes

### Run-End Requirements

- The run must support both:
  - loss state on player death
  - win state on boss defeat
- Non-boss enemy defeat must not end the run

### HUD And Feedback Requirements

- The UI must show enough information to understand:
  - current weapon state
  - currently held loot/components
  - available or newly unlocked combine outcomes
  - health or failure-state feedback
- Feedback can be debug-first in V1, but it must be readable

## V1 Vertical Slice Bounds

These are hard scope boundaries for the first playable slice.

### Required V1 Content Bounds

- `1` playable arena
- `1` normal enemy family: slime
- `1` boss
- `4-6` base loot items/components total
- `2-3` base weapons total
- `2-3` combine recipes
- `3-5` waves including the boss wave
- `8-12` minute target run length
- `2` distinct reachable upgrade endpoints for build variation

### Required V1 Outcomes

- Player can survive through at least one full non-boss wave
- At least one combine result changes a combat-relevant stat or behavior
- At least two different build outcomes are reachable across repeated runs
- Boss clear produces a distinct run-end result state

### Explicit V1 Non-Goals

- Multiplayer
- Online services, accounts, or rankings
- Story campaign or cutscene-heavy presentation
- Persistent progression or meta-economy
- Shops
- Skill tree systems
- Procedural map generation
- Multiple player characters
- Multiple regular enemy archetypes
- Crafting systems outside the enemy-drop/combine loop

## Technical Requirements

### Stack Requirements

- Package manager: `pnpm`
- Language: `TypeScript`
- App shell/build: `Vite`
- Game framework: `Phaser`
- First target: web browser

### Code Structure Requirements

The initial project shape should stay small and readable:

- `src/main.ts`
- `src/game/config.ts`
- `src/scenes/`
- `src/systems/`
- `src/domain/`
- `src/data/`
- `src/ui/`
- `assets/`

### Architecture Requirements

- Drop tables, recipe definitions, and wave rules should live in data modules
- Deterministic game rules should be testable outside heavy scene code when practical
- RNG-dependent behavior should be seedable or mockable for tests
- Scene code should orchestrate gameplay, not own all rule definitions inline

## Verification Requirements

### Tooling Verification

- Install succeeds
- Dev server starts
- Production build succeeds
- TypeScript checks succeed

### Logic Verification

- Drop resolution uses only configured loot and respects configured probabilities
- Combine resolution upgrades only when valid inputs exist
- Invalid combine attempts do not produce upgrades
- Wave progression does not trigger boss state early
- Boss defeat ends the run
- Non-boss defeats do not end the run

### Manual Gameplay Verification

The repo must eventually support this manual verification path:

1. Start a run
2. Move and attack successfully
3. Defeat slimes until at least one drop appears
4. Collect enough loot to perform one valid combine
5. Confirm the combined result changes combat effectiveness
6. Reach the boss through normal progression
7. Verify player death causes a loss state or boss defeat causes a win state
8. Repeat enough to observe two distinct reachable build outcomes

## Workflow Handoff Rules

### For `deep-interview`

Use `deep-interview` only to resolve areas this document intentionally leaves open, such as:

- art direction and theme details
- exact enemy naming and fiction flavor
- future content expansion beyond V1
- alternate control models
- post-V1 progression or packaging decisions

Do not use `deep-interview` to reopen already locked basics like `top-down 2D`, `browser-first`, `drop + combine`, or `slime + boss` unless the user explicitly wants to change them.

### For `ralplan`

Use this document as the upstream requirements baseline and derive:

- a scoped PRD for the next delivery slice
- a companion test spec
- explicit acceptance criteria and verification path

`ralplan` may narrow counts and implementation order further, but it should not broaden scope past this baseline without an explicit requirement change.

### For `ralph` Or `team`

Do not execute directly from this baseline alone.

Execution should start only after:

1. a slice-specific PRD exists in `.omx/plans/`
2. a slice-specific test spec exists in `.omx/plans/`
3. the scoped plan still conforms to this baseline

## Open Decisions Reserved For Later Workflows

- Exact art style and palette
- Exact slime variants, boss identity, and naming
- Exact weapon stat values
- Exact component names
- Exact HUD layout
- Whether V1 combat should be melee-first, ranged-first, or hybrid
- Whether later releases add desktop packaging

## Change Control

If a future workflow changes any of these baseline requirements, it should update this file first or alongside the downstream PRD so that later agents do not drift from the new source of truth.
