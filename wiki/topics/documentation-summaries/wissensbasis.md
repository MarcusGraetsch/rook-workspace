# Documentation Summaries — Sammlung

## Überblick

Misc-Bucket für Conversations die keinem spezifischen Technical Topic zugeordnet wurden. Enthält Projekt-Zusammenfassungen, Meeting Notes, technische Reviews und Konzeptpapiere.

## Enthaltene Themen

- **Projekt-Zusammenfassungen:** Abrundung von Projekten, Lessons Learned
- **Meeting Notes:** Archivierungen von Besprechungen
- **Technische Reviews:** Code-Reviews, Architektur-Diskussionen
- **Konzeptpapiere:** Theoretische Überlegungen zu Tools und Prozessen

## Strukturierung

Diese Conversations sind thematisch in andere Topics einsortiert worden. Die Sammlung dient als"letzte Reserve" für Themen die noch kein Zuhause haben.

## Wichtige Docs

| Pfad | Beschreibung |
|------|-------------|
| `wiki/WIKI-OVERVIEW.md` | Gesamtübersicht |
| `wiki/WIKI-SCHEMA.md` | Betriebsanleitung |
| `topics/*/wissensbasis.md` | Synthetisiertes Praxiswissen |
| `topics/*/summary.md` | Conversations-Überblick (noch nicht implementiert) |

## Wann nutzt man dieses Topic?

- Ein Dokument passt nirgends rein
- Ein Dokument ist zu Meta (über das Wiki selbst)
- Ein Dokument ist ein Misc ohne klaren Bezug


## Triage-Prozess für Misc-Conversations

Wenn eine Conversation keinem spezifischen Technical Topic zugeordnet werden kann, läuft folgender Triage-Flow:

1. **Hat einen klaren Topic-Bezug?** → einsortieren in `topics/<match>/wissensbasis.md`
2. **Ist Meta (Wiki/Workflow selbst)?** → bleibt hier, evtl. als Hinweis auf Schema
3. **Ist punktuell ohne Anschluss?** → bleibt hier mit Stichwort + Datum
4. **Ist wirklich Müll / Duplikat?** → Prune-Planning-Cron nimmt es raus

Wichtig: **Lieber zu viel hier parken** als falsch einsortieren. Falsche Topic-Zuordnung ist schlimmer als Misc-Bucket.

## Wiki-Lint-Beziehung

Dieses Topic ist ein Sonderfall im Wiki-Lint: Es DARF dünn bleiben, weil es bewusst Sammelbecken ist. Wenn der Lint hier „Orphan" meldet, ist das kein echtes Problem — der Cron-Job `Wiki Bi-Monthly Lint` (dc1ddcd4-…) hat Auto-Repair für Struktur, nicht für Inhalt.

Der Lint-Check sortiert `documentation-summaries` strukturell mit ein, weil das Wiki-Schema es als reguläres Topic führt. Inhaltliche Pflege bleibt manuell.

## Archiv-Strategie

- **Retention:** Misc-Conversations 6 Monate sichtbar, dann ins Cold-Archive (`archive/`)
- **Suchbarkeit:** Stichworte + Datum reichen — kein Volltext-Index nötig
- **Cold-Archive-Pfad:** `archive/<yyyy>/<mm>/misc-<topic>.md`

## Cross-References

- → [[knowledge-management]] — Wiki-Struktur, Ingest-Prozess
- → [[documentation-summaries]] — (Self-referential, Meta-Topic)

---

*Zuletzt aktualisiert: 2026-06-28*
