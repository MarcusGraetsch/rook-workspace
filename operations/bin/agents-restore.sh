#!/usr/bin/env bash
# Restore-Script — wird vom Snapshot-Script mitkopiert.
# Liegt jeweils unter /root/.openclaw/backups/agents-YYYY-MM-DD/RESTORE.sh
#
# Usage:  sudo bash RESTORE.sh
#
# Was es tut:
# 1. Stoppt den openclaw-gateway Service
# 2. Sichert die aktuellen (kaputten) Configs als .broken-<timestamp>
# 3. Spielt openclaw-state und hermes-config aus dem aktuellen Verzeichnis zurück
# 4. Repariert Permissions
# 5. Startet den Service wieder
#
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)"
TS=$(date +%s)
echo "[$(date -Iseconds)] Restore aus $BACKUP_DIR"

# Sanity-Check
if [[ ! -f "$BACKUP_DIR/openclaw-state.tar.gz" ]] || [[ ! -f "$BACKUP_DIR/hermes-config.tar.gz" ]]; then
  echo "FEHLER: tar.gz-Dateien fehlen in $BACKUP_DIR"
  exit 1
fi

echo "[1/5] Service stoppen..."
sudo systemctl stop openclaw-gateway || true

echo "[2/5] Aktuelle Configs sichern (vorsichtshalber)..."
[[ -f /root/.openclaw/openclaw.json ]] && sudo mv /root/.openclaw/openclaw.json /root/.openclaw/openclaw.json.broken-$TS || true
[[ -d /root/.openclaw/credentials ]] && sudo mv /root/.openclaw/credentials /root/.openclaw/credentials.broken-$TS || true
[[ -f /root/.hermes/auth.json ]] && sudo mv /root/.hermes/auth.json /root/.hermes/auth.json.broken-$TS || true
[[ -f /root/.hermes/.env ]] && sudo mv /root/.hermes/.env /root/.hermes/.env.broken-$TS || true

echo "[3/5] OpenClaw State zurückspielen..."
cd /root
sudo tar -xzf "$BACKUP_DIR/openclaw-state.tar.gz" -C /

echo "[4/5] Hermes-Config zurückspielen..."
sudo tar -xzf "$BACKUP_DIR/hermes-config.tar.gz" -C /

echo "[5/5] Permissions reparieren + Service starten..."
sudo chown -R root:root /root/.openclaw/agents /root/.openclaw/credentials
sudo chown root:root /root/.openclaw/openclaw.json /root/.hermes/auth.json /root/.hermes/config.yaml /root/.hermes/.env /root/.hermes/SOUL.md
sudo chmod 600 /root/.hermes/auth.json /root/.hermes/.env
sudo chmod 600 /root/.openclaw/credentials/*

sudo systemctl start openclaw-gateway
sleep 10
sudo systemctl status openclaw-gateway --no-pager | head -10

echo ""
echo "Restore fertig. Wenn 'active (running)' → fertig."