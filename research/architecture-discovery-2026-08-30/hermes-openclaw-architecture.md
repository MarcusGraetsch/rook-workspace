# Hermes/Phoenix System Architecture Discovery

## 1. Current Model & Provider

| Field | Value |
|---|---|
| **Primary Model** | `MiniMax-M3` |
| **Primary Provider** | `minimax` |
| **Base URL** | `https://api.minimax.io/anthropic` |
| **Delegation Model** (subagents) | `MiniMax-M2.7` / `minimax` |
| **Fallback Model** | Not configured (commented out in config) |

**Auxiliary providers also defined:**
- `kimi` — `https://api.kimi.com/coding/v1` (custom provider, no key)
- `deepinfra` / `deep-infra` / `deepinfra-ai` — all point to `https://api.deepinfra.com/v1/openai`

**Other providers referenced but not configured:**
- OpenRouter, OpenAI Codex, Nous, ZAI, Bedrock — all available as fallback/aux targets

---

## 2. Memory System (Hermes vs. OpenClaw)

Hermes maintains **its own completely separate memory system** from OpenClaw:

| | Hermes | OpenClaw |
|---|---|---|
| **Location** | `/root/.hermes/memories/MEMORY.md` + `USER.md` | `/root/.openclaw/workspace/memory/` + `MEMORY.md` |
| **Format** | Markdown, curated, §-delimited | Markdown daily notes + long-term |
| **User** | Marcus Grätsch (German) | Same human (rook's human) |
| **Contents** | Distilled personal context, preferences, fabrication rules, key relationships | General workspace notes |

**Hermes `/root/.hermes/memory/`** contains operational context files (not long-term memory):
- `coach_context.md` — coaching persona
- `email_policy.md` + `email_policy_README.md`
- `feedback/` subdirectory

**Key distinction:** Hermes has its own SOUL.md, USER.md, and MEMORY.md — it is not reading from OpenClaw's memory. They share the human (Marcus) but maintain independent memory stores.

---

## 3. Model Routing Capabilities

**Direct routing:**
- Primary request → `minimax` / `MiniMax-M3`
- Delegation (subagent spawning) → `minimax` / `MiniMax-M2.7`
- Custom providers defined: `minimax`, `kimi`

**Auxiliary task routing** (each task can override provider/model):
- Vision, web extraction, compression, skills hub, approval, TTS, STT, kanban decomposition, title generation, profiling, curation, monitoring, session search — all set to `provider: auto` (defaults to primary unless overridden)

**Fallback model:** Commented out. Can be configured for automatic failover to OpenRouter, Nous, or other providers on 429/529/503 errors.

**No dynamic routing** is currently active — single provider, single model.

---

## 4. Architecture Relationship: Hermes ↔ OpenClaw

```
Marcus (Human)
    │
    ├── Telegram: @549758481
    │       │
    │       ├── Hermes (Phoenix) ──► MiniMax-M3 / minimax
    │       │         /root/.hermes/
    │       │         Own MEMORY.md, USER.md, SOUL.md
    │       │         Own toolsets, skills, kanban, cron, etc.
    │       │
    │       └── OpenClaw (Rook) ──► minimax/MiniMax-M2.7
    │                   /root/.openclaw/workspace/
    │                   Own MEMORY.md, AGENTS.md, TOOLS.md
    │                   Different skill set
    │
    ├── Discord: 1091521008076329081
    │       └── (Both agents also on Discord)
    │
    └── Both share the same auth credentials (Telegram, Discord)
```

**Relationship:** Two independent agents for the same human, running in parallel. They do **not** share memory or context. Both use the same `minimax` provider family but at different model tiers (M3 vs M2.7). There is a delegation channel (`hermes-cli` toolset) for spawning subagents, and OpenClaw has its own `dispatch_canonical_task` skill pointing back at Hermes.

**Key shared infrastructure:**
- Same `.env` credentials (Telegram bot, Discord bot, MiniMax API key)
- Both on the same `vmd151897` host
- Hermes exposes `API_SERVER_ENABLED=true` on `127.0.0.1:8765` for OpenAI-compatible clients

---

## 5. Credentials & Auth

**API Keys (from `.env`):**
| Key | Provider | Status |
|---|---|---|
| `MINIMAX_API_KEY` | MiniMax | Active |
| `KIMI_API_KEY` | Kimi | Active |
| `DEEPINFRA_API_KEY` | DeepInfra | Active |
| `ANTHROPIC_API_KEY` | Anthropic | **Empty** |

**OAuth tokens:**
- Spotify (in `auth.json`) — full PKCE OAuth, expires 2026-08-30T06:00:33

**Platform tokens (`.env`):**
- `TELEGRAM_BOT_TOKEN` — active
- `DISCORD_BOT_TOKEN` — active

**Secrets directory** (`/root/.hermes/secrets/`): Contains only setup docs and test scripts — no live keys stored there (keys are in `.env` or `auth.json`).

**Credential pool** (in `auth.json`): Maintains fingerprints of all known credentials with health tracking (`last_status`, `last_error_*`).

---

## Summary Table

| Aspect | Detail |
|---|---|
| **Primary model** | MiniMax-M3 via MiniMax API |
| **Delegation model** | MiniMax-M2.7 |
| **Memory system** | Independent Markdown files (`MEMORY.md`, `USER.md`) |
| **Routing** | Static single-provider (no dynamic routing active) |
| **Fallback** | Configurable but commented out |
| **Multi-agent relationship** | Parallel independent agents, shared human, shared API keys |
| **Credentials** | MiniMax, Kimi, DeepInfra, Spotify OAuth in `auth.json` |
| **Anthropic key** | Empty — MiniMax used as Anthropic-compatible endpoint |
| **API server** | Enabled on `127.0.0.1:8765` (OpenAI-compatible) |
