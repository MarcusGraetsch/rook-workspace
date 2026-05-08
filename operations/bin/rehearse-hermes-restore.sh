#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  rehearse-hermes-restore.sh

Creates a disposable Hermes-like tree, runs backup, checks the snapshot,
performs a dry-run restore, performs a real restore into a disposable target,
and verifies a few expected files.
EOF
}

if [ "$#" -ne 0 ]; then
  usage
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-hermes-runtime.sh"
CHECK_SCRIPT="$SCRIPT_DIR/check-hermes-restore-snapshot.sh"
RESTORE_SCRIPT="$SCRIPT_DIR/restore-hermes-runtime.sh"

for required in "$BACKUP_SCRIPT" "$CHECK_SCRIPT" "$RESTORE_SCRIPT"; do
  if [ ! -x "$required" ]; then
    echo "Required executable missing: $required" >&2
    exit 1
  fi
done

WORK_ROOT="$(mktemp -d /tmp/hermes-restore-rehearsal.XXXXXX)"
cleanup() {
  rm -rf "$WORK_ROOT"
}
trap cleanup EXIT

SOURCE_ROOT="$WORK_ROOT/source-hermes"
BRIDGE_ROOT="$WORK_ROOT/rook-phoenix-comm"
SYNC_BRIDGE_ROOT="$WORK_ROOT/sync-bridge"
BACKUP_ROOT="$WORK_ROOT/backups"
RESTORE_BASE="$WORK_ROOT/restore-root"
RESTORE_HERMES_ROOT="$RESTORE_BASE/.hermes"

mkdir -p \
  "$SOURCE_ROOT/memories" \
  "$SOURCE_ROOT/logs" \
  "$SOURCE_ROOT/scripts" \
  "$SOURCE_ROOT/skills" \
  "$BRIDGE_ROOT/inbox" \
  "$BRIDGE_ROOT/outbox" \
  "$BRIDGE_ROOT/archive" \
  "$SYNC_BRIDGE_ROOT"

cat > "$SOURCE_ROOT/config.yaml" <<'EOF'
profile: rehearsal
mode: test
EOF
printf 'synthetic-state\n' > "$SOURCE_ROOT/state.db"
printf 'synthetic-kanban\n' > "$SOURCE_ROOT/kanban.db"
printf 'memory-seed\n' > "$SOURCE_ROOT/memories/summary.txt"
printf 'log-seed\n' > "$SOURCE_ROOT/logs/runtime.log"
printf '#!/usr/bin/env bash\necho test\n' > "$SOURCE_ROOT/scripts/bridge.sh"
chmod +x "$SOURCE_ROOT/scripts/bridge.sh"
printf 'skill: test\n' > "$SOURCE_ROOT/skills/example.txt"
cat > "$SOURCE_ROOT/channel_directory.json" <<'EOF'
{"channels":["bridge-test"]}
EOF
printf '# system knowledge\n' > "$SOURCE_ROOT/system-knowledge.md"

printf 'bridge-inbox\n' > "$BRIDGE_ROOT/inbox/message-001.txt"
printf 'bridge-outbox\n' > "$BRIDGE_ROOT/outbox/message-001.txt"
printf 'bridge-archive\n' > "$BRIDGE_ROOT/archive/message-001.txt"
printf 'sync-marker\n' > "$SYNC_BRIDGE_ROOT/state.txt"

echo "=== Hermes Restore Rehearsal ==="
echo "Work root: $WORK_ROOT"
echo

HERMES_ROOT="$SOURCE_ROOT" \
HERMES_BRIDGE_ROOT="$BRIDGE_ROOT" \
HERMES_SYNC_BRIDGE_ROOT="$SYNC_BRIDGE_ROOT" \
HERMES_BACKUP_ROOT="$BACKUP_ROOT" \
"$BACKUP_SCRIPT"

SNAPSHOT_DIR="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$SNAPSHOT_DIR" ]; then
  echo "No rehearsal snapshot created." >&2
  exit 1
fi

"$CHECK_SCRIPT" "$SNAPSHOT_DIR"

HERMES_ROOT="$RESTORE_HERMES_ROOT" \
RESTORE_ROOT_HOME="$RESTORE_BASE" \
"$RESTORE_SCRIPT" --from-local "$SNAPSHOT_DIR" --dry-run

HERMES_ROOT="$RESTORE_HERMES_ROOT" \
RESTORE_ROOT_HOME="$RESTORE_BASE" \
"$RESTORE_SCRIPT" --from-local "$SNAPSHOT_DIR"

for expected in \
  "$RESTORE_HERMES_ROOT/config.yaml" \
  "$RESTORE_HERMES_ROOT/state.db" \
  "$RESTORE_HERMES_ROOT/memories/summary.txt" \
  "$RESTORE_BASE/rook-phoenix-comm/inbox/message-001.txt" \
  "$RESTORE_BASE/sync-bridge/state.txt"; do
  if [ ! -f "$expected" ]; then
    echo "Restore rehearsal verification failed: missing $expected" >&2
    exit 1
  fi
done

echo
echo "Restore rehearsal complete."
echo "Verified restore into disposable root: $RESTORE_BASE"
