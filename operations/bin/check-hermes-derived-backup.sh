#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  check-hermes-derived-backup.sh <backup_dir>

Checks whether a derived Hermes/PKS backup snapshot contains the expected files.
EOF
}

if [ "$#" -ne 1 ]; then
  usage
  exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Missing backup directory: $BACKUP_DIR" >&2
  exit 1
fi

HERMES_ARCHIVE="$BACKUP_DIR/hermes-data/hermes-data.tar.gz"
PKS_ARCHIVE="$BACKUP_DIR/pks-derived/pks-derived.tar.gz"
MANIFEST="$BACKUP_DIR/manifests/backup-manifest.txt"
SIZE_FILE="$BACKUP_DIR/manifests/size.txt"

echo "=== Hermes Derived Backup Snapshot Check ==="
echo "Backup dir: $BACKUP_DIR"
echo

for required in "$HERMES_ARCHIVE" "$PKS_ARCHIVE" "$MANIFEST" "$SIZE_FILE"; do
  if [ ! -f "$required" ]; then
    echo "MISSING: $required" >&2
    exit 1
  fi
  echo "OK: $required"
done

echo
echo "Snapshot structure looks valid."
