# HEARTBEAT.md

# Periodische Checks für laufende Projekte

## Projekt-Monitoring
- Prüfe bei jedem Heartbeat den Status dieser Repos:
  - `rook-dashboard` (Labor Footprint, Dashboard Features)
  - `digital-capitalism-research` (Research Pipeline, HRW etc.)
  - `rook-agent` (Core Config, Tool-Policies)

- Wenn sich seit dem letzten Heartbeat **Commits** geändert haben:
  - Fasse kurz zusammen (max. 5 Zeilen):
    - Repo + letzter Commit-Hash
    - Was wurde implementiert / gefixt?
    - Gibt es offene Blocker?

- Wenn sich **nichts** geändert hat:
  - Antworte nur mit `HEARTBEAT_OK`.

## Kanban-Monitoring
- Prüfe Kanban-Board "Rook System" auf Tickets mit `assignee` in {rook, engineer, researcher, coach, health}.
- Besonders relevant:
  - Tickets in Spalte `Ready` oder `In Progress`
  - mit Label `labor` oder `high`/`urgent` Priority

- Wenn neue oder unbeachtete Tickets für einen Agenten existieren:
  - Berichte kurz (max. 3 Zeilen):
    - z.B. "Engineer: 1 Ready-Ticket (Labor: Metrics-Engine – Exposure + Coverage)"
    - z.B. "Researcher: 1 Backlog-Ticket mit hoher Priorität"

- Rook entscheidet dann, ob der entsprechende Agent explizit getriggert werden soll.

## Regeln
- Keine künstlichen Aktionen auslösen (kein Build, kein Deploy), nur lesen + berichten.
- Keine neuen großen Tasks starten, wenn Heartbeat kommt – nur Status berichten.
- Politisch sensible/ethische Änderungen klar benennen.

# Hinweis für Marcus
# Du musst nichts tun: Heartbeat läuft über OpenClaw. Wenn sich an den
# beobachteten Projekten etwas tut, bekommst du ein kompaktes Update.
