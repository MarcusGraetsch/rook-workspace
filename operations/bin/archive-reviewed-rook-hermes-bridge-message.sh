#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  archive-reviewed-rook-hermes-bridge-message.sh [--dry-run] <json-file>

Validates that a bridge payload is approved for archival and then copies it
into the configured archive directory.
EOF
}

DRY_RUN=false

if [ "$#" -eq 2 ] && [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  shift
elif [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

SOURCE_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE_SCRIPT="$SCRIPT_DIR/gate-rook-hermes-bridge-archive.sh"
ARCHIVE_DIR="${ROOK_HERMES_BRIDGE_ARCHIVE_DIR:-/root/rook-phoenix-comm/archive/reviewed}"
BASENAME="$(basename "$SOURCE_FILE")"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
TARGET_FILE="$ARCHIVE_DIR/$STAMP-$BASENAME"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Source file not found: $SOURCE_FILE" >&2
  exit 1
fi

if [ ! -x "$GATE_SCRIPT" ]; then
  echo "Archive gate missing or not executable: $GATE_SCRIPT" >&2
  exit 1
fi

"$GATE_SCRIPT" "$SOURCE_FILE" >/dev/null

echo "=== Bridge Archive Flow ==="
echo "Source: $SOURCE_FILE"
echo "Archive dir: $ARCHIVE_DIR"
echo "Dry run: $DRY_RUN"
echo

if [ "$DRY_RUN" = true ]; then
  echo "Would copy approved payload to: $TARGET_FILE"
  exit 0
fi

mkdir -p "$ARCHIVE_DIR"
cp "$SOURCE_FILE" "$TARGET_FILE"
echo "Archived approved payload to: $TARGET_FILE"
