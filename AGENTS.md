# Agent Contract For NeoD

This file is the repo-local operating contract for agents working inside `NeoD`.

## Trust Order

1. Actual code and config files
2. Root `README.md`
3. `docs/schema.md` for documentation layout and maintenance conventions

## Repo Workflow

Current concrete workflow:

- Package manager: `pnpm`
- Language: `TypeScript`
- App/build tool: `Vite`
- Game framework: `Phaser`
- Primary target: browser-first prototype

## Working Rules

- Keep the repo scaffold small and reversible.
- Prefer repo-local scripts over home-directory shared paths.
- Keep V1 scope aligned with the existing PRD/test-spec and safe-fiction constraints.
- Defer desktop packaging and non-essential flavor decisions unless a later prompt explicitly reopens them.
- Treat `docs/index.md` as the docs entrypoint and keep repo-authored documentation under `docs/wiki/` unless it is a raw source or schema file.

## Git / Branch Safety

- Treat `main` as the publication branch.
- Do implementation work on `ai-dev` or `ai-task/*` after the initial scaffold.
- Prefer `gh` for GitHub operations.

## Verification

- Run `pnpm typecheck`, `pnpm test`, and `pnpm build` after code changes.
- Use deterministic tests for pure gameplay rules where possible and manual/browser checks for moment-to-moment feel.
