#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  backup-hermes-runtime.sh [--include-sensitive-auth]

Default behavior:
  - backs up core Hermes runtime state
  - excludes auth-bearing files by default

Sensitive auth files are included only with:
  --include-sensitive-auth
EOF
}

INCLUDE_SENSITIVE=false
if [ "${1:-}" = "--include-sensitive-auth" ]; then
  INCLUDE_SENSITIVE=true
elif [ "${1:-}" != "" ]; then
  usage
  exit 1
fi

DATE_UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"
HERMES_ROOT="${HERMES_ROOT:-/root/.hermes}"
BRIDGE_ROOT="${HERMES_BRIDGE_ROOT:-/root/rook-phoenix-comm}"
SYNC_BRIDGE_ROOT="${HERMES_SYNC_BRIDGE_ROOT:-/root/sync-bridge}"
BACKUP_ROOT="${HERMES_BACKUP_ROOT:-/root/backups/hermes-runtime}"
RUN_DIR="$BACKUP_ROOT/$DATE_UTC"
RETENTION_DAYS="${HERMES_RUNTIME_BACKUP_RETENTION_DAYS:-14}"
BRIDGE_PARENT="$(dirname "$BRIDGE_ROOT")"
BRIDGE_NAME="$(basename "$BRIDGE_ROOT")"
SYNC_BRIDGE_PARENT="$(dirname "$SYNC_BRIDGE_ROOT")"
SYNC_BRIDGE_NAME="$(basename "$SYNC_BRIDGE_ROOT")"

mkdir -p "$RUN_DIR/core"
mkdir -p "$RUN_DIR/bridge"
mkdir -p "$RUN_DIR/manifests"

echo "=== Hermes Runtime Backup ==="
echo "Timestamp: $DATE_UTC"
echo "Host: $HOSTNAME_SHORT"
echo "Include sensitive auth: $INCLUDE_SENSITIVE"
echo "Output: $RUN_DIR"
echo

tar czf "$RUN_DIR/core/runtime-core.tar.gz" \
  -C "$HERMES_ROOT" \
  config.yaml state.db kanban.db memories logs scripts skills channel_directory.json system-knowledge.md
echo "[1/3] Created core/runtime-core.tar.gz"

tar czf "$RUN_DIR/bridge/bridge-state.tar.gz" \
  -C "$BRIDGE_PARENT" "$BRIDGE_NAME" \
  -C "$SYNC_BRIDGE_PARENT" "$SYNC_BRIDGE_NAME"
echo "[2/3] Created bridge/bridge-state.tar.gz"

if [ "$INCLUDE_SENSITIVE" = true ]; then
  tar czf "$RUN_DIR/core/runtime-sensitive-auth.tar.gz" \
    -C "$HERMES_ROOT" \
    .env .discord_token auth.json google_client_secret.json google_oauth_pending.json processes.json
  echo "[2b/3] Created core/runtime-sensitive-auth.tar.gz"
fi

cat > "$RUN_DIR/manifests/backup-manifest.txt" <<EOF
timestamp_utc=$DATE_UTC
host=$HOSTNAME_SHORT
hermes_root=$HERMES_ROOT
bridge_root=$BRIDGE_ROOT
sync_bridge_root=$SYNC_BRIDGE_ROOT
include_sensitive_auth=$INCLUDE_SENSITIVE
EOF

{
  echo "# hermes git"
  git -C "$HERMES_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true
  git -C "$HERMES_ROOT" rev-parse HEAD 2>/dev/null || true
  echo
  echo "# hermes status"
  git -C "$HERMES_ROOT" status --short 2>/dev/null || true
} > "$RUN_DIR/manifests/git-state.txt"

du -sh "$RUN_DIR" > "$RUN_DIR/manifests/size.txt" 2>/dev/null || true
echo "[3/3] Wrote manifests"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

echo
echo "Backup complete."
echo "Local snapshot: $RUN_DIR"
