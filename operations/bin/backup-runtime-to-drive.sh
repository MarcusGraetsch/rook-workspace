#!/usr/bin/env bash
set -euo pipefail

DATE_UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"

WORKSPACE_ROOT="/root/.openclaw/workspace"
DASHBOARD_ROOT="$WORKSPACE_ROOT/engineering/rook-dashboard"
RUNTIME_ROOT="${ROOK_RUNTIME_ROOT:-/root/.openclaw/runtime}"
RUNTIME_OPERATIONS_ROOT="${ROOK_RUNTIME_OPERATIONS_DIR:-$RUNTIME_ROOT/operations}"
BACKUP_ROOT="/root/backups/rook-runtime"
RUN_DIR="$BACKUP_ROOT/$DATE_UTC"
GDRIVE_REMOTE="${ROOK_GDRIVE_REMOTE:-gdrive:DigitalCapitalismBackups/rook-runtime/$HOSTNAME_SHORT}"
LOCAL_RETENTION_DAYS="${ROOK_RUNTIME_BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$RUN_DIR"
mkdir -p "$RUN_DIR/dashboard"
mkdir -p "$RUN_DIR/operations"
mkdir -p "$RUN_DIR/manifests"

echo "=== Rook Runtime Backup ==="
echo "Timestamp: $DATE_UTC"
echo "Host: $HOSTNAME_SHORT"
echo "Output: $RUN_DIR"
echo

dashboard_db="$DASHBOARD_ROOT/data/kanban.db"
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$dashboard_db" ]; then
  echo "[1/5] Snapshotting dashboard SQLite database..."
  sqlite3 "$dashboard_db" ".backup '$RUN_DIR/dashboard/kanban.db'"
  echo "    Created dashboard/kanban.db"
elif [ -f "$dashboard_db" ]; then
  echo "[1/5] sqlite3 not available, copying dashboard SQLite files directly..."
  cp "$dashboard_db" "$RUN_DIR/dashboard/kanban.db"
  [ -f "$dashboard_db-wal" ] && cp "$dashboard_db-wal" "$RUN_DIR/dashboard/kanban.db-wal"
  [ -f "$dashboard_db-shm" ] && cp "$dashboard_db-shm" "$RUN_DIR/dashboard/kanban.db-shm"
  echo "    Copied dashboard/kanban.db and any WAL/SHM companions"
else
  echo "[1/5] Dashboard SQLite snapshot skipped (sqlite3 missing or DB not found)."
fi

echo "[2/5] Archiving canonical task state..."
tar czf "$RUN_DIR/operations/tasks.tar.gz" \
  -C "$WORKSPACE_ROOT/operations" \
  tasks projects/projects.json
echo "    Created operations/tasks.tar.gz"

echo "[3/5] Archiving runtime health and dispatcher state..."
tar czf "$RUN_DIR/operations/runtime-state.tar.gz" \
  -C "$RUNTIME_OPERATIONS_ROOT" \
  archive/tasks health logs/dispatcher
echo "    Created operations/runtime-state.tar.gz"

echo "[4/5] Writing manifests..."
cat > "$RUN_DIR/manifests/backup-manifest.txt" <<EOF
timestamp_utc=$DATE_UTC
host=$HOSTNAME_SHORT
workspace_root=$WORKSPACE_ROOT
dashboard_root=$DASHBOARD_ROOT
runtime_root=$RUNTIME_ROOT
runtime_operations_root=$RUNTIME_OPERATIONS_ROOT
gdrive_remote=$GDRIVE_REMOTE
EOF

{
  echo "# rook-workspace"
  git -C "$WORKSPACE_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true
  git -C "$WORKSPACE_ROOT" rev-parse HEAD 2>/dev/null || true
  echo
  echo "# rook-dashboard"
  git -C "$DASHBOARD_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true
  git -C "$DASHBOARD_ROOT" rev-parse HEAD 2>/dev/null || true
} > "$RUN_DIR/manifests/git-heads.txt"

{
  echo "# rook-workspace status"
  git -C "$WORKSPACE_ROOT" status --short 2>/dev/null || true
  echo
  echo "# rook-dashboard status"
  git -C "$DASHBOARD_ROOT" status --short 2>/dev/null || true
} > "$RUN_DIR/manifests/git-status.txt"

du -sh "$RUN_DIR" > "$RUN_DIR/manifests/size.txt" 2>/dev/null || true
echo "    Wrote manifests"

echo "[5/5] Syncing to Google Drive..."
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx 'gdrive:'; then
  rclone copy "$RUN_DIR" "$GDRIVE_REMOTE/$DATE_UTC" --create-empty-src-dirs
  echo "    Synced to $GDRIVE_REMOTE/$DATE_UTC"
else
  echo "    Google Drive sync skipped: rclone or gdrive remote not available."
fi

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$LOCAL_RETENTION_DAYS" -exec rm -rf {} +

echo
echo "Backup complete."
echo "Local snapshot: $RUN_DIR"
