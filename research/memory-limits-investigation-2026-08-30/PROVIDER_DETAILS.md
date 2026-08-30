# Memory-Provider im Detail — Recherche für Marcus (2026-08-30)

**Frage:** Was sind die 8 Provider, wie unterscheiden sie sich, was kostet das, was passt zu meinem Setup (minimax, Kimi, OpenAI, Claude Keys vorhanden)?

**Architektur-Klarstellung (sehr wichtig):**
- **Built-in memory (`MEMORY.md` / `USER.md`) bleibt IMMER aktiv** — Provider sind additiv
- Es kann **nur ein externer Provider gleichzeitig aktiv** sein (Code: `agent_init.py:1455` lädt genau einen)
- Wechseln = `hermes memory setup` oder `hermes memory off` für deaktivieren
- Built-in Memory-Limit (2200/1375 chars) ist unabhängig vom Provider

## Quick-Comparison

| Provider | Lokal? | API-Key nötig? | LLM für Fact-Extraction | Kosten | Was es besonders macht |
|---|---|---|---|---|---|
| **holographic** | ✅ SQLite | ❌ | ❌ (kein LLM) | 0€ | Fact-Store mit trust scoring, FTS5 search, HRR-compositional retrieval |
| **hindsight** | optional | optional | ✅ (dein minimax/Kimi) | 0€ lokal, ~$ cloud | Knowledge Graph, Entity Resolution, auto-recall |
| **honcho** | optional | ✅ | ✅ (dein minimax) | free tier, $ beyond | User-Modeling mit Dialectic-Reasoning, Peer-Cards |
| **mem0** | ✅ OSS-mode | optional | ✅ | free tier / $ cloud | LLM-extrahierte Facts, hybrid retrieval |
| **openviking** | ✅ server | ❌ (lokal) | ✅ (VLM) | 0€ | Filesystem-artige Hierarchie (`viking://` URIs), ByteDance |
| **supermemory** | ❌ cloud | ✅ | ✅ | API pricing | Auto-Ingest der ganzen Session, profile-aware |
| **byterover** | ✅ CLI | optional | optional | $ cloud optional | Hierarchical Knowledge Tree mit `brv` CLI |
| **retaindb** | � cloud | ✅ ($20/mo minimum) | ✅ | $20+/mo | 7 memory types, hybrid search |

## Was deine bestehenden Keys bringen

| Provider | Wie es deine Keys nutzt |
|---|---|
| **holographic** | Gar nicht — kein LLM, nur SQLite |
| **hindsight** (local_embedded) | Nutzt `minimax` oder `kimi` für Fact-Extraction → **kostet nur die günstigsten Tokens die du sowieso zahlst** |
| **hindsight** (cloud) | API-Key bei hindsight.vectorize.io → eigener Abo |
| **honcho** | Nutzt `minimax` für Dialectic-Calls; benötigt zusätzlich Honcho-Account (free tier reicht) |
| **mem0** (OSS mode) | Nutzt `minimax` oder `openai`/`claude` für Extraction |
| **mem0** (platform) | Mem0-Cloud-Abo |
| **openviking** | Eigener Server; Embedding+VLM-Modell separat (OpenAI-Key, oder lokal) |
| **supermemory** | API-Key bei Supermemory Cloud (eigener Abo) |
| **byterover** | Local-first, optional `BRV_API_KEY` für Cloud-Sync |
| **retaindb** | $20/mo Minimum |

## Was die Provider untereinander macht — Konkurrenz oder Synergie?

**Architektur-Realität:** Es kann nur EIN Provider zur selben Zeit aktiv sein. Sie sind also **konkurrierend** in der Aktivierung, aber **komplementär** in der Funktion:

- holographic + hindsight lösen ähnliche Probleme (lokal, Fakten-basiert) → **du wählst eins**
- honcho + mem0 lösen ähnliche Probleme (LLM-Fact-Extraction mit Cloud-Optionalität) → **du wählst eins**
- openviking ist anders (Filesystem-Hierarchie statt Fact-Graph)
- supermemory + retaindb sind reine Cloud-Lösungen

**Built-in (`MEMORY.md`) ist nicht "Konkurrenz" sondern Fundament** — alle Provider arbeiten ON TOP davon und syncen ihre Writes zurück zu MEMORY.md (siehe Docstring oben: "Mirrors built-in memory writes to the external provider").

## Detail-Erklärungen — was jeder macht

