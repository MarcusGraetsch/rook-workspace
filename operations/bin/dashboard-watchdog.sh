#!/usr/bin/env bash
set -euo pipefail

PORT="${ROOK_DASHBOARD_PORT:-3001}"
URL="${ROOK_DASHBOARD_URL:-http://127.0.0.1:${PORT}/kanban}"
SERVICE="${ROOK_DASHBOARD_SERVICE:-rook-dashboard.service}"
MODEL_POLICY_CONTROLLER="${ROOK_MODEL_POLICY_CONTROLLER:-/root/.openclaw/workspace/operations/bin/model-mode-controller.mjs}"

run_model_policy_controller() {
  if command -v node >/dev/null 2>&1 && [[ -f "$MODEL_POLICY_CONTROLLER" ]]; then
    if policy_output="$(node "$MODEL_POLICY_CONTROLLER" evaluate 2>&1)"; then
      echo "model_policy_ok controller=$MODEL_POLICY_CONTROLLER"
      echo "$policy_output"
    else
      echo "model_policy_failed controller=$MODEL_POLICY_CONTROLLER" >&2
      echo "$policy_output" >&2
    fi
  fi
}

if curl -fsS --max-time 5 "$URL" >/dev/null; then
  echo "dashboard_ok url=$URL"
  run_model_policy_controller
  exit 0
fi

echo "dashboard_down url=$URL service=$SERVICE" >&2

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user restart "$SERVICE"
  sleep 3
  curl -fsS --max-time 5 "$URL" >/dev/null
  echo "dashboard_restarted url=$URL service=$SERVICE"
  run_model_policy_controller
  exit 0
fi

echo "systemctl unavailable; dashboard remains down" >&2
run_model_policy_controller
exit 1
