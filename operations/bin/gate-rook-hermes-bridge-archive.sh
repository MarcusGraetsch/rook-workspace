#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: gate-rook-hermes-bridge-archive.sh <json-file>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR="$SCRIPT_DIR/validate-rook-hermes-bridge-message.py"

if [ ! -x "$VALIDATOR" ]; then
  echo "Validator missing or not executable: $VALIDATOR" >&2
  exit 1
fi

python3 "$VALIDATOR" --require-review-approved "$1"
echo "ARCHIVE_GATE_OK: $1"
