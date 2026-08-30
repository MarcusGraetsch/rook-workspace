# Hermes/Phoenix Memory-Limit Investigation

**Datum:** 2026-08-30  
**Trigger:** Heute Vormittag — `memory` action `add` schlug fehl mit `Memory at 2,134/2,200 chars`. Lesson-Eintrag zu `kimi-coding/`-Namespace-Bug passte nicht mehr rein.

## 1. Befund: Das Limit ist absichtlich

**Code-Stelle:** `tools/memory_tool.py:130`, Kommentar in `hermes_cli/config.py:2284`

```python
self.memory_char_limit = 2200   # ~800 tokens at 2.75 chars/token
self.user_char_limit = 1375
```

**Design-Begründung** (aus Modul-Docstring):
- Beide Files werden bei Session-Start als **frozen snapshot** in den System-Prompt injiziert
- Während der Session werden Mutationen live persistiert, aber der Snapshot ändert sich nicht
- → Prefix-Cache bleibt stabil → günstigere LLM-Calls

**Konfigurierbar:** Ja, in `~/.hermes/config.yaml`:
```yaml
memory:
  memory_char_limit: 2200
  user_char_limit: 1375
```

## 2. Aktueller Stand

| File | Size | Status |
|---|---|---|
| `MEMORY.md` | 2200 / 2200 | 97% voll, add() blockiert |
| `USER.md` | 1284 / 1375 | 93% voll |
| `MEMORY.md.lock` / `USER.md.lock` | 0 bytes | nur File-Locking |

## 3. Externe Memory-Provider — eingebaut, ungenutzt

Hermes liefert 8 Provider-Plugins unter `plugins/memory/`:

| Provider | Storage | Lokal? | API-Key? |
|---|---|---|---|
| `holographic` | SQLite + FTS5 | ✅ | ❌ |
| `hindsight` | Cloud/Local-Embedded/Local-External | optional | optional |
| `honcho` | Cloud/Self-hosted | optional | ✅ |
| `mem0` | Mem0 Cloud | ❌ | ✅ |
| `openviking` | Cloud/Local | optional | optional |
| `supermemory` | Supermemory Cloud | ❌ | ✅ |
| `byterover` | CLI + optional cloud | ✅ | optional |
| `retaindb` | Local | ✅ | ❌ |

Aktuell: `memory.provider: ''` — alle deaktiviert. Built-in `MEMORY.md`/`USER.md` bleiben aktiv, Provider sind additiv.

## 4. Lösungsoptionen

### Option A — Limit erhöhen
- `memory_char_limit: 8000` setzen, restart
- 30s Aufwand
- Kosten: 0€
- Risiko: Prefix-Cache weniger stabil, ~3x mehr Tokens pro System-Prompt

### Option B — Holographic aktivieren (lokal)
- `hermes memory setup` → "holographic"
- SQLite FTS5 fact-store mit trust scoring, semantic search
- Kein API-Key, kein Cloud
- Kosten: 0€
- Aufwand: 15 Min Setup + ggf. Migration der aktuellen Einträge
- Risiko: Neue Tool-API (`fact_store`, `fact_feedback`) muss erlernt werden

### Option C — Hindsight lokal-embedded
- Knowledge Graph + Auto-Recall + Entity Resolution
- LLM für Fact-Extraction (über bestehenden `minimax`-Provider nutzbar)
- Kosten: 0€ + Compute
- Aufwand: 30 Min Setup
- Risiko: Komplexer als holographic

## 5. Empfehlung

**Stufe 1 (sofort):** Option A — `memory_char_limit: 8000`, `user_char_limit: 5000`.  
**Stufe 2 (diese Woche):** Option B — holographic als zusätzlichen Provider aktivieren, parallel zu MEMORY.md/USER.md.  
**Stufe 3 (optional, später):** Option C — hindsight wenn holographic an Grenzen stößt (z.B. wenn Marcus mehr strukturierte Knowledge-Graph-Queries braucht).

## 6. Quellen

- `/usr/local/lib/hermes-agent/tools/memory_tool.py` (1152 Zeilen)
- `/usr/local/lib/hermes-agent/agent/agent_init.py` Z. 1432-1510
- `/usr/local/lib/hermes-agent/hermes_cli/config.py` Z. 2284
- `/usr/local/lib/hermes-agent/website/docs/user-guide/features/memory-providers.md`
- `/usr/local/lib/hermes-agent/plugins/memory/{holographic,hindsight,honcho,mem0,...}/README.md`
