# PRD: Safe Topdown Combine Action Game V1

## Status

- Mode: `ralplan --consensus`
- Planning state: draft for consensus review
- Source of truth:
  - `docs/game-requirements.md`
  - `.omx/specs/deep-interview-safe-topdown-combine-action-game.md`
  - `.omx/context/safe-topdown-combine-action-game-20260422T132330Z.md`
  - `README.md`
  - `docs/stack-foundation.md`

## Requirements Summary

Build the first playable version of a safe, fictional top-down 2D action game where the player moves in real time, defeats slime enemies, receives weapon or item drops from those enemies, combines those drops into stronger weapons, progresses through waves, and ends a run by defeating a boss.

The first pass should stay compact and prototype-oriented. It should prove the loop, not the full content roadmap.

## Problem Statement

The repo has a clear high-level game direction but no execution-ready V1 requirement package. Without a bounded PRD, the first implementation pass risks drifting into content sprawl, unclear success criteria, or unsafe theme choices.

## Desired Outcome

A single-run browser-playable prototype proves:

1. top-down movement and combat,
2. drop-based acquisition from defeated enemies,
3. combination-based weapon growth,
4. wave progression plus boss clear,
5. visible build differentiation across runs.

## RALPLAN-DR Summary

### Principles

1. Keep the concept fictional and safety-compliant.
2. Prove the core loop before expanding content breadth.
3. Keep progression data-driven where possible.
4. Optimize for a playable prototype, not production completeness.

### Decision Drivers

1. Fastest path to a playable vertical slice
2. Clear validation of the combine-growth loop
3. Tight scope control for a greenfield repo

### Viable Options

#### Option A: Web-first Phaser vertical slice

- Approach: implement a browser prototype with one arena, slime waves, drop tables, combine recipes, and a boss clear.
- Pros:
  - Aligns with `README.md` and `docs/stack-foundation.md`
  - Validates gameplay feel early
  - Naturally supports rapid iteration on balance and content tables
- Cons:
  - Requires initial scaffold work before gameplay tuning
  - Placeholder content may feel thin until follow-up passes

#### Option B: Requirements-only content design pass before code

- Approach: defer implementation and spend the next pass on enemy tables, recipe docs, and theme choices only.
- Pros:
  - Low technical risk
  - Gives more time to refine content balance on paper
- Cons:
  - Does not validate whether the loop is actually fun
  - Delays proof of movement/combat/combine interactions

#### Option C: Over-scoped prototype with multiple enemy archetypes in V1

- Approach: ship several enemy families, a larger loot pool, and broader encounter variety immediately.
- Pros:
  - Higher apparent content volume
  - More build combinations on paper
- Cons:
  - Conflicts with the deep-interview scope decision
  - Raises balancing and implementation risk before the core loop is proven

### Recommended Option

Choose Option A. It is the smallest slice that still tests the full intended player fantasy.

### Invalidation Rationale

- Option B is insufficient because the repo already has enough requirement clarity to start planning a playable slice, and delaying implementation evidence would leave the core fun untested.
- Option C is rejected because it violates the explicit V1 constraint of `slime + boss` and increases scope without improving requirement certainty.

## Product Scope

### In Scope

- Top-down 2D arena combat
- Real-time player movement during combat
- Slime enemies that drop weapons or item components
- Data-backed drop rates
- Inventory or pickup handling sufficient to combine drops
- Weapon or item combination into stronger weapons
- Noticeable within-run power growth
- Wave progression
- Boss fight that ends the run
- Basic HUD for current weapon, inventory, and combine outcome visibility

### Out of Scope

- Multiplayer
- Accounts, backend, ranking, or online features
- Story campaign, cutscenes, or dialogue-heavy delivery
- Multiple regular enemy archetypes in V1
- Persistent progression outside a run
- Specific meme-character references without later approval
- Any real-person target, likeness, or unsafe framing

## Requirement Details

### Player Fantasy

The player should feel that each run starts simple, becomes more powerful through drops and combinations, and culminates in a boss fight that tests whether the build came together.

### Core Gameplay Loop

1. Enter arena
2. Move and fight slimes
3. Collect dropped weapons or components
4. Combine collected drops into stronger weapons
5. Survive escalating waves
6. Defeat the boss to end the run

### Gameplay Invariants

- Camera and movement remain top-down 2D
- Combat remains real-time
- Growth is driven primarily by enemy drops plus combination
- Run completion is boss defeat
- V1 enemy scope remains `slime + boss`

### Content Constraints

- Weapons and items must originate from defeated enemies, not arbitrary world pickups
- Theme direction stays safely fictional
- Meme influence, if any, stays at flavor level only
- Initial content counts may be chosen autonomously during execution as long as scope remains compact

## Acceptance Criteria

1. A run starts in a playable top-down arena and the player can move and attack.
2. Slime enemies spawn, can be defeated, and can drop loot according to defined drop rules.
3. The player can acquire dropped weapons or components and use them in a combine flow.
4. At least one combination path upgrades the player's offensive capability in a way that is visible during combat.
5. Wave progression increases encounter pressure before the boss appears.
6. A boss encounter can be reached and defeating the boss ends the run.
7. At least 2 distinct build outcomes are practically achievable from the initial drop/combine pool.
8. No V1 content depends on online systems, persistent meta-progression, or additional enemy families.

## Repo Grounding

- `README.md` already defines the initial concept as an action game where enemies drop weapons and items that combine into higher grades.
- `docs/stack-foundation.md` recommends `pnpm + TypeScript + Vite + Phaser` with a web-first prototype approach.
- The repository currently has no established gameplay code, so the plan must include scaffold work before system implementation.

