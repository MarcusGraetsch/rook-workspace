#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  restore-hermes-runtime.sh --from-local <backup_dir> [--include-sensitive-auth] [--dry-run]
  restore-hermes-runtime.sh --from-gdrive <host>/<timestamp> [--include-sensitive-auth] [--dry-run]

This restores Hermes runtime data from a snapshot created by:
  operations/bin/backup-hermes-runtime.sh

Default behavior:
  - restores core runtime archive
  - restores bridge archive
  - does not restore restricted auth files unless --include-sensitive-auth is set
  - prints planned steps only when --dry-run is set
EOF
}

if [ "$#" -lt 2 ] || [ "$#" -gt 4 ]; then
  usage
  exit 1
fi

MODE="$1"
SOURCE="$2"
INCLUDE_SENSITIVE=false
DRY_RUN=false
TMP_ROOT="${HERMES_RUNTIME_RESTORE_TMP:-/tmp/hermes-runtime-restore}"
GDRIVE_BASE="${HERMES_RUNTIME_GDRIVE_BASE:-gdrive:DigitalCapitalismBackups/hermes-runtime}"
HERMES_ROOT="${HERMES_ROOT:-/root/.hermes}"
ROOT_HOME="${RESTORE_ROOT_HOME:-/root}"

for arg in "${3:-}" "${4:-}"; do
  if [ "$arg" = "" ]; then
    continue
  fi
  case "$arg" in
    --include-sensitive-auth)
      INCLUDE_SENSITIVE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

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
      echo "=== Hermes Runtime Restore ==="
      echo "Source mode: gdrive"
      echo "Dry run: true"
      echo "Would copy from $GDRIVE_BASE/$SOURCE to $RESTORE_DIR"
      echo "Would restore runtime into $HERMES_ROOT and bridge into $ROOT_HOME"
      if [ "$INCLUDE_SENSITIVE" = true ]; then
        echo "Would include sensitive auth restore"
      fi
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
echo "Dry run: $DRY_RUN"
echo

mkdir -p "$HERMES_ROOT"

echo "[1/3] Restoring Hermes core runtime..."
if [ "$DRY_RUN" = true ]; then
  echo "    Would extract $CORE_ARCHIVE into $HERMES_ROOT"
else
  tar xzf "$CORE_ARCHIVE" -C "$HERMES_ROOT"
fi
echo "    Restored core runtime data into $HERMES_ROOT"

echo "[2/3] Restoring bridge state..."
if [ "$DRY_RUN" = true ]; then
  echo "    Would extract $BRIDGE_ARCHIVE into $ROOT_HOME"
else
  tar xzf "$BRIDGE_ARCHIVE" -C "$ROOT_HOME"
fi
echo "    Restored bridge directories under $ROOT_HOME"

if [ "$INCLUDE_SENSITIVE" = true ]; then
  if [ ! -f "$SENSITIVE_ARCHIVE" ]; then
    echo "Sensitive auth archive requested but missing: $SENSITIVE_ARCHIVE" >&2
    exit 1
  fi
  echo "[3/3] Restoring restricted auth files..."
  if [ "$DRY_RUN" = true ]; then
    echo "    Would extract $SENSITIVE_ARCHIVE into $HERMES_ROOT"
  else
    tar xzf "$SENSITIVE_ARCHIVE" -C "$HERMES_ROOT"
  fi
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
