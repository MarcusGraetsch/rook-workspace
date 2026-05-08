#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  restore-hermes-runtime.sh --from-local <backup_dir> [--include-sensitive-auth]

This restores Hermes runtime data from a snapshot created by:
  operations/bin/backup-hermes-runtime.sh

Default behavior:
  - restores core runtime archive
  - restores bridge archive
  - does not restore restricted auth files unless --include-sensitive-auth is set
EOF
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 1
fi

MODE="$1"
SOURCE="$2"
INCLUDE_SENSITIVE=false

if [ "${3:-}" = "--include-sensitive-auth" ]; then
  INCLUDE_SENSITIVE=true
elif [ "${3:-}" != "" ]; then
  usage
  exit 1
fi

if [ "$MODE" != "--from-local" ]; then
  usage
  exit 1
fi

RESTORE_DIR="$SOURCE"
HERMES_ROOT="${HERMES_ROOT:-/root/.hermes}"
ROOT_HOME="/root"

if [ ! -d "$RESTORE_DIR" ]; then
  echo "Restore source not found: $RESTORE_DIR" >&2
  exit 1
fi

CORE_ARCHIVE="$RESTORE_DIR/core/runtime-core.tar.gz"
BRIDGE_ARCHIVE="$RESTORE_DIR/bridge/bridge-state.tar.gz"
SENSITIVE_ARCHIVE="$RESTORE_DIR/core/runtime-sensitive-auth.tar.gz"

if [ ! -f "$CORE_ARCHIVE" ]; then
  echo "Missing core archive: $CORE_ARCHIVE" >&2
  exit 1
fi

if [ ! -f "$BRIDGE_ARCHIVE" ]; then
  echo "Missing bridge archive: $BRIDGE_ARCHIVE" >&2
  exit 1
fi

echo "=== Hermes Runtime Restore ==="
echo "Source: $RESTORE_DIR"
echo "Include sensitive auth: $INCLUDE_SENSITIVE"
echo

mkdir -p "$HERMES_ROOT"

echo "[1/3] Restoring Hermes core runtime..."
tar xzf "$CORE_ARCHIVE" -C "$HERMES_ROOT"
echo "    Restored core runtime data into $HERMES_ROOT"

echo "[2/3] Restoring bridge state..."
tar xzf "$BRIDGE_ARCHIVE" -C "$ROOT_HOME"
echo "    Restored bridge directories under /root"

if [ "$INCLUDE_SENSITIVE" = true ]; then
  if [ ! -f "$SENSITIVE_ARCHIVE" ]; then
    echo "Sensitive auth archive requested but missing: $SENSITIVE_ARCHIVE" >&2
    exit 1
  fi
  echo "[3/3] Restoring restricted auth files..."
  tar xzf "$SENSITIVE_ARCHIVE" -C "$HERMES_ROOT"
  echo "    Restored restricted auth files into $HERMES_ROOT"
else
  echo "[3/3] Restricted auth restore skipped"
fi

echo
echo "Restore complete."
echo "Next checks:"
echo "  - verify Hermes runtime startup"
echo "  - verify bridge directories and cron path"
echo "  - re-authorize tokens where safer than restoring stale auth"
