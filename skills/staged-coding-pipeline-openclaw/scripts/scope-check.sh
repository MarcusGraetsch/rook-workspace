#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <worktree> <base-ref> <allowed-glob>..." >&2
  exit 2
fi

WORKTREE="$(cd -- "$1" && pwd)"
BASE_REF="$2"
shift 2

CHANGED_FILE="$(mktemp)"
trap 'rm -f -- "$CHANGED_FILE"' EXIT

{
  git -C "$WORKTREE" diff --name-only "$BASE_REF"...HEAD
  git -C "$WORKTREE" diff --name-only
  git -C "$WORKTREE" diff --name-only --cached
  git -C "$WORKTREE" ls-files --others --exclude-standard
} | awk 'NF' | sort -u > "$CHANGED_FILE"

if [[ ! -s "$CHANGED_FILE" ]]; then
  echo "No changed files found."
  exit 0
fi

python3 - "$CHANGED_FILE" "$@" <<'PYCODE'
import fnmatch
import pathlib
import sys

changed_file = pathlib.Path(sys.argv[1])
patterns = sys.argv[2:]
files = [line.strip() for line in changed_file.read_text().splitlines() if line.strip()]
violations = [
    path for path in files
    if not any(fnmatch.fnmatch(path, pattern) for pattern in patterns)
]

print("Changed files:")
for path in files:
    print(f"  {path}")

print("Allowed patterns:")
for pattern in patterns:
    print(f"  {pattern}")

if violations:
    print("OUT-OF-SCOPE:")
    for path in violations:
        print(f"  {path}")
    raise SystemExit(1)

print("Scope check: PASS")
PYCODE
