# MODEL_ROUTING_DESIGN.md — Multi-Model-Agent-Plattform Design
**Erstellt:** 2026-08-30  
**Phase:** 2/5 — Design  
**Status:** Vorschlag (zur Entscheidung)

---

## 1. Zielarchitektur

### 1.1 Architektur-Prinzip

```
«Bestehende OpenClaw/Hermes-Funktionen bevorzugen. Nur das Minimum hinzufügen.»
```

**Was OpenClaw bereits kann** (nicht ändern):
- Fallback-Chain (bereits 4-stufig)
- `/model <name>` + Aliases
- Multi-Agent-System (6 Agents)
- Telegram/Discord-Channel
- Memory (SQLite FTS)
- Credential-Management
- Provider-Abstraktion (anthropic-messages API)

**Was hinzugefügt wird** (Phase 3 — Minimum):
- `/compare` Skill (parallel two-model query)
- `/models` erweitern (mit Aliases und Capabilities)
- OpenRouter API-Key eintragen
- Logging für Modellwechsel
- Optional: Regelbasierte Routing-Skills

### 1.2 Zielarchitektur (Text-Diagramm)

```
                    ┌─────────────────────────────────────────┐
                    │         OpenClaw Gateway (bestehend)     │
                    │  Port 18789 · Node.js · 24/7 Daemon     │
                    └───────────────────┬─────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
   ┌──────────────┐            ┌──────────────┐              ┌──────────────┐
   │  /model cmd  │            │  /compare    │              │  /models    │
   │  (bestehend)│            │  (NEU: Skill)│              │  (erweitert) │
   └──────────────┘            └──────────────┘              └──────────────┘
          │                             │                             │
          ▼                             ▼                             ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │              Provider Layer (bestehend, erweitert)              │
   ├─────────┬─────────┬─────────┬─────────┬─────────┬───────────────┤
   │  kimi   │ minimax │ openai  │openrouter│ (cohere)│ (local later) │
   │(bestehend)│(bestehend)│(bestehend)│(Key nötig)│            │
   └─────────┴─────────┴─────────┴─────────┴─────────┴───────────────┘
                                        │
                              OpenRouter Zugang zu:
                              Qwen · DeepSeek · GLM · Mistral
                              Llama · Gemma · Cohere · Fireworks
```

---

## 2. Datenfluss

### 2.1 Modellwahl (bestehend — kein Änderungsbedarf)

```
Nutzer: /model M3
  → OpenClaw Gateway
  → Prüft Alias "M3" → "minimax/MiniMax-M3"
  → Setzt Modell für aktuelle Session
  → Sendet Request an minimax-Provider
  → Streamt Antwort zurück
```

**Bestehende Aliases:**
| Alias | Modell | Funktion |
|-------|--------|---------|
| `M3` | minimax/MiniMax-M3 | MiniMax mit 1M Context |
| `Minimax` | minimax/MiniMax-M2.7 | MiniMax M2.7 |
| `Codex` | openai/gpt-5.4 | OpenAI GPT-5.4 |
| `Kimi` | kimi/moonshot-k2-6 | Kimi K2.6 |

### 2.2 Modellvergleich (/compare) — NEU

```
Nutzer: /compare "Erkläre Docker in 3 Sätzen"
  → Skill: compare.js
  → Prüfe: 2 Modelle ausgewählt? Falls nicht: Default (M3 vs Codex)
  → Parallel:
  │   Request A → minimax/MiniMax-M3
  │   Request B → openai/gpt-5.4
  → Sammle Antworten (mit Timeout)
  → Formatiere als Diff/Table
  → Antworte in Telegram
```

**Vergleichsformat (Telegram-HTML):**
```
🧪 Vergleich: "Docker in 3 Sätzen"

🤖 M3 (MiniMax-M3):
Docker ist eine Containerisierungsplattform...
[Antwort]

🤖 Codex (GPT-5.4):
Docker ist ein Tool zur Verpackung von Anwendungen...
[Antwort]
```

---

## 3. Model Routing

### 3.1 Bestehende Fallback-Chain (unverändert)

```
kimi-coding/moonshot-k2-6
  └─ minimax/MiniMax-M2.7
       └─ kimi/moonshot-k2-6
            └─ openai/gpt-5.4
                 └─ openrouter/free
```

### 3.2 Vorgeschlagene Erweiterung: Regelbasiertes Routing (Phase 4+)

Diese Tabelle zeigt, welche Modell-Kategorien für welche Tasks sinnvoll sind:

| Task-Typ | Empfohlen | Warum |
|----------|-----------|-------|
| Allgemein / Chat | Kimi K2.6 oder M3 | Schnell, günstig |
| Code / Engineering | Codex (GPT-5.4) | Beste Code-Fähigkeit |
| Recherche / Fakten | OpenAI o3 | Bessere Faktenstabilität |
| Lange Dokumente / Analysis | M3 (1M Context) | Größter Context |
| Debugging / Error Analysis | M3 oder Codex | Reasoning能力强 |
| Bilderkennung | Kimi K2.6 (vision) | text+image |
| Schnelle Fragen / IoT | MiniMax M2.7 highspeed | Schnellster |