### Holographic (lokal, kostenlos, kein LLM)
- **Was:** SQLite-DB mit FTS5-Volltextsuche. Jeder Fakt hat einen trust-score (0.0–1.0), du kannst sie per Tool als helpful/unhelpful bewerten → Trust passt sich an.
- **Tool-API:** `fact_store` (9 actions: add/search/probe/related/reason/contradict/update/remove/list), `fact_feedback`
- **Besonderheit:** Hat einen **HRR-Modus** (Holographic Reduced Representations) — Vektor-Komposition für "Was weiß ich über Marcus + was macht er gerade → relevante Fakten ableiten". Ohne LLM, nur lineare Algebra.
- **Wann ideal:** Wenn du viele **konkrete Fakten** sammelst (Personen, Tools, Projekte, Entscheidungen) und per Suche dran willst.
- **Wann nicht:** Wenn du abstrakte Reasoning-Queries brauchst ("was hat Marcus in den letzten 3 Wochen beschäftigt?") → da fehlt das LLM.

### Hindsight (lokal-embedded, Cloud, oder Local-External)
- **Was:** Knowledge-Graph mit Entity-Resolution. Jeder Fakt ist typisiert (`observation`, `world`, `experience`). Auto-Recall feuert vor jedem Turn und sucht die Top-N relevanten Fakten.
- **Tool-API:** `hindsight_retain` (speichern), `hindsight_recall` (suchen), `hindsight_reflect` (LLM-synthetisierte Antwort auf eine Frage aus allen Fakten)
- **Besonderheit:** "Observations" sind konsolidierte Fakten — Rohdaten werden dedupliziert und zu Beliefs zusammengefasst mit proof-counts. Macht die Suche token-effizient.
- **Wann ideal:** Wenn du strukturierte Knowledge-Queries willst ("Was weiß ich über X?", "Welche Projekte hatte ich mit Marcus 2026?").
- **Wann nicht:** Wenn du nur 10 Fakten speicherst → Overhead lohnt nicht.
- **Lokal-Modus:** Spin-up PostgreSQL-Daemon, nutzt deinen `minimax`-Key für Extraction. Daemon-Logs unter `~/.hermes/logs/hindsight-embed.log`.

### Honcho (Cloud + Self-hosted)
- **Was:** Speziell für **User-Modeling**. Baut eine kontinuierlich aktualisierte Repräsentation von dir auf, plus Session-Summaries. Hat Dialectic-Reasoning — eine LLM-Pass-Pipeline die "Wer ist diese Person, was beschäftigt sie jetzt?" ableitet.
- **Tool-API:** `honcho_profile`, `honcho_search`, `honcho_context`, `honcho_reasoning`, `honcho_conclude`
- **Besonderheit:** **Zwei-Layer-Context-Injection**: Base-Layer (statisch, in System-Prompt) + Dialectic-Layer (dynamisch, alle N turns). Cadence konfigurierbar (`contextCadence`, `dialecticCadence`).
- **Wann ideal:** Wenn du den Agent **langfristig auf dich trainieren** willst — Honcho lernt deine Präferenzen, Schreibstil, Themen über Wochen.
- **Wann nicht:** Wenn du nur Projekt-Wissen speichern willst → overkill, dafür ist holographic/hindsight besser.

### Mem0 (Cloud Platform v3 oder OSS self-managed)
- **Was:** Server-seitige LLM-Fact-Extraction. Du gibst einen Text, Mem0 extrahiert strukturierte Fakten (mit Deduplizierung, Konflikterkennung, Updates).
- **Tool-API:** Nicht im Detail dokumentiert, aber Standard: add/search/update/delete
- **Besonderheit:** Hybrid retrieval (Vector + BM25 + Reranking wenn platform mode).
- **Wann ideal:** Wenn du viele unstrukturierte Konversationen hast und der Agent automatisch Fakten extrahieren soll.
- **Wann nicht:** Wenn du die Kontrolle über welche Fakten gespeichert werden behalten willst.

### OpenViking (lokal, eigener Server)
- **Was:** Filesystem-artige Hierarchie mit `viking://`-URIs. Konzept: Memory organisiert wie ein Filesystem, mit Navigation.
- **Tool-API:** `viking_search`, `viking_read`, `viking_browse`, `viking_remember`
- **Besonderheit:** Tiered retrieval (fast → deep → auto). Built von ByteDance/Volcengine.
- **Wann ideal:** Wenn du viel mit **Dokumenten** arbeitest und Memory wie ein Wissens-Tree strukturieren willst.
- **Wann nicht:** Wenn du nur simple Facts brauchst.

