# NeoD

NeoD is a browser-first prototype for a safe fictional top-down action game where defeated enemies drop components and the player combines those drops into stronger weapons during a single run.

## Locked V1 Stack

- Package manager: `pnpm`
- Language: `TypeScript`
- App/build tool: `Vite`
- Game framework: `Phaser`
- Primary V1 target: web browser
- Deferred until later: desktop packaging

## Current V1 Direction

- Core loop: move, fight enemies, collect drops, combine items into stronger weapons, clear waves, defeat a boss
- Scope: one arena, slime-family waves plus a scoped non-slime insect-spitter enemy, one boss, placeholder-safe art and naming
- Planning baseline:
  - `docs/wiki/game-requirements.md`
  - `.omx/plans/prd-safe-topdown-combine-action-game-v1.md`
  - `.omx/plans/test-spec-safe-topdown-combine-action-game-v1.md`

## Repo Workflow

```sh
pnpm install
pnpm dev
pnpm run ai:session -- <session-name>
pnpm run ai:ralph-session -- <session-name> -- "<task text>"
pnpm run ai:switch-session -- --name <session-name> [--task "<task text>"]
pnpm typecheck
pnpm test
pnpm build
```

Documentation follows the `raw sources / wiki / schema` layout with `docs/index.md` as the entrypoint.
Parallel AI worktree setup is documented in `docs/wiki/parallel-ai-worktrees.md`.

## Vercel Deployment

Pushes merged into `ai-dev` trigger `.github/workflows/vercel-ai-dev-deploy.yml`, which installs dependencies, runs `pnpm typecheck`, `pnpm test`, and `pnpm build`, then publishes a Vercel production deployment through the Vercel CLI.

The repo also disables Vercel's built-in Git auto-deploy path in `vercel.json`, so GitHub Actions remains the single deployment mechanism.

Configure these GitHub repository secrets before enabling the workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Layout

- `src/main.ts`: app bootstrap
- `src/game/config.ts`: Phaser game configuration
- `src/scenes/`: boot, arena, and result scenes
- `src/systems/`: deterministic gameplay logic and helpers
- `src/domain/`: shared gameplay types
- `src/data/`: enemy, weapon, recipe, and wave data
- `src/ui/`: HUD rendering helpers
- `tests/`: deterministic logic verification
- `docs/`: planning and requirements artifacts
- `AGENTS.md`: repo-local agent contract

## Notes

- Keep V1 browser-first and compact.
- Keep flavor/art decisions placeholder-safe unless a later prompt explicitly reopens them.
