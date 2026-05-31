#!/bin/bash
# etcd-Snapshot-Cron für KIND-Cluster "rook-lab"
# P1-R1 aus impl-plan-rook-und-phoenix.md
# Erstellt: 2026-05-08

set -euo pipefail

LOCK_FILE="/tmp/etcd-kind-backup.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Another etcd kind backup is already running; exiting."
    exit 0
fi

# Konfiguration
CLUSTER_NAME="rook-lab"
BACKUP_DIR="/var/backups/etcd-kind"
RETENTION_DAYS=14
RCLONE_REMOTE="gdrive:DigitalCapitalismBackups/etcd-kind"
ETCD_ENDPOINT="https://172.18.0.2:2379"
CERT_DIR="/etc/etcd-backup/certs"

# Timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="etcd-snapshot-${TIMESTAMP}.db"
SNAPSHOT_PATH="${BACKUP_DIR}/${SNAPSHOT_FILE}"

# Logging
LOG_FILE="${BACKUP_DIR}/snapshot.log"
exec 1>>"${LOG_FILE}"
exec 2>&1

echo "=== etcd Snapshot ${TIMESTAMP} ==="

# Snapshot erstellen
mkdir -p "${BACKUP_DIR}"
ETCDCTL_API=3 /usr/local/bin/etcdctl-v3 \
    --endpoints="${ETCD_ENDPOINT}" \
    --cacert="${CERT_DIR}/ca.crt" \
    --cert="${CERT_DIR}/server.crt" \
    --key="${CERT_DIR}/server.key" \
    snapshot save "${SNAPSHOT_PATH}"

# Snapshot-Status prüfen
if [ ! -f "${SNAPSHOT_PATH}" ]; then
    echo "ERROR: Snapshot nicht erstellt"
    exit 1
fi

SIZE=$(du -h "${SNAPSHOT_PATH}" | cut -f1)
echo "Snapshot erstellt: ${SNAPSHOT_FILE} (${SIZE})"

# Alte Snapshots löschen (Retention)
DELETED=$(find "${BACKUP_DIR}" -name "etcd-snapshot-*.db" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "Alte Snapshots gelöscht: ${DELETED}"

# Off-site via rclone
if command -v rclone >/dev/null 2>&1; then
    echo "Upload zu ${RCLONE_REMOTE} ..."
    rclone copy "${SNAPSHOT_PATH}" "${RCLONE_REMOTE}/" --progress=false
    echo "Upload abgeschlossen"
    
    # Remote-Retention (älter als 14 Tage)
    rclone delete "${RCLONE_REMOTE}" --min-age ${RETENTION_DAYS}d --include "etcd-snapshot-*.db"
    echo "Remote-Retention durchgeführt"
else
    echo "WARN: rclone nicht verfügbar, kein Off-site-Upload"
fi

echo "=== Snapshot ${TIMESTAMP} abgeschlossen ==="
echo ""
