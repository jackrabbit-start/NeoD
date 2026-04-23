#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/ai/switch-current-session.sh --name <session-name> [--base <branch>] [--task <text>] [--reuse]

Examples:
  scripts/ai/switch-current-session.sh --name hud-pass --task "Improve HUD readability during combat"
  scripts/ai/switch-current-session.sh --name combat-balance --base ai-dev
EOF
}

session_name=""
base_branch="ai-dev"
task_text=""
reuse_existing="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      session_name="${2:-}"
      shift 2
      ;;
    --base)
      base_branch="${2:-}"
      shift 2
      ;;
    --task)
      task_text="${2:-}"
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
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$session_name" ]]; then
  echo "--name is required." >&2
  usage
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

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

branch_name="ai-task/$slug"

resolve_base_ref() {
  local branch="$1"
  if git -C "$repo_root" rev-parse --verify "$branch^{commit}" >/dev/null 2>&1; then
    printf '%s\n' "$branch"
    return 0
  fi

  if git -C "$repo_root" rev-parse --verify "origin/$branch^{commit}" >/dev/null 2>&1; then
    printf 'origin/%s\n' "$branch"
    return 0
  fi

  return 1
}

current_branch="$(git -C "$repo_root" branch --show-current)"

if [[ "$current_branch" == "$branch_name" ]]; then
  :
elif [[ -n "$(git -C "$repo_root" status --short)" ]]; then
  echo "Current worktree is dirty. Commit or stash changes before switching to $branch_name." >&2
  exit 1
elif git -C "$repo_root" rev-parse --verify "$branch_name^{commit}" >/dev/null 2>&1; then
  git -C "$repo_root" switch "$branch_name" >/dev/null
elif [[ "$reuse_existing" == "true" ]]; then
  echo "Requested --reuse but branch does not exist: $branch_name" >&2
  exit 1
else
  if ! base_ref="$(resolve_base_ref "$base_branch")"; then
    echo "Base branch not found locally or on origin: $base_branch" >&2
    exit 1
  fi
  git -C "$repo_root" switch -c "$branch_name" "$base_ref" >/dev/null
fi

mkdir -p "$repo_root/.omx"

node -e '
const fs = require("fs");
const path = process.argv[1];
const data = {
  session_name: process.argv[2],
  session_slug: process.argv[3],
  base_branch: process.argv[4],
  branch_name: process.argv[5],
  worktree_dir: process.argv[6],
  task_text: process.argv[7],
  launch_mode: "ralph",
  current_session_switch: true,
};
fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
' "$repo_root/.omx/ai-session.json" "$session_name" "$slug" "$base_branch" "$branch_name" "$repo_root" "$task_text"

cat <<EOF
Switched current NeoD session:
  branch:   $branch_name
  repo:     $repo_root
  task:     ${task_text:-<none>}
EOF
