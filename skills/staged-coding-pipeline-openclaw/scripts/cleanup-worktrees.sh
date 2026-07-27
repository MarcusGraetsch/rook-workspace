#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <repo> [--apply]" >&2
  exit 2
fi

REPO="$(cd -- "$1" && pwd)"
APPLY="${2:-}"
TOP="$(git -C "$REPO" rev-parse --show-toplevel)"
REPO_NAME="$(basename -- "$TOP")"
WT_ROOT="${AGENT_WORKTREE_ROOT:-$(dirname -- "$TOP")/.${REPO_NAME}-agent-worktrees}"

if [[ ! -d "$WT_ROOT" ]]; then
  echo "No managed worktree directory: $WT_ROOT"
  exit 0
fi

mapfile -t WORKTREES < <(find "$WT_ROOT" -mindepth 1 -maxdepth 1 -type d -print | sort)

if [[ ${#WORKTREES[@]} -eq 0 ]]; then
  echo "No worktrees to clean."
  exit 0
fi

echo "Candidate worktrees:"
printf '  %s\n' "${WORKTREES[@]}"

for wt in "${WORKTREES[@]}"; do
  if ! git -C "$wt" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "SKIP not a registered worktree: $wt"
    continue
  fi

  if [[ -n "$(git -C "$wt" status --porcelain)" ]]; then
    echo "SKIP dirty: $wt"
    continue
  fi

  if [[ "$APPLY" == "--apply" ]]; then
    git -C "$TOP" worktree remove "$wt"
    echo "Removed: $wt"
  else
    echo "DRY-RUN removable: $wt"
  fi
done

if [[ "$APPLY" != "--apply" ]]; then
  echo "Run again with --apply only after explicit approval."
fi
