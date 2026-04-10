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