### Supermemory (Cloud only)
- **Was:** Auto-Ingest ganzer Sessions — eine Session wird am Ende als Ganzes ingestet → reichhaltigere Profile.
- **Tool-API:** `memory_search`, `memory_add`, `memory_get_profile` (geschätzt, nicht vollständig dokumentiert)
- **Besonderheit:** `container_tag` mit `{identity}` Template → pro Profil eigene Container. `auto_capture` default ON.
- **Wann ideal:** Wenn du **alle** deine Sessions automatisch in einen Langzeit-Speicher haben willst, ohne manuell zu curaten.
- **Wann nicht:** Wenn du Datenschutz-Bedenken hast (Cloud-only) oder Curating-Kontrolle behalten willst.

### ByteRover (lokal, optional Cloud)
- **Was:** Hierarchical Knowledge Tree mit `brv` CLI. Tiered retrieval: fuzzy text → LLM-driven.
- **Tool-API:** `brv_query`, `brv_curate`, `brv_status`
- **Besonderheit:** **CLI-first** — du kannst `brv` direkt aus dem Terminal benutzen, ohne den Agent zu fragen.
- **Wann ideal:** Wenn du gerne **manuell** am Memory arbeitest (CLI-Style).
- **Wann nicht:** Wenn du alles über Agent-Tool-Calls machen willst.

### RetainDB (Cloud only, $20/mo)
- **Was:** Hybrid Search (Vector + BM25 + Reranking), 7 Memory-Types (semantic, episodic, procedural, etc.).
- **Tool-API:** `retaindb_profile`, `retaindb_search`, `retaindb_context`, `retaindb_remember`, `retaindb_forget`
- **Besonderheit:** Memory-Type-System → du kannst Facts als "episodic" (einmaliges Ereignis) oder "semantic" (generelles Wissen) taggen.
- **Wann ideal:** Wenn du **typisierte Memories** willst (Ereignis vs. Wissen vs. Prozedur).
- **Wann nicht:** Bei $20/mo ohne klaren Use-Case — eher was für später.

## Empfehlung für dein Setup

**Dein Stack:** minimax (MiniMax-M3/M2.7), Kimi, OpenAI, Claude Keys — alle günstig.

**Stufe 1 (Quick-Win, 0€):** `holographic` aktivieren
- Nutzt keinen deiner Keys, läuft lokal, sofort da
- Bringt dich von 2200 chars auf mehrere MB SQLite
- Migration der aktuellen 12 Einträge ist manuell (aber klein)

**Stufe 2 (wenn holographic an Grenzen stößt, 0€):** `hindsight` lokal-embedded
- Nutzt deinen `minimax`-Key (günstigste Stufe) für Fact-Extraction
- PostgreSQL-Daemon läuft im Hintergrund
- Besseres Reasoning via Knowledge-Graph + reflect-tool

**Stufe 3 (wenn du User-Modeling willst, free tier):** `honcho`
- Nutzt deinen `minimax`-Key für Dialectic-Reasoning
- Lernt dich über Wochen kennen
- Free tier reicht erstmal

**Nicht empfohlen für dich:**
- **mem0 cloud** — doppelt zu honcho, doppelt zu zahlen
- **openviking** — gut für Dokument-Hierarchien, nicht für deinen Use-Case (du curatest manuell, nicht viele Dokumente)
- **supermemory** — Cloud-only, Datenschutz-Risiko
- **retaindb** — $20/mo ohne klaren Mehrwert über holographic/honcho hinaus
- **byterover** — Nische, CLI-first nicht dein Pattern

## Was "zusammen funktionieren" angeht

Provider selbst können **nicht** parallel laufen (Architektur-Limit). Aber:

1. **Built-in `MEMORY.md` läuft IMMER mit** — egal welcher Provider aktiv ist
2. **Provider-Einträge werden zu `MEMORY.md` zurückgespiegelt** (siehe Doc oben)
3. **Du kannst jederzeit wechseln** — `hermes memory off` → anderen Provider → `on`. Einträge aus altem Provider bleiben in dessen Storage (sqlite/cloud), werden nicht gelöscht.

→ Du bist nicht "locked-in". Probier holographic 2 Wochen, wenn's nicht reicht → hindsight. Beide haben eigene Datenspeicher.
