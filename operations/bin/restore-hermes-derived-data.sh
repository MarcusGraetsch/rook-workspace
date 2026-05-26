#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  restore-hermes-derived-data.sh --from-local <backup_dir> [--dry-run]
  restore-hermes-derived-data.sh --from-gdrive <host>/<timestamp> [--dry-run]

Restores derived Hermes/PKS artifacts from a snapshot created by:
  operations/bin/backup-hermes-derived-data.sh
EOF
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  usage
  exit 1
fi

MODE="$1"
SOURCE="$2"
DRY_RUN=false
TMP_ROOT="${HERMES_DERIVED_RESTORE_TMP:-/tmp/hermes-derived-restore}"
GDRIVE_BASE="${HERMES_DERIVED_GDRIVE_BASE:-gdrive:DigitalCapitalismBackups/hermes-derived}"
HERMES_DATA_ROOT="${HERMES_DATA_ROOT:-/root/.hermes/data}"
PKS_ROOT="${PKS_ROOT:-/root/pks}"

if [ "${3:-}" = "--dry-run" ]; then
  DRY_RUN=true
elif [ "${3:-}" != "" ]; then
  usage
  exit 1
fi

case "$MODE" in
  --from-local)
    RESTORE_DIR="$SOURCE"
    ;;
  --from-gdrive)
    if ! command -v rclone >/dev/null 2>&1; then
      echo "rclone is required for --from-gdrive restores." >&2
      exit 1
    fi
    mkdir -p "$TMP_ROOT"
    RESTORE_DIR="$TMP_ROOT/$(basename "$SOURCE")"
    rm -rf "$RESTORE_DIR"
    mkdir -p "$RESTORE_DIR"
    if [ "$DRY_RUN" = true ]; then
      echo "=== Hermes Derived Data Restore ==="
      echo "Source mode: gdrive"
      echo "Dry run: true"
      echo "Would copy from $GDRIVE_BASE/$SOURCE to $RESTORE_DIR"
      echo "Would restore into $HERMES_DATA_ROOT and $PKS_ROOT"
      exit 0
    else
      rclone copy "$GDRIVE_BASE/$SOURCE" "$RESTORE_DIR" --create-empty-src-dirs
    fi
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

HERMES_ARCHIVE="$RESTORE_DIR/hermes-data/hermes-data.tar.gz"
PKS_ARCHIVE="$RESTORE_DIR/pks-derived/pks-derived.tar.gz"

if [ ! -f "$HERMES_ARCHIVE" ]; then
  echo "Missing archive: $HERMES_ARCHIVE" >&2
  exit 1
fi

if [ ! -f "$PKS_ARCHIVE" ]; then
  echo "Missing archive: $PKS_ARCHIVE" >&2
  exit 1
fi

echo "=== Hermes Derived Data Restore ==="
echo "Source: $RESTORE_DIR"
echo "Dry run: $DRY_RUN"
echo

mkdir -p "$HERMES_DATA_ROOT" "$PKS_ROOT"

echo "[1/2] Restoring Hermes derived data..."
if [ "$DRY_RUN" = true ]; then
  echo "    Would extract $HERMES_ARCHIVE into $HERMES_DATA_ROOT"
else
  tar xzf "$HERMES_ARCHIVE" -C "$HERMES_DATA_ROOT"
fi
echo "    Hermes data restore step complete"

echo "[2/2] Restoring PKS derived artifacts..."
if [ "$DRY_RUN" = true ]; then
  echo "    Would extract $PKS_ARCHIVE into $PKS_ROOT"
else
  tar xzf "$PKS_ARCHIVE" -C "$PKS_ROOT"
fi
echo "    PKS restore step complete"

echo
echo "Restore complete."
