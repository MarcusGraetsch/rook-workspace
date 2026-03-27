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
