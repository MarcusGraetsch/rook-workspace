# CURRENT_STATE.md — Multi-Model-Agent-Plattform Discovery
**Erstellt:** 2026-08-30  
**Phase:** 1/5 — Discovery (read-only)  
**Status:** ✅ Abgeschlossen

---

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway (Node.js)                    │
│                  Port 18789, läuft als Daemon                    │
├─────────────────────────────────────────────────────────────────┤
│  Channels           │  Agents           │  Memory               │
│  ├─ Telegram (✅)   │  ├─ rook (main)   │  ├─ SQLite FTS5      │
│  ├─ Discord (✅)     │  ├─ engineer     │  ├─ memory_search    │
│  └─ Signal (?)      │  ├─ researcher   │  └─ daily files      │
│                     │  ├─ coach        │                       │
│                     │  └─ health       │                       │
├─────────────────────────────────────────────────────────────────┤
│  Provider Layer (API-abstrakt, anthropic-messages kompatibel)   │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │ kimi     │ minimax │ openai   │ openrouter│ (cohere) │       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘       │
├─────────────────────────────────────────────────────────────────┤
│  Hermes (separat, `/root/.hermes/`)                             │
│  - Eigenes Gateway, Port ?, eigenes Model-Routing                │
│  - Nutzt memory/*.md + `private/marcus-personal-context.md`      │
│  - Hat eigene Cron-Jobs und Skills                               │
└─────────────────────────────────────────────────────────────────┘
```

**Wichtig:** Hermes läuft **getrennt** von OpenClaw. Beide teilen NICHT denselben Gateway-Prozess.

---

## 2. Komponenten-Inventar

### OpenClaw Gateway
- ** Prozess:** `node /usr/lib/node_modules/openclaw/dist/index.js gateway --port 18789`
- **Node:** v22.22.3
- **Node:** v22.22.1 (laut MEMORY.md)
- **Host:** vmd151897 (Linux 5.15)
- **Plugins (aktiv):** codex, headroom, kimi, memory-core, minimax, openai, telegram, voice-call, workspace, discord

### Channels
| Channel | Status | Bot-Token |
|---------|--------|-----------|
| Telegram | ✅ Aktiv | `/root/.openclaw/credentials/telegram-bot-token.txt` |
| Discord | ✅ Aktiv | `/root/.openclaw/credentials/comfy/` |
| Signal | ⚠️ Unklar | Nicht in Config |

### Agents
| Agent | Workspace | Primary Model | Fallbacks |
|-------|-----------|--------------|-----------|
| **rook** | `/root/.openclaw/workspace` | kimi-coding/moonshot-k2-6 | minimax/MiniMax-M2.7, kimi/moonshot-k2-6, openai/gpt-5.4, openrouter/free |
| **engineer** | `/root/.openclaw/workspace-engineer` | kimi-coding/moonshot-k2-6 | minimax/MiniMax-M2.7, kimi/moonshot-k2-6, openai/gpt-5.4 |
| **researcher** | `/root/.openclaw/workspace-researcher` | kimi-coding/moonshot-k2-6 | minimax/MiniMax-M2.7, kimi/moonshot-k2-6, openai/gpt-5.4 |
| **coach** | `/root/.openclaw/workspace-coach` | kimi-coding/moonshot-k2-6 | — |
| **health** | `/root/.openclaw/workspace-health` | kimi-coding/moonshot-k2-6 | — |
| **dispatcher** | `/root/.openclaw/workspace-dispatcher` | — | — |

---

## 3. Provider & Modelle

### 3.1 Verfügbare Modelle (laut `openclaw models list`)

| Modell | Provider | Context | Tools | Status |
|--------|----------|---------|-------|--------|
| **kimi-coding/moonshot-k2-6** | kimi | 262k | ✅ | Primär (Haupt-Session) |
| **kimi/kimi-code** | kimi | 262k | ✅ | verfügbar |
| **minimax/MiniMax-M2.7** | minimax | 204.8k | ✅ | Fallback |
| **minimax/MiniMax-M3** | minimax | 1000k | ✅ | verfügbar |
| **minimax-cn/MiniMax-M3** | minimax-cn | 1000k | ✅ | verfügbar |
| **minimax-portal/MiniMax-M2.7** | minimax-portal | 204.8k | ✅ | verfügbar |
| **minimax-portal/MiniMax-M3** | minimax-portal | 1000k | ✅ | verfügbar |
| **openai/gpt-5.4** | openai | 1050k | ✅ | Fallback |
| **openai/gpt-5.4-mini** | openai | 400k | ✅ | verfügbar |
| **openai/gpt-5.4-nano** | openai | 400k | ✅ | verfügbar |
| **openai/gpt-5.5** | openai | 1000k | ✅ | verfügbar |
| **openai/o3** | openai | 200k | ✅ | verfügbar |
| **openai/o4-mini** | openai | 200k | ✅ | verfügbar |
| **openrouter/free** | openrouter | 200k | ✅ | Fallback #4 |

### 3.2 Konfigurierte Provider

| Provider | BaseURL | API | Auth | Status |
|----------|---------|-----|------|--------|
| **kimi** | `https://api.kimi.com/coding/v1` | anthropic-messages | `KIMI_API_KEY` (env) | ✅ aktiv |
| **minimax** | `https://api.minimax.io/anthropic` | anthropic-messages | `MINIMAX_API_KEY` (env) | ✅ aktiv |
| **openai** | — (OpenAI nativ) | — | — | ✅ aktiv |
| **openrouter** | — | api_key | `OPENROUTER_API_KEY` (env) | ✅ konfiguriert, **API-Key fehlt** |

### 3.3 OpenRouter
- **Status:** Konfiguriert, aber **kein API-Key gesetzt** (nur `openrouter/free` in der Fallback-Kette)
- **Was es kann:** 100+ Modelle (Qwen, DeepSeek, GLM, Mistral, Llama, Gemma, etc.)
- **Kostenkontrolle:** OpenRouter hat eingebaute Budget-Limits

### 3.4 Nicht verfügbare Provider (laut Models-Liste)
- **Anthropic** (kein Key, kein Endpoint konfiguriert)
- **Google/Gemini** (nicht konfiguriert)
- **DeepSeek** (nur via OpenRouter)
- **Qwen** (nur via OpenRouter)
- **Cohere** (nicht konfiguriert)

---

## 4. Memory-System

### OpenClaw Memory
- **Typ:** SQLite FTS5 (Keyword-basiert) + tägliche Markdown-Dateien
- **Location:** `memory/YYYY-MM-DD.md` + MEMORY.md
- **Suche:** `memory_search` Tool (Keyword-Matching)
- **Search-Provider:** `"provider": "none"` (keine Vektor-Suche, kein OpenAI Embeddings)
- **Backup:** FTS-Index bei Bedarf neu baubar mit `openclaw memory status --index --agent rook`

### Hermes Memory
- **Location:** `/root/.hermes/memories/` + `/root/.hermes/memory/`
- **私人-Datei:** `private/marcus-personal-context.md` (nur Hermes + Phoenix)
- **MEMORY.md wird NICHT von OpenClaw nach Hermes übertragen**

### Cross-Context-Problem
- OpenClaw und Hermes teilen **kein** gemeinsames Memory
- Rook (OpenClaw) kennt nicht automatisch Hermess Context und umgekehrt

---

## 5. Modell-Routing — Was funktioniert bereits

### Fallback-Chain (bereits aktiv)
```
kimi-coding/moonshot-k2-6
  └─ minimax/MiniMax-M2.7
       └─ kimi/moonshot-k2-6
            └─ openai/gpt-5.4
                 └─ openrouter/free
```

### Modellwechsel im Chat
- **Befehl:** `/model <provider/model>` (z.B. `/model minimax/MiniMax-M3`)
- **Alias:** `M3` für `minimax/MiniMax-M3` (in `agents.defaults.models`)
- **Alias:** `Codex` für `openai/gpt-5.4`

### Was noch fehlt
- ❌ Kein `/compare`-Befehl
- ❌ Kein dynamisches Modell-Routing (regelbasiert)
- ❌ Kein Cost-Tracking pro Modell
- ❌ Kein OpenRouter-API-Key für Qwen/DeepSeek/GLM-Zugang

---

## 6. Android / Remote Access

### Aktuelle Lösung: Telegram ✅
Marcus' Telegram-Account (549758481) ist als DM erlaubt.

**Was über Telegram bereits geht:**
| Anforderung | Status | Wie |
|-------------|--------|-----|
| OpenClaw erreichen | ✅ | `@rook_telegram_bot` |
| Modelle auswählen | ✅ | `/model <name>` |
| Memory nutzen | ✅ | `/search <query>` |
| Neue Chats starten | ✅ | Direkt an Bot schreiben |
| Modell wechseln | ✅ | `/model <name>` |
| Ergebnisse vergleichen | ❌ | Kein eingebautes `/compare` |

**Fazit:** Telegram reicht für alle 6 Anforderungen außer #6 (Compare). Das wäre **Phase-3-Minimal-Implementierung**.

### Discord
- ⚠️ Ebenfalls aktiv, DM + Gruppe möglich

---

## 7. Bestehende Infrastruktur

### Repos
| Repo | Inhalt |
|------|--------|
| `rook-agent` | Core-System (Config, Skills) |
| `rook-workspace` | Arbeitsumgebung (Projekte, Memory) |
| `digital-capitalism-research` | Research |
| `working-notes` | Website (public) |
| `rook-k8s-lab` | Kubernetes-IDP |

### Cron-Jobs
- Täglicher Sync (02:00)
- Research Pipeline (Sonntags 08:00)
- Wiki Weekly (Sonntags 10:00)
- Health-Tracker etc.

---

## 8. Security & Credentials

| Secret | Location | Status |
|--------|----------|--------|
| `MINIMAX_API_KEY` | Env-Variable | ✅ gesetzt |
| `KIMI_API_KEY` | Env-Variable | ✅ gesetzt |
| `OPENROUTER_API_KEY` | Env-Variable | ❌ **fehlt** |
| `OPENAI_API_KEY` | Env-Variable | ⚠️ unklar |
| Telegram Bot Token | File | ✅ aktiv |
| Discord Token | File | ✅ aktiv |

**Secrets-Quelle:** `/root/.openclaw/secrets.json` (filemain-Provider)

---

## 9. Risiken

| # | Risiko | Bewertung |
|---|--------|-----------|
| 1 | **OpenRouter API-Key fehlt** | Hoch — OpenRouter-Fallback nutzlos ohne Key |
| 2 | **Memory-Silo (OpenClaw ↔ Hermes)** | Mittel — getrennte Kontexte |
| 3 | **Codex-Plugin fehlerhaft** | Niedrig — "`codex failed during register`", aber Agent läuft |
| 4 | **Kein Cost-Tracking** | Mittel — keine Kostenkontrolle bei OpenAI o.ä. |
| 5 | **Provider-Limit-Ausfall** | Mittel — alle Provider teilen sich Budget-Grenzen |
| 6 | **Headroom-Plugin deaktiviert** | Niedrig — `autoStart: false` |

---

## 10. Bewertung: Was bereits vorhanden ist

### ✅ Bereits gut gelöst
- Multi-Provider-Unterstützung (Kimi, MiniMax, OpenAI, OpenRouter skeleton)
- Fallback-Chain (4 Stufen)
- Modellwechsel per `/model` + Aliases
- Telegram-Access (Android-fähig)
- Memory-System (FTS-basiert)
- Multi-Agent-Architektur (6 Agents)
- Credential-Management (verschlüsselt)

### ❌ Noch fehlend für Multi-Model-Agent-Plattform
- **OpenRouter API-Key** für Qwen/DeepSeek/GLM-Zugang
- **`/compare`-Funktion** für Ergebnisvergleich
- **Dynamisches Modell-Routing** (regelbasiert, nicht nur Fallback)
- **Cost-Tracking** pro Modell/Provider
- **OpenRouter-Modell-Auflistung** (welche Modelle sind über openrouter/free erreichbar?)
- **Dokumentation** der Modell-Switch-Syntax

---

## 11. Phase-3-Minimal-Implementierung — Empfehlung

Basierend auf Discovery:

### Unbedingt nötig (Phase 3)
1. **OpenRouter API-Key beschaffen** → freie Modelle (Qwen, DeepSeek, GLM) nutzbar
2. **`/compare`-Skill erstellen** → zwei Modelle parallel füttern, Antworten vergleichen
3. **`/models`-Dokumentation** → auflisten was verfügbar ist + Aliases

### Nice-to-have (später)
- Cost-Tracking Dashboard
- Regelbasiertes Routing ("wenn Code → nimm Codex")
- OpenRouter-Modell-Check (welche Modelle sind mit free-Key erreichbar)

### Nicht nötig
- **oh-my-pi** → nicht benötigt, VM läuft bereits auf vmd151897
- **Laptop als Server** → VM ist der bessere Standort (24/7, public IP)
- **Neues Android-App** → Telegram reicht完全

---

## 12. Nächste Schritte (nach Phase 1)

- [ ] Marcus entscheidet über Phase 2 (Design doc erstellen)
- [ ] OpenRouter API-Key beschaffen (kostet ~$0-5/Monat für Basisnutzung)
- [ ] Design-Meeting: MODEL_ROUTING_DESIGN.md besprechen

---

*Generated by: Phase 1 Discovery | Agent: rook | Date: 2026-08-30*
