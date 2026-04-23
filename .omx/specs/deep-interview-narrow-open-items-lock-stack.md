# Deep Interview Spec: Narrow Open Items And Lock Stack

## Metadata

- Profile: standard
- Rounds: 3
- Final ambiguity: 0.09
- Threshold: 0.20
- Context type: greenfield
- Context snapshot: `.omx/context/narrow-open-items-lock-stack-20260422T142520Z.md`
- Transcript: `.omx/interviews/narrow-open-items-lock-stack-20260422T142845Z.md`

## Clarity Breakdown

| Dimension | Score |
| --- | ---: |
| Intent | 0.90 |
| Outcome | 0.90 |
| Scope | 0.93 |
| Constraints | 0.95 |
| Success | 0.90 |

## Intent

Move NeoD from a still-open scaffold direction into a planning-ready baseline without reopening already-set gameplay fundamentals. The user wants only the unresolved items narrowed and the technical stack formally chosen so downstream planning can move quickly.

## Desired Outcome

Use a locked V1 stack and an explicit defer list so the next planning step can focus on delivering the first playable slice instead of re-arguing platform and flavor questions.

## In-Scope

- Lock the V1 technical stack
- Confirm the first implementation target remains browser first
- Clarify how to treat the remaining open questions from the current docs
- Establish what OMX may decide autonomously during planning versus what stays deferred

## Out-of-Scope / Non-goals

- Reopening the already-locked top-down 2D, drop-plus-combine, slime-plus-boss V1 gameplay baseline
- Locking exact art direction for V1
- Locking exact enemy/item naming or fiction flavor for V1
- Choosing post-V1 desktop packaging direction now
- Choosing post-V1 content expansion direction now

## Decision Boundaries

OMX may decide without further confirmation:

- Placeholder-safe enemy/item names for planning and early scaffold work
- Generic safe-fiction tone defaults that do not rely on specific meme/public-person references
- Placeholder art-direction notes sufficient for a playable prototype
- Planning details that preserve the locked stack and browser-first scope

OMX must **not** decide without further confirmation:

- A different primary V1 stack than `pnpm + TypeScript + Vite + Phaser`
- A shift away from browser-first V1 delivery
- Specific public-facing branding, theme, or flavor choices that the user may care about later
- Any scope expansion that turns deferred post-V1 decisions into V1 requirements

## Constraints

- Keep the repo aligned with the previously locked safe-fiction game brief
- Keep V1 compact and optimized for first-playable speed
- Treat `pnpm + TypeScript + Vite + Phaser` as the current technical source of truth
- Defer desktop packaging until after the core loop is proven

## Testable Acceptance Criteria

The interview outcome is successful if all of these are true:

1. Planning treats `pnpm + TypeScript + Vite + Phaser` as the locked V1 stack.
2. Planning treats browser-first delivery as the locked initial platform target.
3. Planning does not spend V1 scope on exact art/tone, exact naming/flavor, or post-V1 packaging/expansion decisions unless a new user instruction reopens them.
4. OMX is allowed to use generic placeholders for still-deferred flavor details when that helps planning or scaffolding proceed.

## Assumptions Exposed + Resolutions

- **Assumption:** the stack recommendation in `README.md` and `docs/stack-foundation.md` might still be advisory only.  
  **Resolution:** the interview locked it as the V1 source of truth.

- **Assumption:** broad user autonomy over remaining open items might hide an unstated preference for one last must-decide area.  
  **Resolution:** a follow-up pressure pass established the rule to optimize for fastest playable prototype and defer the rest.

## Pressure-Pass Findings

- Earlier answer revisited: the user's “you can do any thing” response
- Pressure applied: asked whether speed-first deferral of all remaining open items would be correct, or whether one area would feel wrong to leave generic
- Resulting change: the user explicitly approved the speed-first rule, which turned a vague autonomy grant into a concrete defer-vs-lock boundary

## Brownfield Evidence vs Inference Notes

- Repo evidence:
  - `README.md` already recommends `pnpm + TypeScript + Vite + Phaser`
  - `docs/stack-foundation.md` frames the same stack as the current recommendation and lists open questions
  - `docs/game-requirements.md` already locks most V1 gameplay and platform basics
- Inference:
  - The highest-value remaining clarification is not more gameplay ideation; it is converting the stack recommendation and defer list into a formal planning baseline

## Technical Context Findings

- The repo still has no actual game runtime; it is safe to treat this as a pre-scaffold planning decision point
- The current documentation already narrows the stack heavily, so the interview only needed to formalize it
- The next useful handoff is planning, not another broad requirements pass

## Recommended Handoff

### Recommended: `$ralplan`

Use this spec as the requirements source of truth for the next planning step:

```text
$plan --consensus --direct .omx/specs/deep-interview-narrow-open-items-lock-stack.md
```

## Condensed Transcript

- R1: locked the recommended V1 stack as `pnpm + TypeScript + Vite + Phaser`, browser first
- R2: user granted OMX autonomy over whether to fix any remaining open item now
- R3: pressure pass converted that autonomy into a concrete speed-first rule that defers art/tone, naming/flavor, and post-V1 direction
