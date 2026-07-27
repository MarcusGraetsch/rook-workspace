#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <repo> <package-name> [base-ref]" >&2
  exit 2
fi

REPO="$(cd -- "$1" && pwd)"
RAW_NAME="$2"
BASE_REF="${3:-HEAD}"

NAME="$(printf '%s' "$RAW_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//')"
if [[ -z "$NAME" ]]; then
  echo "ERROR: package name becomes empty after sanitization" >&2
  exit 2
fi

git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null
TOP="$(git -C "$REPO" rev-parse --show-toplevel)"
REPO_NAME="$(basename -- "$TOP")"
WT_ROOT="${AGENT_WORKTREE_ROOT:-$(dirname -- "$TOP")/.${REPO_NAME}-agent-worktrees}"
WT_PATH="$WT_ROOT/$NAME"
BRANCH="agent/$NAME"

mkdir -p "$WT_ROOT"

if [[ -e "$WT_PATH" ]]; then
  echo "ERROR: worktree path already exists: $WT_PATH" >&2
  exit 3
fi

if git -C "$TOP" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "ERROR: branch already exists: $BRANCH" >&2
  exit 4
fi

git -C "$TOP" worktree add -b "$BRANCH" "$WT_PATH" "$BASE_REF"

printf 'worktree=%s\nbranch=%s\nbase_ref=%s\n' "$WT_PATH" "$BRANCH" "$BASE_REF"
