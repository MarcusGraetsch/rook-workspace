#!/usr/bin/env bash
set -euo pipefail

PORT="${ROOK_DASHBOARD_PORT:-3001}"
URL="${ROOK_DASHBOARD_URL:-http://127.0.0.1:${PORT}/kanban}"
SERVICE="${ROOK_DASHBOARD_SERVICE:-rook-dashboard.service}"

if curl -fsS --max-time 5 "$URL" >/dev/null; then
  echo "dashboard_ok url=$URL"
  exit 0
fi

echo "dashboard_down url=$URL service=$SERVICE" >&2

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user restart "$SERVICE"
  sleep 3
  curl -fsS --max-time 5 "$URL" >/dev/null
  echo "dashboard_restarted url=$URL service=$SERVICE"
  exit 0
fi

echo "systemctl unavailable; dashboard remains down" >&2
exit 1