**Routing-Skill (später, Phase 4+):**
```
/route code → Codex
/route research → o3
/route general → M3
```

**Aber:** Für Phase 3 ist das nicht nötig. Manuel per `/model` reicht.

---

## 4. Memory

### 4.1 Bestehendes System (keine Änderung)

```
MEMORY.md (Long-Term, kuratiert)
  ↓
memory/YYYY-MM-DD.md (tägliche Logs)
  ↓
memory_search (SQLite FTS5, Keyword)
  ↓
openclaw memory status --index --agent rook (Repair)
```

### 4.2 Memory bei Modellwechsel

**Wichtig:** Memory bleibt bei Modellwechsel **erhalten**. OpenClaw speichert Session-Memory unabhängig vom aktuellen Modell.

### 4.3 Memory-Silo (bekanntes Problem)

```
OpenClaw (rook)    ←→  Hermes (Phoenix)
  │                      │
  ├── MEMORY.md           ├── memories/
  ├── memory/*.md         ├── memory/
  └── memory_search      └── private/marcus-...
```

**Optionen (nicht für Phase 3):**
- **Option A:** Nix tun — zwei getrennte Kontexte sind akzeptabel
- **Option B:** Symbolischer Link oder Sync-Script (风险: Datenschutz)
- **Option C:** Phoenix soll nur lesen, nicht schreiben (MEMORY.md bleibt Single-Source)

**Empfehlung:** Option A (nix tun) bis ein echter Use-Case kommt.

---

## 5. Security

### 5.1 Credentials (bestehend)

| Secret | Storage | Status |
|--------|---------|--------|
| `MINIMAX_API_KEY` | Env-Variable | ✅ gesetzt |
| `KIMI_API_KEY` | Env-Variable | ✅ gesetzt |
| `OPENAI_API_KEY` | Env-Variable | ⚠️ prüfen |
| `OPENROUTER_API_KEY` | Env-Variable | ❌ **fehlt** |
| Telegram Bot Token | File | ✅ aktiv |
| Discord Token | File | ✅ aktiv |

**Credentials-Quelle:**
```json
"secrets": {
  "providers": {
    "filemain": {
      "source": "file",
      "path": "/root/.openclaw/secrets.json"
    }
  }
}
```

### 5.2 OpenRouter API-Key eintragen

**Wichtig:** Key kommt als Env-Variable in die Shell-Config, NICHT in Git.

```
# ~/.bashrc oder /etc/environment (nicht in Git!)
OPENROUTER_API_KEY=sk-or-v1-...
```

**Dann:** Restart des Gateway, damit die Env-Variable greift.

### 5.3 Cost Control

**OpenRouter:** Hat eingebaute Budget-Limits (Dashboard → Usage Limits). Proaktiv setzen.

**OpenAI:** Eigene Limits unter account.openai.com/settings/billing

**Kimi/MiniMax:** Prepaid-Modell, Guthaben überwachen.

---

## 6. Failure Modes

| Szenario | Erkennung | Reaktion |
|----------|-----------|---------|
| Provider 429 Rate Limit | HTTP 429 | Automatischer Fallback auf nächstes Modell |
| API-Key fehlt | Auth-Fehler | Session-Wechsel, Alert, Fallback |
| Timeout (>60s) | Timeout | Fallback auf anderes Modell |
| Ungültiges Modell | Config-Fehler | Fehlermeldung, Liste der verfügbaren Modelle |
| Context-Limit erreicht | 200k+ Token | Automatisch komprimieren oder anderes Modell |
| Provider komplett down | Connection Error | Fallback #N → openrouter/free |
| Tool Calling Fehler | API-Inkompatibilität | Fallback auf anderes Modell |
| Memory-Suche schlägt fehl | Empty Result | Return empty, nicht crash |

### 6.1 Provider Health Monitor

```
/health
  → Prüfe alle Provider mit kurzem Ping
  → Zeige Status pro Provider
  → Resultat: ✅/⚠️/❌ pro Modell
```

---

## 7. Kostenkontrolle

### 7.1 Bestehende Kostenstruktur

| Modell | Input $/1M | Output $/1M | Anmerkung |
|--------|-----------|------------|-----------|
| kimi/moonshot-k2-6 | $0 (Promotional) | $0 (Promotional) | Kostenlos aktuell |
| minimax/MiniMax-M2.7 | $0.30 | $1.20 | Günstig |
| minimax/MiniMax-M3 | $0.30 | $1.20 | 1M Context |
| openai/gpt-5.4 | ? (teuer) | ? (teuer) | Premium |
| openrouter/free | $0 | $0 | Kostenlos, aber limitiert |

### 7.2 Empfohlene Budget-Limits

