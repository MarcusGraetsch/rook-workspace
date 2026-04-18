#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  restore-runtime-backup.sh --from-local <backup_dir>
  restore-runtime-backup.sh --from-gdrive <host>/<timestamp>

Examples:
  restore-runtime-backup.sh --from-local /root/backups/rook-runtime/2026-04-01T14-57-42Z
  restore-runtime-backup.sh --from-gdrive vmd151897/2026-04-01T14-57-42Z

This script restores:
  - dashboard SQLite files
  - canonical tasks and archived tasks
  - project registry
  - health snapshots
  - dispatcher logs
  - archived runtime task overlays

Run it while `rook-dashboard.service` and `rook-dispatcher.timer` are stopped.
EOF
}

if [ "$#" -ne 2 ]; then
  usage
  exit 1
fi

MODE="$1"
SOURCE="$2"

WORKSPACE_ROOT="/root/.openclaw/workspace"
OPERATIONS_ROOT="$WORKSPACE_ROOT/operations"
RUNTIME_ROOT="${ROOK_RUNTIME_ROOT:-/root/.openclaw/runtime}"
RUNTIME_OPERATIONS_ROOT="${ROOK_RUNTIME_OPERATIONS_DIR:-$RUNTIME_ROOT/operations}"
DASHBOARD_DATA_DIR="$WORKSPACE_ROOT/engineering/rook-dashboard/data"
TMP_ROOT="/tmp/rook-runtime-restore"
GDRIVE_BASE="${ROOK_GDRIVE_REMOTE_BASE:-gdrive:DigitalCapitalismBackups/rook-runtime}"

case "$MODE" in
  --from-local)
    RESTORE_DIR="$SOURCE"
    ;;
  --from-gdrive)
    mkdir -p "$TMP_ROOT"
    RESTORE_DIR="$TMP_ROOT/$(basename "$SOURCE")"
    rm -rf "$RESTORE_DIR"
    mkdir -p "$RESTORE_DIR"
    if ! command -v rclone >/dev/null 2>&1; then
      echo "rclone is required for --from-gdrive restores." >&2
      exit 1
    fi
    rclone copy "$GDRIVE_BASE/$SOURCE" "$RESTORE_DIR" --create-empty-src-dirs
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [ ! -d "$RESTORE_DIR" ]; then
  echo "Restore source not found: $RESTORE_DIR" >&2
  exit 1
fi

echo "=== Rook Runtime Restore ==="
echo "Source: $RESTORE_DIR"
echo

mkdir -p "$DASHBOARD_DATA_DIR"
mkdir -p "$RUNTIME_OPERATIONS_ROOT"
if [ -f "$RESTORE_DIR/dashboard/kanban.db" ]; then
  cp "$RESTORE_DIR/dashboard/kanban.db" "$DASHBOARD_DATA_DIR/kanban.db"
  [ -f "$RESTORE_DIR/dashboard/kanban.db-wal" ] && cp "$RESTORE_DIR/dashboard/kanban.db-wal" "$DASHBOARD_DATA_DIR/kanban.db-wal"
  [ -f "$RESTORE_DIR/dashboard/kanban.db-shm" ] && cp "$RESTORE_DIR/dashboard/kanban.db-shm" "$DASHBOARD_DATA_DIR/kanban.db-shm"
  echo "Restored dashboard SQLite files."
else
  echo "Dashboard SQLite files not found in backup snapshot; skipping."
fi

if [ -f "$RESTORE_DIR/operations/tasks.tar.gz" ]; then
  tar xzf "$RESTORE_DIR/operations/tasks.tar.gz" -C "$WORKSPACE_ROOT/operations"
  echo "Restored canonical task state."
else
  echo "Task archive missing; skipping canonical task restore."
fi

if [ -f "$RESTORE_DIR/operations/runtime-state.tar.gz" ]; then
  tar xzf "$RESTORE_DIR/operations/runtime-state.tar.gz" -C "$RUNTIME_OPERATIONS_ROOT"
  echo "Restored runtime health and dispatcher logs."
else
  echo "Runtime state archive missing; skipping health/log restore."
fi

echo
echo "Restore complete."
