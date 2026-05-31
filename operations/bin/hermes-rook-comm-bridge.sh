#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/hermes-rook-comm-bridge.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another Hermes rook comm bridge run is already active; exiting."
  exit 0
fi

exec /usr/local/lib/hermes-agent/venv/bin/python /root/.hermes/skills/rook-comm-bridge/bridge.py
