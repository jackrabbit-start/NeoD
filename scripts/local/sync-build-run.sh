#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

BRANCH="${1:-ai-dev}"
MODE="${2:-dev}"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/local/sync-build-run.sh [branch] [dev|preview]

Examples:
  bash scripts/local/sync-build-run.sh
  bash scripts/local/sync-build-run.sh ai-dev dev
  bash scripts/local/sync-build-run.sh ai-dev preview
EOF
}

if [[ "${BRANCH}" == "--help" || "${BRANCH}" == "-h" ]]; then
  print_usage
  exit 0
fi

if [[ "${MODE}" != "dev" && "${MODE}" != "preview" ]]; then
  echo "Unsupported mode: ${MODE}"
  echo
  print_usage
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before running this script."
  exit 1
fi

echo "==> Fetching latest refs from origin"
git fetch origin --prune

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "${CURRENT_BRANCH}" != "${BRANCH}" ]]; then
  echo "==> Switching to branch ${BRANCH}"
  git checkout "${BRANCH}"
fi

echo "==> Fast-forwarding ${BRANCH} from origin/${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Running typecheck"
pnpm typecheck

echo "==> Running tests"
pnpm test

echo "==> Building app"
pnpm build

if [[ "${MODE}" == "preview" ]]; then
  echo "==> Starting preview server on http://localhost:4173"
  exec pnpm preview --host
fi

echo "==> Starting dev server on http://localhost:5173"
exec pnpm dev --host
