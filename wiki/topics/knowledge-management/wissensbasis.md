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

## Cross-References

- → [[ai-ml]] — Knowledge Management + AI
- → [[productivity-tools]] — Obsidian als KM-Tool
- → [[rook-hermes-bridge]] — Archive, Manifest, Deduplizierung, Prune Planning

