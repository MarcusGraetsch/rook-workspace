# LLM Provider Policy - 2026-03-24

## Rule: NO Pay-per-Use APIs

**Forbidden:**
- OpenAI API (pay-per-use)
- Anthropic API (pay-per-use)
- Any API key based billing

**Allowed:**
- Kimi CLI + Pro Subscription ✅
- Claude CLI + Pro Subscription ✅
- Codex CLI + Pro Subscription ✅

## Rationale
Marcus explicitly stated:
"ich will kein open ai api das ist pay per use das ist im moment hier ein nogo"

## Implementation
- Use CLI tools only (kimi, claude, codex)
- CLI tools manage their own auth tokens
- No API keys in .env for pay-per-use services
- If Codex CLI has issues, consider alternatives but NEVER fall back to pay-per-use API
