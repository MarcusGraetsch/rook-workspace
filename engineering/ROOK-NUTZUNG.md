# Rook Nutzung — Quick Start Guide

> Stand: 2026-03-27

---

## Was ist eingerichtet?

### 1. Multi-Agent System

| Agent | Emoji | Workspace | Zweck |
|-------|-------|-----------|-------|
| **Rook** | 🦅 | `~/.openclaw/workspace` | Haupt-Assistent (du chattest gerade damit) |
| **Coach** | 🧠 | `~/.openclaw/workspace-coach` | Mental + Physical Health |
| **Engineer** | 🛠️ | `~/.openclaw/workspace-engineer` | Code, DevOps (sandboxed) |
| **Researcher** | 📚 | `~/.openclaw/workspace-researcher` | Digital Capitalism Research |
| **Health** | 💪 | `~/.openclaw/workspace-health` | Ernährung, Schlaf, Bewegung |

### 2. Dashboard

**Repo:** `https://github.com/MarcusGraetsch/rook-dashboard`

Features:
- Session-Übersicht
- Agent-Status
- Token-Nutzung + Kosten
- 📋 Kanban Board (Project Management)
- Cron-Job Verwaltung
- Memory Browser

### 📋 Kanban Board

- Multiple Boards (Research, Consulting, Buch, etc.)
- Full workflow columns: `Backlog -> Intake -> Ready -> In Progress -> Testing -> Review -> Blocked -> Done`
- AI ticket refinement from rough human text
- Drag&Drop Tasks zwischen Spalten
- Priority (low/medium/high/urgent)
- Labels
- Due Dates
- Lokal gespeichert (SQLite)

### 3. Health Tracker CLI

Einfacher CLI für Gesundheits-Tracking:

```bash
# Wasser loggen
health water 5

# Mahlzeit
health meal 08:30 "Haferflocken mit Obst"

# Schlaf
health sleep 7.5 gut

# Bewegung
health exercise Spaziergang 30

# Symptom
health symptom Kopfschmerzen mittel

# Heutigen Log anzeigen
health log
```

---

## Wie nutze ich das?

### Dashboard starten

```bash
cd /root/.openclaw/workspace/engineering/rook-dashboard
npm install  # einmalig
npm run dev
```

Dann öffne: `http://localhost:3000`

**Hinweis:** Das Dashboard läuft local auf der VM. Für externen Zugriff:
- SSH Tunnel: `ssh -L 3000:localhost:3000 root@vmd151897`
- Oder: Dashboard auf Hosting deployen (Vercel, Railway, etc.)

### Kanban mit Intake-Workflow nutzen

Der neue Ticket-Fluss ist jetzt:

`Backlog -> Intake -> Ready -> In Progress -> Testing -> Review -> Done`

Praktisch heißt das:

1. Neue Idee in `Backlog` oder direkt in `Intake` anlegen.
2. Im Ticket-Fenster die rohe Beschreibung in **AI Ticket Intake** schreiben.
3. Auf **Refine Ticket** klicken.
4. Das System erzeugt:
   - besseren Titel
   - klarere, agent-taugliche Beschreibung
   - vorgeschlagene Labels / Assignee
   - Checklist
   - Repo-/Projekt-Vorschlag
   - kurze Refinement-Zusammenfassung
5. Wenn das Ticket gut genug strukturiert ist, nach `Ready` verschieben.

Die Verfeinerung ist jetzt aufgabentyp-sensitiv:

- Entwicklungsarbeit wird als Ausführungsauftrag mit Scope, Implementierungsziel und Validierung formuliert.
- Research-Tickets werden als Forschungsauftrag mit Frage, Quellenlage, Findings und offenem Rest formuliert.
- Consulting-/Strategie-Tickets werden als Entscheidungs- oder Empfehlungsvorlage mit Optionen, Tradeoffs und nächsten Schritten formuliert.
- Die Checklist wird bei freien Fließtext-Briefs nicht mehr bloß aus den eingegebenen Sätzen kopiert, sondern als Arbeitsstruktur für den zuständigen Agenten erzeugt.

Die Checklist soll deshalb nicht nur „Tasks sammeln“, sondern dem ausführenden Agenten eine brauchbare Arbeitsstruktur geben.

Wichtig:

- `Ready` ist jetzt absichtlich gated.
- Ein Ticket darf nur nach `Ready`, wenn es:
  - einen nicht-leeren `intake brief` hat
  - mindestens einen Checklist-Eintrag hat
- Falls ein Ticket noch roh ist, nutze **Send to Intake** oder verschiebe es in die `Intake`-Spalte.
- Tickets in `Intake` bekommen standardmäßig `coach` als Owner, wenn kein anderer Agent explizit gesetzt ist.

