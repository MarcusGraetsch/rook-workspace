#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <repo> <integration-name> <base-ref> <branch>..." >&2
  exit 2
fi

REPO="$(cd -- "$1" && pwd)"
NAME="$2"
BASE_REF="$3"
shift 3
BRANCHES=("$@")

TOP="$(git -C "$REPO" rev-parse --show-toplevel)"
REPO_NAME="$(basename -- "$TOP")"
SAFE_NAME="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g')"
WT_ROOT="${AGENT_WORKTREE_ROOT:-$(dirname -- "$TOP")/.${REPO_NAME}-agent-worktrees}"
WT_PATH="$WT_ROOT/integration-$SAFE_NAME"
INT_BRANCH="agent/integration-$SAFE_NAME"

mkdir -p "$WT_ROOT"

if [[ -e "$WT_PATH" ]]; then
  echo "ERROR: integration worktree already exists: $WT_PATH" >&2
  exit 3
fi
if git -C "$TOP" show-ref --verify --quiet "refs/heads/$INT_BRANCH"; then
  echo "ERROR: integration branch already exists: $INT_BRANCH" >&2
  exit 4
fi

git -C "$TOP" worktree add -b "$INT_BRANCH" "$WT_PATH" "$BASE_REF"

for branch in "${BRANCHES[@]}"; do
  echo "Merging $branch"
  if ! git -C "$WT_PATH" merge --no-ff --no-edit "$branch"; then
    echo "MERGE_CONFLICT branch=$branch worktree=$WT_PATH" >&2
    echo "Resolve only after reviewing the conflict. Do not delete the worktree."
    exit 10
  fi
done

printf 'integration_worktree=%s\nintegration_branch=%s\n' "$WT_PATH" "$INT_BRANCH"
