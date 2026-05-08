#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: gate-rook-hermes-bridge-archive.sh <json-file>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR="$SCRIPT_DIR/validate-rook-hermes-bridge-message.py"
REVIEWER_ALLOWLIST="${ROOK_HERMES_BRIDGE_REVIEWER_ALLOWLIST:-$SCRIPT_DIR/../config/rook-hermes-bridge-reviewers.json}"

if [ ! -x "$VALIDATOR" ]; then
  echo "Validator missing or not executable: $VALIDATOR" >&2
  exit 1
fi

VALIDATOR_ARGS=(--require-review-approved)
if [ -f "$REVIEWER_ALLOWLIST" ]; then
  VALIDATOR_ARGS+=(--reviewer-allowlist "$REVIEWER_ALLOWLIST")
fi

python3 "$VALIDATOR" "${VALIDATOR_ARGS[@]}" "$1"
echo "ARCHIVE_GATE_OK: $1"
