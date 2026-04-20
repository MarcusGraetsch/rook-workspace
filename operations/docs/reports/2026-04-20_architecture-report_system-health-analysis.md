# Architecture Report: System Health Analysis

**Date:** 2026-04-20  
**Scope:** Full OpenClaw multi-agent system at `~/.openclaw/`  
**Analyst role:** Senior platform engineer / system maintainer  

---

## 1. Lagebild

### Laufende Komponenten

| Komponente | Mechanismus | Status |
|---|---|---|
| `openclaw-gateway` | Direktprozess (PID 125807) | Live, 81h Uptime |
| `rook-dashboard` | PM2 (fork mode) | Live, 35h Uptime, 7 Restarts |
| Dispatcher | On-demand (Hook / Discord) | Kein Persistenz-Loop |
| Discord Bridge | On-demand Aufruf | Kein Persistenz-Loop |
| Cron-Jobs | OpenClaw built-in Scheduler | 3 aktiv, 7 disabled |

### Agent-Inventar

8 definierte Agenten in `openclaw.json`:

- **rook** — Hauptkoordinator, Telegram + Discord, kein Sandbox
- **engineer** — Code/DevOps, Workspace `workspace-engineer`, sandboxed
- **researcher** — Recherche, Web-Zugriff, kein exec-Tool
- **test** — Testing, sandboxed  
- **review** — Code-Review, sandboxed
- **coach** — Life/Work Coach, kein exec/web_search
- **health** — Gesundheits-Agent, stark eingeschränkt
- **dispatcher** — One-shot Dispatcher, nur read/exec

### Task-Inventar (Stand: 2026-04-20)

| Status | Anzahl |
|---|---|
| done | 26 |
| backlog | 26 |
| completed* | 3 |
| intake | 2 |
| **Gesamt** | **57** |

*`completed` ist kein valider Status in der health.ts-Derivationslogik.

### Modell-Konfiguration

Alle Agenten: `minimax/MiniMax-M2.7` als primäres Modell.  
Dispatcher nutzt: `minimax-portal/MiniMax-M2.7` (Hook-Modus), Fallback `kimi-coding/k2p5`.

---

## 2. Befunde

### Befund 1 (KRITISCH): Falscher "error"-Status auf 3 Agenten

**Betroffene Agenten:** engineer, researcher, review  
**Ursache:** `deriveStatus()` in `health.ts` Zeile 180 liest `github_issue.last_error` aus **jedem** zugewiesenen Task — unabhängig vom Task-Status.

14 Backlog-Tasks haben veraltete `github_issue.last_error`-Felder aus fehlgeschlagenen GitHub-Sync-Versuchen:
- 4 Tasks (ops-0004/0005/0007/0008): GitHub-Issues existieren, sind aber closed → PATCH gibt 422
- 10 Tasks (ops-0020 bis ops-0027, ops-0032/0033): GitHub-Issues wurden gelöscht → 404

Diese Fehler passieren bei inaktiven Backlog-Tasks und haben null operative Relevanz. Trotzdem macht die Logik den kompletten Agenten als `error` sichtbar.

**Auswirkung:** Dashboard zeigt drei Agenten dauerhaft im Error-Zustand, obwohl kein aktiver Fehler vorliegt. Verschleiert echte Fehler.

### Befund 2 (MITTEL): Inkonsistenter Task-Status `completed`

3 Tasks haben Status `completed` statt `done`:
- `dashboard-0045` (engineer, completed 2026-04-18)
- `dashboard-0048` (engineer, kein completed_at)
- `ops-0040` (engineer, completed 2026-04-19)

`completed` ist kein definierter Status in `health.ts` (nicht in `done`-Array). Diese Tasks erscheinen nirgendwo korrekt.

### Befund 3 (NIEDRIG, auto-heilend): Cron-Job "Community Intelligence" mit 2 Fehlern

**Fehler:** `ERR_MODULE_NOT_FOUND` für `run-context.runtime-CemwwCKN.js` — ein veralteter Modul-Hash aus openclaw 2026.4.14  
**Aktueller Stand:** OpenClaw ist 2026.4.15 installiert, der korrekte Hash heißt `run-context.runtime-Cx9f6z-7.js`  
**Nächster Run:** 2026-04-21 09:00 Berlin (in ~12h)  
**Einschätzung:** Selbstheilend — nächster Run verwendet die korrekte Binary. Wenn noch mal fehlt, muss Debug-Analyse folgen.

### Befund 4 (ARCHITEKTUR): Dispatcher hat keinen persistenten Polling-Loop

Der Dispatcher ist als **one-shot** Service konzipiert und wird nur manuell via Discord oder Hook ausgelöst. Kein systemd-Timer, kein Daemon. Dies ist eine bewusste Design-Entscheidung, bedeutet aber:

