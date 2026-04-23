#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/ai/create-worktree.sh <task-name> [base-branch]

Examples:
  scripts/ai/create-worktree.sh ui-polish
  scripts/ai/create-worktree.sh combat-balance ai-dev
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

raw_task_name="$1"
requested_base_branch="${2:-ai-dev}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
repo_name="$(basename "$repo_root")"

slug="$(
  printf '%s' "$raw_task_name" \
    | tr '[:upper:]' '[:lower:]' \
    | tr -cs 'a-z0-9' '-'
)"
slug="${slug#-}"
slug="${slug%-}"

if [[ -z "$slug" ]]; then
  echo "Could not derive a valid task slug from: $raw_task_name" >&2
  exit 1
fi

branch_name="ai-task/$slug"
parent_dir="$(cd "$repo_root/.." && pwd)"
worktree_dir="$parent_dir/${repo_name}-${slug}"

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

if ! base_ref="$(resolve_base_ref "$requested_base_branch")"; then
  echo "Base branch not found locally or on origin: $requested_base_branch" >&2
  echo "Run 'git fetch origin' first or choose an existing base branch." >&2
  exit 1
fi

if [[ -e "$worktree_dir" ]]; then
  echo "Target directory already exists: $worktree_dir" >&2
  exit 1
fi

if git -C "$repo_root" rev-parse --verify "$branch_name^{commit}" >/dev/null 2>&1; then
  git -C "$repo_root" worktree add "$worktree_dir" "$branch_name"
else
  git -C "$repo_root" worktree add "$worktree_dir" -b "$branch_name" "$base_ref"
fi

worktree_count="$(git -C "$repo_root" worktree list | wc -l | tr -d ' ')"
recommended_port="$((5173 + worktree_count - 1))"

cat <<EOF
Created worktree:
  path:   $worktree_dir
  branch: $branch_name
  base:   $base_ref

Recommended next steps:
  cd $worktree_dir
  pnpm install
  pnpm dev -- --port $recommended_port
  pnpm typecheck
  pnpm test
  pnpm build
  git push -u origin $branch_name
  gh pr create --base ai-dev --head $branch_name
EOF
