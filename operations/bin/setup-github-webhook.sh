#!/usr/bin/env bash
# setup-github-webhook.sh
#
# Einmalig ausführen um den GitHub-Webhook-Handler einzurichten.
# Zwei Modi: smee.io (einfach) oder Tailscale (Production).
#
# Usage: ./setup-github-webhook.sh [smee|tailscale]

set -euo pipefail

MODE="${1:-smee}"
ENV_DIR="/root/.openclaw/.env.d"
mkdir -p "$ENV_DIR"

echo "=== GitHub Webhook Setup ($MODE) ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Webhook Secret generieren (falls noch nicht vorhanden)
# ---------------------------------------------------------------------------
SECRET_FILE="$ENV_DIR/webhook-secret.txt"
if [[ ! -f "$SECRET_FILE" ]]; then
  SECRET=$(openssl rand -hex 32)
  echo "GITHUB_WEBHOOK_SECRET=$SECRET" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "✅ Webhook Secret generiert: $SECRET_FILE"
else
  echo "✅ Webhook Secret bereits vorhanden: $SECRET_FILE"
  SECRET=$(grep GITHUB_WEBHOOK_SECRET "$SECRET_FILE" | cut -d= -f2)
fi

echo ""

# ---------------------------------------------------------------------------
# 2. systemd Service aktivieren
# ---------------------------------------------------------------------------
systemctl --user daemon-reload
systemctl --user enable github-webhook.service
systemctl --user start github-webhook.service
sleep 1
if systemctl --user is-active github-webhook.service >/dev/null 2>&1; then
  echo "✅ github-webhook.service läuft auf Port 9876"
else
  echo "❌ github-webhook.service gestartet nicht. Logs:"
  journalctl --user -u github-webhook.service -n 10 --no-pager
  exit 1
fi

echo ""

# ---------------------------------------------------------------------------
# 3. Modus-spezifisches Setup
# ---------------------------------------------------------------------------
if [[ "$MODE" == "smee" ]]; then
  echo "--- smee.io Modus ---"
  echo ""
  echo "1. Öffne https://smee.io/new in deinem Browser"
  echo "2. Kopiere die URL (z.B. https://smee.io/AbCdEfGhIjKlMnOp)"
  echo ""
  read -r -p "Smee URL eingeben: " SMEE_URL

  echo "SMEE_URL=$SMEE_URL" > "$ENV_DIR/smee-url.txt"
  chmod 600 "$ENV_DIR/smee-url.txt"

  systemctl --user enable smee-webhook-proxy.service
  systemctl --user start smee-webhook-proxy.service
  sleep 2

  echo ""
  echo "✅ smee-webhook-proxy.service läuft"
  echo ""
  echo "=== GitHub Webhook konfigurieren ==="
  echo ""
  echo "In jedem GitHub-Repo das du tracken willst:"
  echo "  Settings → Webhooks → Add webhook"
  echo ""
  echo "  Payload URL:    $SMEE_URL"
  echo "  Content type:  application/json"
  echo "  Secret:        $SECRET"
  echo "  Events:        ✅ Pull requests, ✅ Issues"
  echo ""

elif [[ "$MODE" == "tailscale" ]]; then
  echo "--- Tailscale Modus ---"
  echo ""
  TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "NOT_FOUND")
  if [[ "$TAILSCALE_IP" == "NOT_FOUND" ]]; then
    echo "⚠ Tailscale nicht aktiv. Starte Tailscale und versuche erneut."
    echo "  tailscale up"
    exit 1
  fi
  echo "✅ Tailscale IP: $TAILSCALE_IP"
  echo ""
  echo "=== GitHub Webhook konfigurieren ==="
  echo ""
  echo "In jedem GitHub-Repo das du tracken willst:"
  echo "  Settings → Webhooks → Add webhook"
  echo ""
  echo "  Payload URL:    http://$TAILSCALE_IP:9876/webhook"
  echo "  Content type:  application/json"
  echo "  Secret:        $SECRET"
  echo "  Events:        ✅ Pull requests, ✅ Issues"
  echo ""
fi

echo "=== Repos zum Einrichten ==="
echo ""
echo "  MarcusGraetsch/rook-workspace"
echo "  MarcusGraetsch/rook-agent"
echo "  MarcusGraetsch/digital-capitalism-research"
echo ""
echo "Logs: journalctl --user -u github-webhook.service -f"
