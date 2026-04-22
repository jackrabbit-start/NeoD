# NeoD

Private repository scaffolded for new work with a repo-local harness setup.

## Layout

- `.harness/contracts/**`: harness stage contracts and artifact schemas
- `.harness/templates/**`: lightweight planning template(s)
- `scripts/harness/**`: harness runtime and hook guard implementation
- `bin/harness`: local wrapper for running the harness

## Basic Usage

Run harness commands from the repository root:

```sh
./bin/harness status --json
./bin/harness run start --process feature-delivery --goal "Describe the task"
```

When a Codex/OMX session should respect the repo-local harness, point the root explicitly:

```sh
HARNESS_ROOT="$PWD/.harness" ./bin/harness status --json
```

## Notes

- Runtime state under `.harness/state`, `.harness/runs`, `.harness/artifacts`, `.harness/output`, and `.harness/learning` is ignored by git.
- Update `AGENTS.md` and this README once the actual project stack and workflow are decided.
