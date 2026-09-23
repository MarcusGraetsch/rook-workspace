#!/usr/bin/env bash
# compare-models — Vergleiche zwei Modell-Antworten
# Nutzung: compare.sh "frage" [model_a] [model_b]
#
# Modelle: M3, Minimax, Kimi, Codex, DeepSeek, Qwen, Gemini, Mistral
# Default: M3 vs Codex
#
# Beispiel:
#   compare.sh "Was ist Docker?" M3 Codex
#   compare.sh "Erkläre Kubernetes" DeepSeek Qwen

set -e

QUESTION="$1"
MODEL_A="$2"
MODEL_B="$3"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

resolve_model() {
    case "$1" in
        M3)          echo "minimax/MiniMax-M3" ;;
        Minimax)     echo "minimax/MiniMax-M2.7" ;;
        Kimi)        echo "kimi/moonshot-k2-6" ;;
        Codex)       echo "openai/gpt-5.4" ;;
        DeepSeek)    echo "openrouter/deepseek-chat-v3" ;;
        Qwen)        echo "openrouter/qwen-2.5-72b-instruct" ;;
        Gemini)      echo "openrouter/google-gemini-2.5-flash" ;;
        Mistral)     echo "openrouter/mistralai/mistral-nemo" ;;
        *)           echo "$1" ;;
    esac
}

MODEL_A_ID=$(resolve_model "${MODEL_A:-M3}")
MODEL_B_ID=$(resolve_model "${MODEL_B:-Codex}")

if [ -z "$QUESTION" ]; then
    echo "Nutzung: compare.sh \"frage\" [model_a] [model_b]"
    echo ""
    echo "Verfügbare Modelle:"
    echo "  M3, Minimax, Kimi, Codex, DeepSeek, Qwen, Gemini, Mistral"
    echo ""
    echo "Beispiel:"
    echo "  compare.sh \"Was ist Docker?\" M3 Codex"
    exit 1
fi

get_key() {
    local model="$1"
    case "$model" in
        minimax/*)     echo "$MINIMAX_API_KEY" ;;
        kimi/*)        echo "$KIMI_API_KEY" ;;
        openai/*)      echo "$OPENAI_API_KEY" ;;
        openrouter/*)  python3 -c "import json; d=json.load(open('/root/.openclaw/secrets.json')); print(d.get('models',{}).get('providers',{}).get('openrouter',{}).get('key',''))" ;;
        *)             echo "" ;;
    esac
}

call_openai_compat() {
    local model="$1"
    local question="$2"
    local key="$3"
    local alias="$4"
    
    # Strip provider prefix for OpenAI-compatible APIs
    local actual_model="${model##*/}"
    
    local payload="{\"model\":\"$actual_model\",\"messages\":[{\"role\":\"user\",\"content\":\"$question\"}],\"max_tokens\":600,\"temperature\":0.7}"
    
    case "$model" in
        openrouter/*)
            curl -s --max-time 45 \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $key" \
                -H "HTTP-Referer: https://rook.local" \
                -H "X-Title: Rook Compare" \
                -d "$payload" \
                "https://openrouter.ai/api/v1/chat/completions"
            ;;
        openai/*)
            curl -s --max-time 45 \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $key" \
                -d "$payload" \
                "https://api.openai.com/v1/chat/completions"
            ;;
        minimax/*|kimi/*)
            curl -s --max-time 45 \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $key" \
                -d "$payload" \
                "https://api.minimax.io/anthropic/v1/chat/completions"
            ;;
        *)
            echo '{"error":"unsupported provider"}'
            ;;
    esac
}

echo "🧪 Vergleich: \"$QUESTION\""
echo "   🤖 ${MODEL_A:-M3} → $MODEL_A_ID"
echo "   🤖 ${MODEL_B:-Codex} → $MODEL_B_ID"
echo ""

KEY_A=$(get_key "$MODEL_A_ID")
KEY_B=$(get_key "$MODEL_B_ID")

echo "═══════════════════════════════════════════════════════════"
echo "🤖 ${MODEL_A:-M3} ($MODEL_A_ID):"
echo "───────────────────────────────────────────────────────────"
call_openai_compat "$MODEL_A_ID" "$QUESTION" "$KEY_A" | python3 "$SCRIPT_DIR/parse.py"
echo ""
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🤖 ${MODEL_B:-Codex} ($MODEL_B_ID):"
echo "───────────────────────────────────────────────────────────"
call_openai_compat "$MODEL_B_ID" "$QUESTION" "$KEY_B" | python3 "$SCRIPT_DIR/parse.py"
echo ""
echo ""
echo "✅ Vergleich abgeschlossen"
