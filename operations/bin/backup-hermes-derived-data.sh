#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  backup-hermes-derived-data.sh

Backs up derived Hermes/PKS artifacts only.
Excluded by design:
  - raw import staging under /root/.openclaw/Schleuse
  - raw corpus drops under professional_corpus/originals and professional_corpus/inbox
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ "${1:-}" != "" ]; then
  usage
  exit 1
fi

DATE_UTC="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"
BACKUP_ROOT="${HERMES_DERIVED_BACKUP_ROOT:-/root/backups/hermes-derived}"
RUN_DIR="$BACKUP_ROOT/$DATE_UTC"
RETENTION_DAYS="${HERMES_DERIVED_BACKUP_RETENTION_DAYS:-21}"

HERMES_DATA_ROOT="${HERMES_DATA_ROOT:-/root/.hermes/data}"
PKS_ROOT="${PKS_ROOT:-/root/pks}"

mkdir -p "$RUN_DIR/hermes-data" "$RUN_DIR/pks-derived" "$RUN_DIR/manifests"

echo "=== Hermes Derived Data Backup ==="
echo "Timestamp: $DATE_UTC"
echo "Host: $HOSTNAME_SHORT"
echo "Output: $RUN_DIR"
echo

if [ ! -d "$HERMES_DATA_ROOT" ]; then
  echo "Missing Hermes data root: $HERMES_DATA_ROOT" >&2
  exit 1
fi

if [ ! -d "$PKS_ROOT" ]; then
  echo "Missing PKS root: $PKS_ROOT" >&2
  exit 1
fi

tar czf "$RUN_DIR/hermes-data/hermes-data.tar.gz" \
  -C "$HERMES_DATA_ROOT" .
echo "[1/3] Created hermes-data/hermes-data.tar.gz"

tar czf "$RUN_DIR/pks-derived/pks-derived.tar.gz" \
  --exclude='professional_corpus/collections/*/originals' \
  --exclude='professional_corpus/collections/*/originals/*' \
  --exclude='professional_corpus/collections/*/inbox' \
  --exclude='professional_corpus/collections/*/inbox/*' \
  --exclude='professional_corpus/analysis_tmp' \
  --exclude='professional_corpus/analysis_tmp/*' \
  --exclude='professional_corpus/indexes/backups' \
  --exclude='professional_corpus/indexes/backups/*' \
  -C "$PKS_ROOT" \
  data professional_corpus
echo "[2/3] Created pks-derived/pks-derived.tar.gz"

cat > "$RUN_DIR/manifests/backup-manifest.txt" <<EOF
timestamp_utc=$DATE_UTC
host=$HOSTNAME_SHORT
backup_type=hermes_derived_data
hermes_data_root=$HERMES_DATA_ROOT
pks_root=$PKS_ROOT
excluded=/root/.openclaw/Schleuse
excluded=professional_corpus/collections/*/originals
excluded=professional_corpus/collections/*/inbox
EOF

{
  echo "# size"
  du -sh "$RUN_DIR" 2>/dev/null || true
  echo
  echo "# artifacts"
  ls -lh "$RUN_DIR/hermes-data" "$RUN_DIR/pks-derived" 2>/dev/null || true
} > "$RUN_DIR/manifests/size.txt"

echo "[3/3] Wrote manifests"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

echo
echo "Backup complete."
echo "Local snapshot: $RUN_DIR"
