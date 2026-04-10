# Wiki Schema — LLM Knowledge Base nach Karpathy Pattern

> Stand: 2026-04-10

## Das Prinzip

Das Wiki ist ein **persistent compounding artifact** — kein RAG, keine Chat-History, sondern eine strukturierte, wachsende Wissensbasis.

```
Rohquellen (conversations/, papers/, podcasts/)
         ↓ Ingest
Synthetisiertes Wiki (wissensbasis.md pro Topic)
         ↓ Query
Antworten, Analysen, Connections
```

## Drei Schichten

| Schicht | Ort | Unveränderlich |
|---------|-----|----------------|
| Rohquellen | `wiki/conversations/` | ✅ |
| Synthese | `wiki/topics/*/wissensbasis.md` | ✗ (LLM pflegt) |
| Schema | `wiki/WIKI-SCHEMA.md` | ✗ (Konstitution) |

## Topic-Struktur

Jeder Topic hat:
- `wissensbasis.md` — Hauptsynthese
- `summary.md` — Conversations-Überblick
- `log.md` — Chronik (wird bei Ingest angelegt)

## Workflows

**Ingest:** Neue Source → Extrahieren → wissensbasis.md erweitern → Cross-Refs → log.md

**Query:** Summary scannen → wissensbasis.md lesen → Antwort mit Citations

**Lint (monatlich):** Widersprüche, veraltete Info, Orphans, Lücken

## Regeln

1. Rohquellen nie ändern
2. Keine Halluzinationen — alles quellenzitiert
3. Immer loggen (Datum + Was)
4. Offene Punkte pflegen
5. Cross-References setzen
