# Deep Interview Spec: Safe Topdown Combine Action Game

## Metadata

- Profile: standard
- Rounds: 8
- Final ambiguity: 0.17 before final scope-conflict resolution; practical readiness now below threshold after V1 enemy scope was fixed
- Threshold: 0.20
- Context type: greenfield
- Context snapshot: `.omx/context/safe-topdown-combine-action-game-20260422T132330Z.md`
- Transcript: `.omx/interviews/safe-topdown-combine-action-game-20260422T133500Z.md`

## Clarity Breakdown

| Dimension | Score |
| --- | ---: |
| Intent | 0.82 |
| Outcome | 0.85 |
| Scope | 0.90 |
| Constraints | 0.85 |
| Success | 0.90 |

## Intent

Build a safe, fictional top-down 2D action game where the fun comes from defeating enemies, getting drop-based weapons/items, combining them into stronger weapons, and feeling meaningful growth within a single run.

## Desired Outcome

The first playable version should let the player:

1. control a character in a top-down 2D arena,
2. fight slime enemies in real time,
3. receive weapon/item drops from defeated enemies based on drop rates,
4. combine drops into stronger weapons,
5. progress through waves,
6. defeat a boss to end the run.

## In-Scope

- Top-down 2D real-time combat
- Player movement during combat
- Enemy-drop-based item/weapon acquisition
- Weapon/item combination into stronger gear
- Within-run power growth
- Wave progression
- Boss-fight run ending
- V1 enemy scope: slime enemies plus a boss
- Meme-inspired tone only at a broad flavor level

## Out-of-Scope / Non-goals

- Multiplayer
- Online ranking/account/server features
- Complex story delivery or cutscenes
- Large enemy roster in V1
- Direct use of real people or real-person likeness targeting
- Specific meme-character selection without user approval

## Decision Boundaries

OMX may decide without further confirmation:

- Initial slime visual direction and color
- Initial weapon count and placeholder names
- Initial combination recipe count
- Run length and wave count

OMX must **not** decide without further confirmation:

- Specific meme/character/theme references that go beyond generic tone
- Any content that points back to a real person, identifiable likeness, or real-world target

## Constraints

- The game concept must remain safely fictional.
- Meme influence should stay at tone/reference level unless later clarified and approved.
- Weapons should come from enemy drops, not arbitrary floor pickups.
- V1 should stay compact enough for a prototype-first build.

## Testable Acceptance Criteria

The first version is successful if all of these are true:

1. Slime enemies can be defeated and produce drop-based loot.
2. Dropped weapons/items can be combined into stronger weapons.
3. A full run can start, progress through waves, and end with a boss clear.
4. The player noticeably grows stronger within one run.
5. At least 2–3 build differences are perceptible.

## Invariants

- Must remain top-down 2D.
- Must remain move-and-fight real-time combat.
- Must keep combination-driven growth as a core mechanic.
- Must show growth within a single run.
- Meme influence is tone-only unless later approved more concretely.
- Weapons/items originate from enemy drop rates.

## Assumptions Exposed + Resolutions

- **Unsafe initial target assumption:** The original named-target framing was not acceptable.  
  **Resolution:** Reframed to fictional enemies only.

- **Enemy variety assumption:** “Many enemy types” sounded important later, but conflicted with early prototype simplification.  
  **Resolution:** V1 uses slime enemies plus a boss; broader enemy variety is deferred.

- **Meme-content assumption:** Meme-driven content might imply direct parody of recognizable people or entities.  
  **Resolution:** Keep meme content at tone/reference level for now; explicit picks require user approval.

## Pressure-Pass Findings

- Earlier answer revisited: the unsafe named-target idea was challenged and narrowed.
- Resulting change: the concept moved from a real-person killing frame to a fictional slime-and-boss prototype.
- Later contradiction revisited: “many enemy types” vs. simpler V1.
- Resulting change: V1 enemy scope was explicitly reduced to slime plus boss.

## Brownfield Evidence vs Inference Notes

- Repo evidence: `NeoD` is still scaffold-oriented, with harness-driven process stages and no established game implementation yet.
- Inference: because the repo is greenfield, this concept decision has broad impact on later content schema and prototype structure.

## Technical Context Findings

- The repository currently contains harness/process scaffolding rather than an implemented game loop.
- This deep-interview artifact is the current source of truth for intent and boundaries.
- A planning handoff is appropriate before implementation.

## Blast Radius

Broad for future prototype direction, but currently low-risk in code because the repo is still scaffold-heavy. The biggest impact is on:

- future enemy/content schema,
- loot/drop rules,
- combination recipe structure,
- run progression shape,
- tone/safety boundaries for later art/content choices.

## Recommended Handoff

### Recommended: `$ralplan`

Use this spec as the requirements source of truth for planning:

```text
$plan --consensus --direct .omx/specs/deep-interview-safe-topdown-combine-action-game.md
```

## Condensed Transcript

- R1: unsafe real-person request redirected to safe fictional framing
- R2: V1 enemy direction narrowed to slime-based fictional foes
- R3: run ending fixed as boss defeat
- R4: multiplayer / online / story-heavy scope removed from V1
- R5: authority boundary split between OMX-autonomous prototype sizing and user-approved meme specifics
- R6: invariants fixed around top-down action, combine growth, and enemy-drop loot
- R7: success criteria fixed around drop, combine, progression, boss clear, growth feeling, and build variety
- R8: enemy-variety conflict resolved in favor of slime-plus-boss V1 scope
