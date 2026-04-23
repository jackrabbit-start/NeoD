#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/ai/ralph-session.sh <session-name> [--base <branch>] [--reuse] -- <task text...>
  scripts/ai/ralph-session.sh <session-name> [--base <branch>] [--reuse]

Examples:
  scripts/ai/ralph-session.sh hud-pass -- "Improve HUD readability during combat"
  scripts/ai/ralph-session.sh drop-loop --base ai-dev -- "Tune drop pacing and fix combine flow"
  scripts/ai/ralph-session.sh combat-balance --reuse
EOF
}

session_name=""
base_branch="ai-dev"
reuse_existing="false"
task_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      base_branch="${2:-}"
      shift 2
      ;;
    --reuse)
      reuse_existing="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      task_args=("$@")
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
    *)
      if [[ -z "$session_name" ]]; then
        session_name="$1"
        shift
      else
        task_args+=("$1")
        shift
      fi
      ;;
  esac
done

if [[ -z "$session_name" ]]; then
  echo "session-name is required." >&2
  usage
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
repo_name="$(basename "$repo_root")"
parent_dir="$(cd "$repo_root/.." && pwd)"

slug="$(
  printf '%s' "$session_name" \
    | tr '[:upper:]' '[:lower:]' \
    | tr -cs 'a-z0-9' '-'
)"
slug="${slug#-}"
slug="${slug%-}"

if [[ -z "$slug" ]]; then
  echo "Could not derive a valid session slug from: $session_name" >&2
  exit 1
fi

worktree_dir="$parent_dir/${repo_name}-${slug}"
metadata_dir="$worktree_dir/.omx"
metadata_path="$metadata_dir/ai-session.json"

if [[ ! -d "$worktree_dir" ]]; then
  bash "$script_dir/create-worktree.sh" "$session_name" "$base_branch"
elif [[ "$reuse_existing" != "true" ]]; then
  echo "Worktree already exists: $worktree_dir" >&2
  echo "Use --reuse to relaunch Ralph in the existing session worktree." >&2
  exit 1
fi

mkdir -p "$metadata_dir"

task_text=""
if [[ ${#task_args[@]} -gt 0 ]]; then
  task_text="${task_args[*]}"
fi

node -e '
const fs = require("fs");
const path = process.argv[1];
const data = {
  session_name: process.argv[2],
  session_slug: process.argv[3],
  base_branch: process.argv[4],
  worktree_dir: process.argv[5],
  task_text: process.argv[6],
};
fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
' "$metadata_path" "$session_name" "$slug" "$base_branch" "$worktree_dir" "$task_text"

cd "$worktree_dir"

if [[ -n "$task_text" ]]; then
  exec omx ralph "$task_text"
fi

exec omx ralph
