# Agent Contract For NeoD

This file is the repo-local operating contract for agents working inside `NeoD`.

## Trust Order

1. Actual code and config files
2. Root `README.md`
3. Repo-local harness contracts under `.harness/contracts/**`

## Repo-Local Harness

Use the repo-local harness entrypoints:

- `./bin/harness`
- `./scripts/harness/**`
- `.harness/contracts/**`
- `.harness/templates/**`

Default substantial-task flow:

1. process selection
2. run registration
3. deep interview
4. planning
5. execution
6. self verification
7. cross verification
8. wiki or durable context sync when needed
9. norm update when process improvements are discovered

## Working Rules

- Keep the repo scaffold small and reversible.
- Prefer repo-local scripts over home-directory shared paths.
- Do not assume a framework or package manager until the project chooses one.
- When the stack becomes concrete, update this file and `README.md` to reflect the real workflow.

## Git / Branch Safety

- Treat `main` as the publication branch.
- Do implementation work on `ai-dev` or `ai-task/*` after the initial scaffold.
- Prefer `gh` for GitHub operations.

## Verification

- For scaffold changes, verify file layout, harness command entry, and git state.
- For future code changes, add stack-specific verification rules once the toolchain exists.
