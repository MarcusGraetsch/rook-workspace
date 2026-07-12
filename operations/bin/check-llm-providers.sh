#!/bin/bash
# check-llm-providers.sh
# Test if MiniMax rate limit has reset, and switch Phoenix back to MiniMax if so.
# Cron: every 5h (matches subscription reset cycle)
#
# Logs to: operations/logs/check-llm-providers.log

set -u

LOG_DIR="/root/.openclaw/workspace/operations/logs"
LOG_FILE="$LOG_DIR/check-llm-providers.log"
HERMES_CONFIG="/root/.hermes/config.yaml"
HERMES_ENV="/root/.hermes/.env"
HERMES_AUTH="/root/.hermes/auth.json"

# Provider endpoints
MINIMAX_URL="https://api.minimax.io/anthropic"
MINIMAX_MODEL="MiniMax-M3"

mkdir -p "$LOG_DIR"
log() {
    echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

# Get API key from OpenClaw secrets (the canonical source)
get_minimax_key() {
    python3 -c "
import json
with open('/root/.openclaw/secrets.json') as f:
    d = json.load(f)
print(d.get('auth-profiles', {}).get('minimax', {}).get('global', {}).get('key', ''))
" 2>/dev/null
}

# Test MiniMax with a minimal request
test_minimax() {
    local key="$1"
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "$MINIMAX_URL/v1/messages" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $key" \
        -H "anthropic-version: 2023-06-01" \
        -d "{\"model\":\"$MINIMAX_MODEL\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}" \
        --max-time 10 2>/dev/null)
    local code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    echo "$code|$body"
}

# Switch Hermes config back to MiniMax
switch_hermes_to_minimax() {
    log "  Switching Hermes config to MiniMax..."

    # Backup current config
    cp "$HERMES_CONFIG" "${HERMES_CONFIG}.bak.$(date +%s)"

    # Update provider and base_url using sed
    if sed -i \
        -e 's|^  provider: kimi$|  provider: minimax|' \
        -e 's|^  base_url: https://api.kimi.com/coding/v1$|  base_url: https://api.minimax.io/anthropic|' \
        "$HERMES_CONFIG"; then
        log "  ✓ Hermes config.yaml updated"
    else
        log "  ✗ Failed to update Hermes config.yaml"
        return 1
    fi

    # Clear auth.json so Hermes re-fetches credentials
    if [ -f "$HERMES_AUTH" ]; then
        rm -f "$HERMES_AUTH"
        log "  ✓ auth.json cleared (Hermes will rebuild)"
    fi

    return 0
}

main() {
    log "=== Check LLM Providers ==="

    local minimax_key
    minimax_key=$(get_minimax_key)
    if [ -z "$minimax_key" ]; then
        log "✗ No MiniMax key found in OpenClaw secrets"
        return 1
    fi
    log "  MiniMax key: ${minimax_key:0:15}..."

    local result
    result=$(test_minimax "$minimax_key")
    local code="${result%%|*}"
    local body="${result#*|}"

    log "  MiniMax response: HTTP $code"

    case "$code" in
        200)
            log "✓ MiniMax is AVAILABLE (rate limit reset)"
            # Check if Hermes is currently on kimi
            if grep -q "provider: minimax" "$HERMES_CONFIG" 2>/dev/null; then
                log "  Hermes already on MiniMax — no action needed"
            else
                log "  Hermes is on fallback — switching to MiniMax"
                switch_hermes_to_minimax
            fi
            log "  Note: OpenClaw/Rook will auto-switch on next request (fallback logic)"
            ;;
        429)
            log "⏳ MiniMax still rate-limited (HTTP 429) — keep fallback"
            # Could test Kimi here too, but skipping for now
            ;;
        401)
            log "✗ MiniMax auth error (HTTP 401) — key invalid, check credentials"
            ;;
        *)
            log "? MiniMax unexpected response: HTTP $code"
            log "  Body: $(echo "$body" | head -c 200)"
            ;;
    esac

    log "=== Done ==="
}

main "$@"