Faustregel:

- `Backlog`: lose Ideen / Parkfläche
- `Intake`: AI + Mensch strukturieren den Task
- `Ready`: dispatchbar
- `In Progress` bis `Done`: Ausführungspipeline

### Health Tracker nutzen

Der Health Agent (💪) kann direkt über Telegram angesprochen werden:

```
@rook Wasser 5 Gläser getrunken
@rook Heute 7 Stunden geschlafen, gut
@rook 30 Minuten Spaziergang gemacht
```

### Agent wechseln / delegieren

Im Chat mit Rook einfach sagen:
- „Frag den Engineer ob...“ → Engineer Sub-Agent
- „Check mal den Health Tracker“ → Health Sub-Agent
- „Recherchier was zu...“ → Researcher Sub-Agent

### Welcher Agent macht was im Ticket-Fluss?

| Phase | Typischer Owner |
|------|------------------|
| `Intake` | `coach` |
| `Ready` | koordinierbar / dispatchbar |
| `In Progress` | `engineer` oder anderer Specialist |
| `Testing` | `test` |
| `Review` | `review` |

Hinweis: Wenn Spezialisten instabil sind, kann die Pipeline intern noch Fallbacks nutzen. Die kanonische Task-Datei bleibt trotzdem die Quelle der Wahrheit.

### Aktuelle Konfiguration prüfen

```bash
# Agent Status
openclaw agents list

# Gateway Status
openclaw status

# Security Audit
openclaw security audit
```

---

## Architecture Übersicht

```
┌─────────────────────────────────────────────────────┐
│                    Telegram                          │
│                   (Marcus)                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│              OpenClaw Gateway                        │
│                 Port 18789                          │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │ Rook 🦅│  │Coach 🧠│  │Engineer🛠️│  │Research📚││
│  │  Main  │  │         │  │         │  │         ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘│
│       │            │            │            │       │
│       └────────────┴────────────┴────────────┘       │
│                      │                               │
│               Sub-Agent Delegation                  │
└─────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│               rook-dashboard                        │
│              (Next.js, Port 3000)                   │
│                                                      │
│  • Sessions      • Agents      • Token-Usage       │
│  • Cron          • Memory      • System Stats       │
└─────────────────────────────────────────────────────┘
```

---

## Verfügbare Commands

### Direkt im Telegram Chat mit Rook

| Command | Beschreibung |
|---------|--------------|
| `/new` | Neue Session starten |
| `/model` | Model wechseln |
| `/status` | Session-Status anzeigen |
| `Gesundheit` | Health Tracker starten |
| `Wasser 5` | Wasser loggen |

### Health Tracker (Health Agent 💪)

| Command | Beispiel |
|---------|----------|
| `Wasser <n>` | `Wasser 5` — 5 Gläser |
| `Schlaf <h> <q>` | `Schlaf 7.5 gut` |
| `Essen <z> <b>` | `Essen 08:30 Haferflocken` |
| `Bewegung <t> <m>` | `Bewegung Spaziergang 30` |
| `Symptom <b> <s>` | `Symptom Kopfschmerzen mittel` |
| `Health log` | Zeige heutigen Log |

---

## Scripts & Tools

| Pfad | Beschreibung |
|------|--------------|
| `~/.openclaw/workspace-health/scripts/health.sh` | Health Tracker CLI |
| `~/.openclaw/rook-agent/scripts/rescue-gateway.sh` | Rescue Gateway Starter |
| `~/.openclaw/rook-agent/scripts/sync-from-workspace.sh` | Workspace Sync |

---

## Cron Jobs

| Zeit | Job | Log |
|------|-----|-----|
| Täglich 02:00 | Workspace → rook-agent Sync | `/var/log/rook-sync.log` |
| Sonntags 08:00 | Research Pipeline | `workspace/research/cron.log` |
| Sonntags 02:00 | Google Drive Backup | `/var/log/weekly_backup.log` |

---

## Nächste Schritte (optional)

1. **OpenAI API Key** — Für Model Fallbacks
2. **Dashboard deployen** — Vercel/Railway für externen Zugriff
3. **Rescue Gateway testen** — `./scripts/rescue-gateway.sh`
4. **Health Agent Telegram** — Direkt mit Health Agent chatten

---

## Bei Problemen

### Gateway down?
```bash
# Rescue Gateway starten
~/.openclaw/rook-agent/scripts/rescue-gateway.sh
```

### Config kaputt?
```bash
# Backup prüfen
ls ~/.openclaw/openclaw.json.bak*
# Config validieren
openclaw config validate
```

### Workspace Sync?
```bash
~/.openclaw/rook-agent/scripts/sync-from-workspace.sh
```

---

*Fragen? Frag mich direkt.*
