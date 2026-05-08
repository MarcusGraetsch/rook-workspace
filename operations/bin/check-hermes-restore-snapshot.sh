#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  check-hermes-restore-snapshot.sh <backup_dir> [--require-sensitive-auth]

Checks whether a Hermes backup snapshot contains the expected baseline files.
EOF
}

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  usage
  exit 1
fi

BACKUP_DIR="$1"
REQUIRE_SENSITIVE=false
if [ "${2:-}" = "--require-sensitive-auth" ]; then
  REQUIRE_SENSITIVE=true
elif [ "${2:-}" != "" ]; then
  usage
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Missing backup directory: $BACKUP_DIR" >&2
  exit 1
fi

CORE_ARCHIVE="$BACKUP_DIR/core/runtime-core.tar.gz"
BRIDGE_ARCHIVE="$BACKUP_DIR/bridge/bridge-state.tar.gz"
MANIFEST="$BACKUP_DIR/manifests/backup-manifest.txt"
GIT_STATE="$BACKUP_DIR/manifests/git-state.txt"
SIZE_FILE="$BACKUP_DIR/manifests/size.txt"
SENSITIVE_ARCHIVE="$BACKUP_DIR/core/runtime-sensitive-auth.tar.gz"

echo "=== Hermes Restore Snapshot Check ==="
echo "Backup dir: $BACKUP_DIR"
echo "Require sensitive auth archive: $REQUIRE_SENSITIVE"
echo

for required in "$CORE_ARCHIVE" "$BRIDGE_ARCHIVE" "$MANIFEST" "$GIT_STATE" "$SIZE_FILE"; do
  if [ ! -f "$required" ]; then
    echo "MISSING: $required" >&2
    exit 1
  fi
  echo "OK: $required"
done

if [ "$REQUIRE_SENSITIVE" = true ]; then
  if [ ! -f "$SENSITIVE_ARCHIVE" ]; then
    echo "MISSING: $SENSITIVE_ARCHIVE" >&2
    exit 1
  fi
  echo "OK: $SENSITIVE_ARCHIVE"
fi

echo
echo "Snapshot structure looks valid."
