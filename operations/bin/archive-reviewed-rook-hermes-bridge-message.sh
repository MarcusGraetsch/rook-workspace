#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  archive-reviewed-rook-hermes-bridge-message.sh [--dry-run] <json-file>

Validates that a bridge payload is approved for archival and then copies it
into the configured archive directory and updates a small archive manifest.
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
MANIFEST_FILE="$ARCHIVE_DIR/archive-manifest.jsonl"

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
echo "Manifest: $MANIFEST_FILE"
echo "Dry run: $DRY_RUN"
echo

if [ "$DRY_RUN" = true ]; then
  echo "Would copy approved payload to: $TARGET_FILE"
  echo "Would append manifest entry to: $MANIFEST_FILE"
  exit 0
fi

mkdir -p "$ARCHIVE_DIR"
cp "$SOURCE_FILE" "$TARGET_FILE"
python3 - "$SOURCE_FILE" "$TARGET_FILE" "$STAMP" >> "$MANIFEST_FILE" <<'PY'
import json
import sys
from pathlib import Path

source_file = Path(sys.argv[1])
target_file = Path(sys.argv[2])
archived_at = sys.argv[3]
payload = json.loads(source_file.read_text())

entry = {
    "archived_at": archived_at,
    "source_file": str(source_file),
    "archived_file": str(target_file),
    "message_id": payload.get("message_id"),
    "source_system": payload.get("source_system"),
    "target_system": payload.get("target_system"),
    "topic": payload.get("topic"),
    "purpose": payload.get("purpose"),
    "review_status": payload.get("review_status"),
    "reviewed_by": payload.get("reviewed_by"),
    "reviewed_at": payload.get("reviewed_at"),
}
print(json.dumps(entry, sort_keys=True))
PY
echo "Archived approved payload to: $TARGET_FILE"
echo "Updated manifest: $MANIFEST_FILE"
