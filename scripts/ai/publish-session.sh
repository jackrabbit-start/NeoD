#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/ai/publish-session.sh --message-file <path> [--base <branch>] [--draft] [--skip-verify]

Examples:
  scripts/ai/publish-session.sh --message-file .git/commit-msg-ai.txt
  scripts/ai/publish-session.sh --message-file /tmp/neod-commit.txt --base ai-dev --draft
EOF
}

message_file=""
base_branch="ai-dev"
draft_pr="false"
skip_verify="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --message-file)
      message_file="${2:-}"
      shift 2
      ;;
    --base)
      base_branch="${2:-}"
      shift 2
      ;;
    --draft)
      draft_pr="true"
      shift
      ;;
    --skip-verify)
      skip_verify="true"
      shift
      ;;
    -h|--help)
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

if [[ -z "$message_file" ]]; then
  echo "--message-file is required." >&2
  usage
  exit 1
fi

if [[ ! -f "$message_file" ]]; then
  echo "Commit message file not found: $message_file" >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
current_branch="$(git rev-parse --abbrev-ref HEAD)"

if [[ "$current_branch" != ai-task/* ]]; then
  echo "Current branch must be ai-task/* for OMX session publishing." >&2
  echo "Current branch: $current_branch" >&2
  exit 1
fi

if [[ "$skip_verify" != "true" ]]; then
  (
    cd "$repo_root"
    pnpm typecheck
    pnpm test
    pnpm build
  )
fi

if [[ -n "$(git status --short)" ]]; then
  git add -A
  git commit -F "$message_file"
else
  echo "No local changes to commit. Continuing with push/PR."
fi

git push -u origin "$current_branch"

if gh pr view "$current_branch" --json url >/dev/null 2>&1; then
  gh pr view "$current_branch" --json url --jq '.url'
  exit 0
fi

pr_args=(
  pr create
  --base "$base_branch"
  --head "$current_branch"
  --fill
)

if [[ "$draft_pr" == "true" ]]; then
  pr_args+=(--draft)
fi

gh "${pr_args[@]}"
