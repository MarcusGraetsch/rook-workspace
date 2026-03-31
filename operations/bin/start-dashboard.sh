#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/root/.openclaw/workspace/engineering/rook-dashboard"
HOST="${ROOK_DASHBOARD_HOST:-127.0.0.1}"
PORT="${ROOK_DASHBOARD_PORT:-3001}"

cd "$ROOT_DIR"

if [[ ! -d node_modules ]]; then
  echo "node_modules missing in $ROOT_DIR" >&2
  exit 1
fi

if [[ ! -f .next/BUILD_ID ]]; then
  npm run build
fi

exec npm start -- --hostname "$HOST" --port "$PORT"
