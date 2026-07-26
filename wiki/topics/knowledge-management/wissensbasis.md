# Knowledge Management — LLM Wiki Pattern

## Überblick

Wissensmanagement, LLM Wiki Pattern nach Karpathy.

## Karpathy LLM Wiki Pattern

**Prinzip:** Das Wiki ist ein persistent compounding artifact — kein RAG, keine Chat-History.

**Drei Schichten:**
1. Rohquellen (unveränderlich)
2. Wiki-Synthese (LLM pflegt)
3. Schema/Konstitution

**Kern-Unterschied zu RAG:**
- RAG: LLM "entdeckt" Wissen bei jeder Anfrage neu
- Wiki: Wissen ist bereits synthetisiert, verdichtet, verwoben

**Wichtige Regeln:**
- Quellen immer zitieren
- Keine Halluzinationen
- Immer loggen (Datum + Was)
- Offene Punkte pflegen
- Cross-References setzen

## Workflows

| Workflow | Beschreibung |
|----------|-------------|
| Ingest | Neue Source → Extrahieren → wissensbasis.md erweitern → log.md |
| Query | Summary scannen → wissensbasis.md → Antwort mit Citations |
| Lint (monatlich) | Widersprüche, veraltete Info, Orphans, Lücken |

## Relevant

- `wiki/WIKI-SCHEMA.md` — Betriebsanleitung
- `skills/custom/wiki-maintenance/` — Skill für Wiki-Pflege
- Karpathy Gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f


## Lokaler RAG-Stack (geplant)

Ergänzend zum Wiki-Pattern plant Marcus einen lokalen RAG-Stack für „Wissen das ich nicht selbst kuratiere":

- **Ollama** als lokales LLM-Backend (32B-Modelle, z.B. Qwen 3 32B)
- **Qdrant 1.18+** als Vektor-DB (Mai 2026 mit nativem TurboQuant)
- **TurboVec** als zusätzliche Quantization-Schicht (10M Chunks in 4GB)
- **Open WebUI** als Frontend
- **SearXNG** für Web-Suche (kompensiert teilweise Knowledge-Cutoff)

Use Case: Web-Recherche, fremde Papers, Buch-Exzerpte — Dinge, die kein Wiki-Eintrag werden, aber abgefragt werden sollen.

## Warum Wiki + RAG, nicht „nur RAG"

RAG allein funktioniert NICHT für Marcus' Anwendungsfall:

- **RAG „entdeckt"** Wissen bei jeder Anfrage → keine Kuration, keine Konsolidierung
- **Wiki „akkumuliert"** Wissen über Monate → compounding artifact, wie Karpathy es nennt
- **RAG ist gut für Volumen** (Paper-Suche), Wiki für Tiefe (eigene Praxis)
- **Hybrid:** Wiki für selbst-erarbeitetes Wissen, RAG für externe Quellen

Die beiden Systeme ergänzen sich, sie konkurrieren nicht.

## Editorial Guidelines (Sprachpräferenz & Konventionen)

*Stand 2026-07-26*

Wiki-Topics sind die „Verfassung" des persönlichen Wissensstands. Wenn hier was an Geschmeidigkeit verliert, leidet die ganze Practice. Daher ein paar leichtgewichtige Konventionen, die das Wiki auch in 2 Jahren noch lesbar machen.

### Sprachpräferenz — Deutsch, genauer

- **Deutsch ist Default** — fachliche Anglizismen nur, wo eingebürgert (z.B. „Deployment", „Pipeline", „Cache-Buster")
- **Natürliche Konstruktionen statt nominalisierter Inversions:**
  - ✅ „Maut in Polen" — ❌ „Polen-Maut"
  - ✅ „Festival in Breitenbach" — ❌ „Breitenbach-Festival"
  - ✅ „Reise nach Reims" — ❌ „Reims-Reise"
  - **Faustregel:** Was sagt man im Gespräch? So schreiben.
- **Ortsnamen-Adjektive sparsam** — lieber „Festival in Breitenbach am Herzberg" statt „Breitenbach-Festival". Wenn es einen offiziellen Eigennamen gibt (Schloss Bellevue, Hotel Adlon), dann den.
- **Dativ-/Possessiv-Vermeidung wo möglich:** „Hilfe für Container-Logs" statt „Container-Logs-Hilfe"

### Struktur-Konventionen

- **Topic = wissensbasis.md + log.md** (siehe WIKI-SCHEMA.md)
- **Headings:** `##` Top-Level, `###` Sub. Keine `####` (zu tief → eigene Subpage)
- **Citationen:** `Source: <path#line>` wenn Memory-Snippet zitiert wird, sonst reicht URL/Datum
- **Cross-References:** `→ [[topic-name]]` immer vor dem nächsten `##` einfügen, nie als letzter Bullet verstecken
- **Datums-Stempel:** `*Stand YYYY-MM-DD — Optional: Kontext*` als erster Sub-Bullet unter `##` wenn sich der Inhalt schnell ändert (z.B. Projekte, DBs)
- **Tabellen sparsam:** Eine Tabelle statt 5 Bullet-Listen wenn 3+ Spalten oder 4+ Zeilen

### Was NICHT ins Wiki gehört

- **Tageslogs** → `memory/YYYY-MM-DD.md` (Memory-System, nicht Wiki)
- **Codex-/Engineering-Files** → working-notes Repo + engineering/ (Codex-Scope)
- **Private-Resilience-Dokumente** → `private/` (nur Marcus + Phoenix)
- **Tool-Generated State** → `HEARTBEAT.md`, `briefings/`, Reports (rekonstruierbar)

### Tone

- **Sachlich, knapp, ohne Filler.** Kein „Great question!" oder „I'd be happy to help" — gilt auch im Wiki.
- **Meinungen ja, aber markiert:** „*Stand der Meinung: 2026-07-26, könnte sich ändern.*" Style.
- **Humor sparsam:** Wiki ist Arbeitswerkzeug, nicht Twitter.

## Cross-References

- → [[ai-ml]] — Knowledge Management + AI
- → [[productivity-tools]] — Obsidian als KM-Tool
- → [[rook-hermes-bridge]] — Archive, Manifest, Deduplizierung, Prune Planning
- → [[personal-travel]] — Themen-Anwendung (Caravan-Sommer-2026 / Ostsee-Tour)

