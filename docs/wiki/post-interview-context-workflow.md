# Post-Interview Context Workflow

NeoD keeps deep-interview and planning outputs useful by turning them into a short context record and, when durable, a wiki synthesis.

## When to use

Run the project-local `$post-interview-context` skill after a `$deep-interview` or comparable planning pass when any of these should survive the current session:

- lessons or decisions from the interview
- newly created files
- modified files and their intent
- constraints, non-goals, or decision boundaries future agents must preserve
- verification evidence or gaps

## V1 boundary

The workflow is manual plus checklist-based. It does not install an automatic OMX hook.

Allowed without another confirmation:

- inspect `git status`, `git diff --name-status`, and `git diff --stat`
- summarize `.omx/context`, `.omx/interviews`, and `.omx/specs` artifacts
- write a prompt-safe `.omx/context/post-interview-*.md` note
- persist high-signal memory via notepad/project memory when useful
- update synthesized `docs/wiki` pages and maintain `docs/index.md` / `docs/log.md` for material doc-structure changes

Not allowed as part of this workflow:

- changing NeoD game/product implementation code
- commit, push, PR, or release automation
- adding dependencies
- broad documentation restructuring unrelated to the captured lesson

## Capture shape

Each context note should stay prompt-safe and link raw artifacts instead of copying them wholesale:

```md
# Post-Interview Context — <Title>

- Source spec:
- Source transcript/context:
- Branch/worktree:
- Summary:
- Lessons:
- New files:
- Modified files:
- Decisions / constraints:
- Verification:
- Residual risks:
- Next recommended use:
```

## Current project-local skill

The skill lives at `.codex/skills/post-interview-context/SKILL.md`.

Its source requirement came from `.omx/specs/deep-interview-post-deep-interview-context-skill.md` and the transcript `.omx/interviews/post-deep-interview-context-skill-20260425T094924Z.md`.
