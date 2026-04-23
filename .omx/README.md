# Repo-local OMX Artifacts

This repository tracks the shareable OMX artifacts that help another contributor
start with the same planning context:

- `.omx/plans/`
- `.omx/specs/`
- `.omx/context/`
- `.omx/interviews/`
- `.omx/hud-config.json`

Local runtime state stays untracked on purpose. Do not commit these files:

- `.omx/state/`
- `.omx/logs/`
- `.omx/ai-session.json`
- `.omx/metrics.json`
- `.omx/notepad.md`
- `.omx/tmux-hook.json`

The tracked files are the portable baseline. Session-specific state should be
recreated locally by each contributor.