- Tasks werden **nicht automatisch** dispatcht wenn sie `ready` werden
- Abhängig von manuellem Trigger (Discord `dispatch canonical task <ID>`)
- Alle 7 heartbeat-basierten Cron-Jobs sind `enabled: false`

Das System ist damit **reaktiv** statt **proaktiv** orchestriert.

### Befund 5 (BEOBACHTBARKEIT): Health Snapshots haben kein automatisches Refresh

Die `runtime/operations/health/*.json` Snapshots werden nur geschrieben wenn:
1. `POST /api/control/health` aufgerufen wird (Dashboard-Trigger)  
2. Kein anderer Mechanismus (kein Timer, kein Daemon)

Konsequenz: Die Snapshots können veralten. Der Dashboard-Refresh-Button ist die einzige Aktualisierungsquelle.

---

## 3. Arbeitsplan (diese Session)

| Prio | Maßnahme | Typ | Aufwand |
|---|---|---|---|
| P1 | `github_issue.last_error` aus 14 Backlog-Tasks löschen | Datenfixup | klein |
| P2 | `deriveStatus()` so ändern, dass nur aktive Tasks `github_issue.last_error` liefern | Code-Fix | klein |
| P3 | 3 Tasks von `completed` → `done` normalisieren | Datenfixup | trivial |
| P4 | Dashboard rebuild + Validierung | Verifikation | mittel |

---

## 4. Umgesetzte Änderungen

### P1: Stale `github_issue.last_error` bereinigt (Datenfixup)

- **14 kanonische Task-Dateien** in `workspace/operations/tasks/rook-workspace/`: `last_error → null`, `sync_status → not_requested`
- **15 Runtime-Overlay-Dateien** in `runtime/operations/task-state/rook-workspace/`: gleiche Bereinigung
- Ursache für Runtime-Overlay-Fixup: `mergeSyncRecord()` schreibt Runtime-Wert zurück wenn kanonischer Wert `null` ist ("leer" → Runtime-Wert gewinnt). Beide Quellen müssen konsistent sein.
- Zusätzlich: 3 Tasks mit `completed`-Status zu `done` normalisiert: `dashboard-0045`, `dashboard-0048`, `ops-0040`
- `ops-0030` (done): stale `last_error` ebenfalls bereinigt

### P2: `deriveStatus()` Code-Fix in `health.ts`

- **Datei:** `src/lib/control/health.ts`
- **Änderung:** `github_issue.last_error` Fallback-Check filtert jetzt inactive Tasks heraus: `['backlog', 'done', 'completed', 'archived', 'cancelled']`
- **Zweck:** Defense-in-depth — verhindert dass zukünftige Sync-Fehler auf inaktiven Tasks die Agent-Health beeinflussen
- Dashboard rebuilt (`npm run build` → 0 Fehler) und via PM2 neu gestartet

### Commits

- `48195d5` — `fix(health): exclude inactive tasks from github_issue error surfacing` (rook-dashboard)
- `f03b360` — `fix(tasks): clear stale github_issue.last_error from 14 backlog tasks` (rook-workspace)
- `1913b09` — `chore: update rook-dashboard submodule + session architecture report`

Beide Repositories gepusht nach GitHub.

---

## 5. Validierung

- `npm run build` in `rook-dashboard` → exit 0, keine TypeScript-Fehler
- Compiled health route enthält korrekt: `a.filter(t=>!_.has(t.status))` mit `_=Set(["backlog","done","completed","archived","cancelled"])`
- `POST /api/control/health` vor Fix: 3 Agenten mit `status: error`
- `POST /api/control/health` nach Fix: 7 Agenten, **alle ohne `last_error`**, statuses: `idle` (5x), `offline` (1x health - expected)
- Stichprobe Datendateien: `ops-0027.json`, `ops-0005.json`, `ops-0030.json` — `last_error: null` bestätigt

---

## 6. Nächste sinnvolle Schritte

Nach dieser Session:

1. **Dispatcher-Monitoring:** Klären ob ein lightweight Polling-Timer (z.B. alle 5 Min) sinnvoll ist, oder ob der manuelle Trigger ausreicht. Dokumentieren.
2. **Health Snapshot Refresh:** Evaluieren ob ein automatisches Refresh (z.B. via Heartbeat-Cron) sinnvoll wäre, um das Dashboard ohne manuellen Trigger aktuell zu halten.
3. **Cron-Job Community Intelligence:** Nach nächstem Run prüfen ob selbstheilend oder weitere Intervention nötig.
4. **GitHub Issue Sync Strategie:** Klären ob PATCH auf closed Issues sinnvoll ist (aktuell: schlägt fehl). Sync-Logik für closed/deleted Issues absichern.
