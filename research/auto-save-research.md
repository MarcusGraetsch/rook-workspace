# Auto-Save Research

## Problem
Research-Ergebnisse (z.B. KI-Chronologie) werden generiert aber nicht automatisch zu GitHub committed. Die Dateien existieren nur in der Session und gehen verloren wenn die Session endet.

## Lösung: Auto-Save Skill

### Was es tut
- Nach jeder Datei-Erstellung: `git add` + `git commit` + `git push`
- Automatisch, ohne extra Anweisung
- Für alle Dateien in `research/`, `projects/digital-research/`, `wiki/`

### Implementierung
- Skill: `auto-save-research`
- Cron: Alle 30 Minuten check ob es uncommitted changes gibt
- Hook: Nach jeder `write`-Aktion automatisch commit

### Status
- 🚧 Noch nicht implementiert
- Nächster Schritt: Skill erstellen

## Workaround (bis Skill fertig)
Nach jeder Recherche-Session manuell:
```bash
cd /root/.openclaw/workspace
git add research/ projects/digital-research/ wiki/
git commit -m "auto: research update $(date -I)"
git push
```

## Betroffene Dateien (verloren gegangen)
- KI-Chronologie Runde 3 + 4 (43 Dateien)
- Wurden in Session erstellt aber nicht persistiert
- Memory beschreibt sie, aber Dateien existieren nicht auf Disk

---
*Erstellt: 2026-06-08*
