#!/usr/bin/env bash
# Agents-Snapshot — tägliches Backup aller Agent-States.
#
# Was es sichert:
# - /root/.openclaw/agents/{*}/agent/   — SQLite-States, Auth-Profiles
# - /root/.openclaw/agents/{*}/sessions/ — Sessions-Historie
# - /root/.openclaw/openclaw.json      — Hauptkonfiguration
# - /root/.openclaw/credentials/       — Bot-Tokens, OAuth, Allow-List
# - /root/.hermes/{auth.json, .env, config.yaml, SOUL.md}
#
# Was NICHT gesichert wird (zu groß oder nicht versionssensitiv):
# - /root/.openclaw/workspace/  — ist in git unter workspace/projects/
# - /root/.openclaw/state/      — wird beim Restart neu aufgebaut
# - /root/.openclaw/telegram/   — Polling-Spool, nicht kritisch
# - /root/.hermes/audio_cache/, cache/, cron/output/  — temporäre Daten
#
# Aufbewahrung: 14 Tage rolling (ältere Snapshots werden gelöscht).
# Pfad: /root/.openclaw/backups/agents-YYYY-MM-DD/
#
# Manueller Lauf:  sudo bash /root/.openclaw/workspace/operations/bin/agents-snapshot.sh
# Cron:           0 6 * * *  /root/.openclaw/workspace/operations/bin/agents-snapshot.sh
#
set -euo pipefail

STAMP=$(date +%Y-%m-%d)
DAY=$(date +%u)  # 1=Montag ... 7=Sonntag
BACKUP_DIR="/root/.openclaw/backups/agents-${STAMP}"
LOG_FILE="/root/.openclaw/backups/snapshot.log"

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"; }

log "=== Snapshot start (stamp=$STAMP) ==="

# --- 1. OpenClaw State (Agents, Configs, Credentials) ---
log "1/3 openclaw-state.tar.gz ..."
cd /root
tar --exclude='workspace' --exclude='state' --exclude='backups' \
    --exclude='telegram' --exclude='runtime' --exclude='cache' --exclude='.cache' \
    --exclude='node_modules' --exclude='*.log' \
    -czf "$BACKUP_DIR/openclaw-state.tar.gz" \
    .openclaw/agents/ .openclaw/openclaw.json .openclaw/credentials/

# --- 2. Hermes-Config ---
log "2/3 hermes-config.tar.gz ..."
cd /root
tar --exclude='.hermes/audio_cache' --exclude='.hermes/cache' \
    --exclude='.hermes/cron/output' --exclude='.hermes/watcher-state' \
    --exclude='.hermes/backups' --exclude='.hermes/checkpoints' \
    -czf "$BACKUP_DIR/hermes-config.tar.gz" \
    .hermes/auth.json .hermes/config.yaml .hermes/.env .hermes/SOUL.md

# --- 3. Manifest mit Checksummen ---
log "3/3 MANIFEST.md ..."
{
  echo "# Agents-Snapshot — ${STAMP}"
  echo ""
  echo "Erstellt: $(date -Iseconds)"
  echo ""
  echo "## Größen"
  echo "- openclaw-state: $(du -h "$BACKUP_DIR/openclaw-state.tar.gz" | cut -f1)"
  echo "- hermes-config:  $(du -h "$BACKUP_DIR/hermes-config.tar.gz" | cut -f1)"
  echo ""
  echo "## Dateien im openclaw-state-Tar"
  echo "Anzahl: $(tar -tzf "$BACKUP_DIR/openclaw-state.tar.gz" | wc -l)"
  echo ""
  echo "## sha256"
  cd "$BACKUP_DIR"
  sha256sum openclaw-state.tar.gz hermes-config.tar.gz
  echo ""
  echo "## Versionen"
  echo "- openclaw: $(npm ls -g openclaw --depth=0 2>/dev/null | grep -oE 'openclaw@[0-9.]+(-[0-9]+)?' | head -1)"
  echo "- node: $(node --version 2>/dev/null || echo n/a)"
  echo "- Kernel: $(uname -r)"
  echo "- Wochentag: ${DAY} (1=Mo ... 7=So)"
} > "$BACKUP_DIR/MANIFEST.md"

# Restore.sh dazulegen (idempotent — gleicher Inhalt wie beim ersten Backup)
cp /root/.openclaw/workspace/operations/bin/agents-restore.sh \
   "$BACKUP_DIR/RESTORE.sh" 2>/dev/null || true

# --- Rolling: älter als 14 Tage löschen ---
DELETED=$(find /root/.openclaw/backups/ -maxdepth 1 -type d -name 'agents-20*' \
          -mtime +14 -printf '%f\n' 2>/dev/null || true)
if [ -n "$DELETED" ]; then
  echo "$DELETED" | while read -r dir; do
    log "Rolling: lösche altes Backup $dir"
    rm -rf "/root/.openclaw/backups/$dir"
  done
fi

log "=== Snapshot fertig: $BACKUP_DIR ==="
log "Total backups: $(ls -d /root/.openclaw/backups/agents-* 2>/dev/null | wc -l)"