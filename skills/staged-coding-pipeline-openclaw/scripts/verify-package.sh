#!/usr/bin/env bash
set -uo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <worktree> <check-command> [report-file]" >&2
  exit 2
fi

WORKTREE="$(cd -- "$1" && pwd)"
CHECK="$2"
WT_PARENT="$(dirname -- "$WORKTREE")"
WT_NAME="$(basename -- "$WORKTREE")"
REPORT="${3:-$WT_PARENT/reports/${WT_NAME}-check.txt}"
TMP="$(mktemp "${TMPDIR:-/tmp}/agent-check.XXXXXX")"
trap 'rm -f -- "$TMP"' EXIT

mkdir -p "$(dirname -- "$REPORT")"

{
  echo "timestamp=$(date -Iseconds)"
  echo "worktree=$WORKTREE"
  echo "branch=$(git -C "$WORKTREE" branch --show-current 2>/dev/null || true)"
  echo "head_before=$(git -C "$WORKTREE" rev-parse HEAD 2>/dev/null || true)"
  echo "command=$CHECK"
  echo "--- output ---"
} > "$TMP"

(
  cd -- "$WORKTREE"
  bash -lc "$CHECK"
) >> "$TMP" 2>&1
RC=$?

{
  echo
  echo "--- result ---"
  echo "exit_code=$RC"
  echo "head_after=$(git -C "$WORKTREE" rev-parse HEAD 2>/dev/null || true)"
  echo "--- git status ---"
  git -C "$WORKTREE" status --short 2>&1 || true
} >> "$TMP"

mv -- "$TMP" "$REPORT"
trap - EXIT
cat "$REPORT"
exit "$RC"
