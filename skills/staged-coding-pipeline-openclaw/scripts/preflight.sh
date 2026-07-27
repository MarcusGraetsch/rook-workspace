#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-.}"
cd -- "$REPO"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not a git worktree: $REPO" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel)"
BRANCH="$(git branch --show-current || true)"
HEAD_SHA="$(git rev-parse HEAD)"
DIRTY="$(git status --porcelain=v1)"
WORKTREES="$(git worktree list --porcelain)"

printf 'repo_root=%s\n' "$ROOT"
printf 'branch=%s\n' "${BRANCH:-DETACHED}"
printf 'head=%s\n' "$HEAD_SHA"

if [[ -n "$DIRTY" ]]; then
  echo "dirty=true"
  echo "--- status ---"
  printf '%s\n' "$DIRTY"
else
  echo "dirty=false"
fi

echo "--- worktrees ---"
printf '%s\n' "$WORKTREES"

echo "--- remotes ---"
git remote -v || true
