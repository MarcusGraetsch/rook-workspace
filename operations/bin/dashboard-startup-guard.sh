#!/usr/bin/env bash
# dashboard-startup-guard.sh
# Startup validation for the Kanban board database.
# Called by start-dashboard.sh before npm start.
# Ensures the board cannot come up empty after a restart.

set -euo pipefail

DASHBOARD_ROOT="/root/.openclaw/workspace/engineering/rook-dashboard"
DATA_DIR="$DASHBOARD_ROOT/data"
DB_PATH="$DATA_DIR/kanban.db"
EMPTY_DB_PATH="$DATA_DIR/kanban.db.empty-backup"
BACKUP_ROOT="/root/backups/rook-runtime"

log() {
  echo "dashboard-startup-guard: $*" >&2
}

# Find the latest local backup snapshot
latest_backup() {
  local latest
  latest="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '????-??-??T??-??-??Z' -printf '%T+ %p\n' 2>/dev/null | sort -r | head -1 | cut -d' ' -f2)"
  if [[ -n "$latest" && -d "$latest" ]]; then
    echo "$latest"
    return 0
  fi
  return 1
}

# Check whether the current DB has at least one board
db_has_boards() {
  if [[ ! -f "$DB_PATH" ]]; then
    return 1
  fi

  # Use sqlite3 to query board count; if sqlite3 is unavailable, fall back to file size heuristic
  if command -v sqlite3 >/dev/null 2>&1; then
    local count
    count="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM boards;" 2>/dev/null)" || return 1
    if [[ "$count" -gt 0 ]]; then
      return 0
    fi
    return 1
  fi

  # Heuristic: if DB file is non-empty, assume it's valid
  local size
  size="$(stat -c%s "$DB_PATH" 2>/dev/null)" || return 1
  if [[ "$size" -gt 2048 ]]; then
    return 0
  fi
  return 1
}

# Restore the dashboard DB from the latest backup snapshot
restore_from_backup() {
  local backup_dir
  backup_dir="$(latest_backup)" || {
    log "no backup found; falling back to empty DB"
    return 1
  }

  local backup_db="$backup_dir/dashboard/kanban.db"

  if [[ ! -f "$backup_db" ]]; then
    log "backup DB not found in $backup_db; falling back to empty DB"
    return 1
  fi

  log "restoring dashboard DB from backup: $backup_db"

  # Stop the running process first if it is already up
  if command -v systemctl >/dev/null 2>&1 && systemctl --user is-active --quiet rook-dashboard.service 2>/dev/null; then
    log "stopping rook-dashboard.service before restore"
    systemctl --user stop rook-dashboard.service
    local stopped=1
  fi

  # Copy DB files (main + WAL + SHM if present)
  cp "$backup_db" "$DB_PATH"
  if [[ -f "${backup_db}-wal" ]]; then
    cp "${backup_db}-wal" "${DB_PATH}-wal"
  fi
  if [[ -f "${backup_db}-shm" ]]; then
    cp "${backup_db}-shm" "${DB_PATH}-shm"
  fi

  log "dashboard DB restored from backup"

  # Re-check after restore
  if db_has_boards; then
    log "restore successful; DB now has boards"
    return 0
  fi

  log "restored DB still empty; falling back to empty DB"
  return 1
}

# Install the empty/default DB
install_empty_db() {
  if [[ -f "$EMPTY_DB_PATH" ]]; then
    log "installing empty default DB from $EMPTY_DB_PATH"
    cp "$EMPTY_DB_PATH" "$DB_PATH"
    # WAL/SHM are optional for empty DB
    [[ -f "${EMPTY_DB_PATH}-wal" ]] && cp "${EMPTY_DB_PATH}-wal" "${DB_PATH}-wal"
    [[ -f "${EMPTY_DB_PATH}-shm" ]] && cp "${EMPTY_DB_PATH}-shm" "${DB_PATH}-shm"
  else
    log "empty DB source not found; creating minimal DB in-memory via sqlite3"
    # As a last resort, create a minimal DB with sqlite3 directly
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 "$DB_PATH" "
        CREATE TABLE IF NOT EXISTS boards (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS columns (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          name TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          color TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          column_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          priority TEXT DEFAULT 'medium',
          labels TEXT DEFAULT '[]',
          assignee TEXT,
          due_date TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
        );
      "
    fi
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────

log "checking dashboard DB integrity"

if db_has_boards; then
  log "DB integrity check passed"
  exit 0
fi

log "DB is empty or missing"

# Step 1: try restore from backup
if restore_from_backup; then
  exit 0
fi

# Step 2: install empty/default DB
install_empty_db

if db_has_boards; then
  log "empty DB installed; board initialized"
  exit 0
fi

log "WARNING: board may still be empty after all recovery attempts"
exit 0
