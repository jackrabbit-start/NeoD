---
name: post-interview-context
description: Capture context after $deep-interview in NeoD by summarizing lessons, new files, modified files, decisions, and verification gaps into .omx context plus durable docs/wiki synthesis. Use when a deep-interview ends or the user asks to record interview lessons, new files, modifications, or context for future agents.
---

# Post Interview Context

Use this NeoD project-local skill after `$deep-interview` (or a comparable requirements/planning pass) to preserve useful context for future agents.

## Goal

Create a prompt-safe record of what changed or was learned, then update durable project knowledge when the lesson should survive beyond the current session.

## Guardrails

- Manual V1 only: do not add automatic OMX hooks/runtime integration.
- Do not change NeoD game/product implementation code while using this skill.
- Do not commit, push, open PRs, or publish changes.
- Do not add dependencies.
- Keep docs changes targeted; do not restructure the docs system unless explicitly asked.
- Treat `.omx/context` and `.omx/specs` as raw sources; treat `docs/wiki/` as synthesized knowledge.

## Inputs to inspect

Prefer the latest relevant artifact unless the user provides a path.

1. Deep-interview spec: `.omx/specs/deep-interview-*.md`
2. Interview transcript: `.omx/interviews/*.md`
3. Context snapshot: `.omx/context/*.md`
4. Current worktree facts:
   - `git status --short`
   - `git diff --name-status`
   - `git diff --stat`
   - Read specific changed files when needed to avoid guessing

## Capture workflow

1. **Identify the subject**
   - Derive a short slug from the spec path, branch, or user request.
   - Note whether this is post-interview only, post-implementation, or both.

2. **Classify findings**
   - Lessons: durable insights, conventions, pitfalls, or decisions.
   - New files: paths and why they exist.
   - Modified files: paths and behavior/knowledge impact.
   - Constraints/non-goals: what future agents must preserve.
   - Verification: what passed, failed, or was not run.
   - Residual risks: anything future agents should re-check.

3. **Write a prompt-safe context note**
   - Create `.omx/context/post-interview-<slug>-<UTC timestamp>.md`.
   - Keep it concise and link to raw source artifacts instead of copying them wholesale.
   - Include this shape:

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

4. **Persist high-signal memory**
   - Use `notepad_write_working` for session-useful notes.
   - Use `project_memory_add_note` or `project_memory_add_directive` only for durable rules that future sessions should keep.
   - If MCP memory tools are unavailable, rely on the `.omx/context` note and mention the gap.

5. **Synthesize docs/wiki when durable**
   - Update an existing `docs/wiki/*.md` page when the lesson fits an existing topic.
   - Create a new wiki page only for a durable, reusable project concept.
   - When adding/removing/renaming a wiki page, update `docs/index.md`.
   - Append `docs/log.md` for material docs-structure changes.
   - Do not paste entire `.omx` artifacts into wiki pages; summarize and link sources.

6. **Report results**
   - List context/memory/docs files updated.
   - List lessons captured.
   - List remaining risks or intentionally skipped surfaces.

## Deep-interview final-report checklist

When finishing a `$deep-interview`, remind the next execution lane to run this skill if there are lessons, new files, modified files, or durable decisions to preserve:

```text
Post-interview context reminder: run $post-interview-context after execution or artifact updates if lessons/new files/modifications should be preserved.
```

## Verification

- For skill/docs-only updates, run `git diff --check` when available.
- If source code changed outside this skill's guardrails, stop and surface that the change is out of scope for this skill.
- If product code was intentionally changed by another task before this skill runs, record its verification evidence rather than rerunning unrelated tests by default.

## Output contract

Return:

- Context note path
- Memory updates made or skipped
- Wiki/docs updates made or skipped
- New/modified files summarized
- Verification evidence
- Remaining risks