## Implementation Plan

### Step 1: Establish the executable web-game scaffold

- Create the initial web prototype using the stack recommended in `docs/stack-foundation.md`
- Expected touchpoints:
  - `package.json`
  - `tsconfig.json`
  - `src/main.ts`
  - `src/game/config.ts`
  - `src/scenes/BootScene.ts`
  - `src/scenes/ArenaScene.ts`

### Step 2: Define the first domain and data contracts

- Add compact, data-first definitions for:
  - slime enemy stats and drop tables,
  - weapon or component definitions,
  - combination recipes,
  - wave and boss progression configuration
- Expected touchpoints:
  - `src/domain/`
  - `src/data/enemies.ts`
  - `src/data/items.ts`
  - `src/data/recipes.ts`
  - `src/data/waves.ts`

### Step 3: Implement the playable combat and loot loop

- Add player movement, attack behavior, slime spawning, defeat handling, and loot drops
- Keep combat readable with placeholder visuals
- Expected touchpoints:
  - `src/scenes/ArenaScene.ts`
  - `src/systems/combat.ts`
  - `src/systems/spawn.ts`
  - `src/systems/drop.ts`

### Step 4: Implement combine-driven growth and HUD visibility

- Add inventory state, combine validation, upgrade resolution, and a simple HUD or debug panel
- Expected touchpoints:
  - `src/systems/combine.ts`
  - `src/systems/inventory.ts`
  - `src/ui/Hud.ts`
  - `src/domain/weapons.ts`

### Step 5: Implement wave escalation, boss resolution, and run-end flow

- Add wave progression, boss spawn conditions, run clear handling, and a minimal result state
- Expected touchpoints:
  - `src/scenes/ArenaScene.ts`
  - `src/scenes/ResultScene.ts`
  - `src/systems/waves.ts`
  - `src/systems/boss.ts`

## Risks And Mitigations

- Risk: The combine system may feel abstract or weak.
  - Mitigation: Require at least one visibly stronger upgrade path in the first content set.
- Risk: Scope creep may reintroduce multiple enemy types or extra progression layers.
  - Mitigation: Treat `slime + boss` and `single-run prototype` as hard V1 boundaries.
- Risk: Data and scene logic may become tightly coupled too early.
  - Mitigation: Keep drop rules, recipes, and wave definitions in plain data modules.
- Risk: Theme drift may reintroduce unsafe references.
  - Mitigation: Keep all names and visuals fictional unless a later approval explicitly broadens theme choices.

## Verification Plan

1. Static verification:
   - project installs and builds cleanly
   - typecheck passes
   - lint passes once linting is introduced
2. Functional verification:
   - player can complete a run from start to boss clear
   - slime drops appear at practical rates
   - combine action changes weapon effectiveness
   - at least 2 build paths can be observed in playtests
3. Regression guardrails:
   - add focused tests for drop resolution, combine recipes, and wave progression once code exists
   - preserve the V1 scope boundary in docs and content tables

## ADR

### Decision

Build a web-first Phaser-based vertical slice for a safe fictional top-down combine action game, scoped to one run with slimes, drop-based growth, combination upgrades, waves, and a boss.

### Drivers

- Existing repo direction already favors a web-first game prototype
- The core uncertainty is gameplay feel, not content breadth
- The deep-interview artifact already resolved major scope and safety questions

### Alternatives Considered

- Requirements-only pass before implementation
- Larger V1 with multiple enemy archetypes

### Why Chosen

This option is the smallest one that validates the intended player fantasy end to end while staying within the explicit deep-interview boundaries.

### Consequences

- Early implementation focuses on scaffolding and core loop proof, not polish
- Placeholder art and narrow content breadth are acceptable in V1
- Future expansions should layer on top of data contracts rather than rewriting the core loop

### Follow-ups

- Confirm input model and target platform before implementation if they materially affect controls
- Decide initial weapon and recipe counts during execution
- Revisit theme flavor only after the safe fictional prototype is working

## Available Agent Types Roster

- `planner`
- `architect`
- `critic`
- `executor`
- `test-engineer`
- `verifier`
- `designer`
- `writer`

## Follow-up Staffing Guidance

### Ralph path

- `executor` with high reasoning:
  - scaffold the Phaser/Vite project and implement the core gameplay systems
- `test-engineer` with medium reasoning:
  - define lightweight coverage for drop, combine, and wave logic
- `verifier` with high reasoning:
  - confirm buildability and functional completion evidence before closeout

### Team path

- Lane 1: `executor` high reasoning for project scaffold and scene loop
- Lane 2: `executor` high reasoning for data contracts and combine/drop systems
- Lane 3: `test-engineer` medium reasoning for tests and verification harness
- Lane 4: `designer` high reasoning for HUD readability and placeholder UX

## Launch Hints

### Ralph

```text
$ralph implement .omx/plans/prd-safe-topdown-combine-action-game-v1.md with .omx/plans/test-spec-safe-topdown-combine-action-game-v1.md
```

### Team

```text
$team implement .omx/plans/prd-safe-topdown-combine-action-game-v1.md with .omx/plans/test-spec-safe-topdown-combine-action-game-v1.md
```

## Team Verification Path

1. Scaffold lane proves the project boots and builds.
2. Gameplay lane proves enemy drops, combine flow, and boss-clear loop work.
3. Test lane proves critical pure logic around drop/combine/wave modules.
4. Final verifier pass confirms V1 boundaries were preserved and no unsafe theme drift was introduced.