```
OpenRouter Dashboard:
  - Monthly Budget: $5 (deckt Qwen/DeepSeek bei normaler Nutzung)
  - Per-Model Budget: $1/Monat
  
OpenAI:
  - Hard Limit: $10/Monat (vorsichtshalber)
  
MiniMax:
  - Prepaid: $20 Guthaben, reicht für ~5M output tokens
```

### 7.3 Kosten-Logging

Phase 3 enthält **kein** Cost-Tracking. Für Phase 4 empfohlen:
- JSON-Log bei jedem API-Call
- Einfache Aggregation: Modell → Gesamtkosten

---

## 8. Rollback-Strategie

### 8.1 Was kann schiefgehen?

| Änderung | Risiko | Rollback |
|----------|--------|---------|
| OpenRouter API-Key eintragen | Niedrig | Key entfernen, Gateway restart |
| `/compare`-Skill erstellen | Niedrig | Skill löschen, Gateway restart nicht nötig |
| Aliases ändern | Mittel | Config aus Backup zurückspielen |
| Neue Modelle zur Fallback-Chain | Niedrig | Config zurückspielen |
| Gateway-Restart | Mittel | `systemctl restart openclaw` → läuft wieder |

### 8.2 Backup-Strategie (bestehend)

- `openclaw.json.bak*` — mehrere Backups vorhanden
- Vor jeder config-Änderung: Backup erstellen
- Git-Commit vorher (rook-agent repo)

### 8.3 Konkreter Rollback-Befehl

```bash
# Config zurücksetzen
cp /root/.openclaw/openclaw.json.bak /root/.openclaw/openclaw.json

# Gateway restart
openclaw gateway restart

# Oder direkt:
systemctl restart openclaw
```

---

## 9. Phase-3-Minimal-Implementierung

### Was genau getan wird (minimal):

1. **`/models`-Erweiterung** — Skill oder Alias-Liste aktualisieren
2. **OpenRouter API-Key** — in Env eintragen, Gateway restart
3. **`/compare`-Skill** — parallels Request an zwei Modelle
4. **Logging** — Modellwechsel + Provider-Fehler loggen
5. **Alias-Check** — prüfen ob M3, Minimax, Codex funktionieren

### Was NICHT kommt (Phase 4+):
- Cost-Tracking Dashboard
- Regelbasiertes Routing
- Automatischer Health-Monitor
- OpenRouter Modell-Check
- Neue Android-App

### Checkliste Phase 3:

- [ ] OpenRouter API-Key beschaffen (openrouter.ai → Account → API Key)
- [ ] Key in Env eintragen (nicht in Git!)
- [ ] Gateway restart
- [ ] `/compare`-Skill erstellen
- [ ] Testen: `/model M3` → antwortet?
- [ ] Testen: `/compare "Was ist Kubernetes?"` → zwei Antworten?
- [ ] `/models` zeigt alle verfügbaren Modelle?
- [ ] Logging funktioniert (memory/LOG oder cron-log)

---

## 10. Modell-Empfehlungen für technische Experimente

Basierend auf verfügbaren Providern + OpenRouter (nach Key-Beschaffung):

### Empfohlene 7 Modelle

| # | Modell | Provider | Context | Stärke | Nutzung |
|---|--------|---------|---------|--------|---------|
| 1 | `kimi/moonshot-k2-6` | Kimi | 262k | Code+Vision | Primary (kostenlos) |
| 2 | `minimax/MiniMax-M3` | MiniMax | 1000k | Lange Docs | Large-Context-Tasks |
| 3 | `minimax/MiniMax-M2.7` | MiniMax | 205k | Reasoning | Schnelle Tasks |
| 4 | `openai/gpt-5.4` | OpenAI | 1050k | Code+General | Engineering |
| 5 | `openai/o3` | OpenAI | 200k | Reasoning | Komplexe Analyse |
| 6 | `qwen/qwen-72b-chat` | OpenRouter | 32k | Multilingual | DE/FR-Tech-Vergleich |
| 7 | `deepseek/deepseek-chat-v3` | OpenRouter | 64k | Code+Math | Debugging/Algorithmen |

**Nicht empfohlen:**
- `openrouter/free` allein — keine Modellgarantie, nur für letzten Fallback
- GPT-5.5/5.6 als primär — zu teuer für Experimente
- o1/o1-pro — 200k Context, teuer, nur für spezielle Fälle

---

## 11. Entscheidungsfragen (offen für Marcus)

1. **OpenRouter API-Key** — Soll ich den beschaffen? (Kosten: ~$0-5/Monat)
2. **`/compare`-Design** — Soll der Skill beide Antworten hintereinander zeigen (wie oben) oder als strukturierten Diff?
3. **Memory-Silo** — Soll ich irgendetwas an der OpenClaw↔Hermes-Trennung ändern?
4. **Cost-Tracking** — Soll ich das in Phase 3 einbauen oder bleiben lassen?

---

*Phase 2 Design | rook | 2026-08-30*
