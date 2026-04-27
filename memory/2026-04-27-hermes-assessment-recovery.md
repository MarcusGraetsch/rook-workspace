# Hermes Phoenix Assessment — Recovery from Telegram Chat

> **Hinweis:** Diese Diskussion fand in einer Session statt, die durch das Contabo-Backup vom 24. Apr 2026 überschrieben wurde. Der Inhalt wurde aus dem Telegram-Chat-Verlauf wiederhergestellt.

---

## Hermes Agent — Deep Dive Assessment

**Source:** https://github.com/nousresearch/hermes-agent  
**License:** MIT  
**Backer:** Nous Research  
**Install:** `curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash`

---

## OpenClaw vs Hermes — Feature Comparison

| Feature | OpenClaw | Hermes |
| --- | --- | --- |
| Self-Learning | Nein | ✅ Ja — Skills verbessern sich während Nutzung |
| Memory System | Manuell (MEMORY.md) | ✅ Agent-curated + FTS5 Session Search |
| Skill Auto-Creation | Nein | ✅ Ja — nach komplexen Tasks |
| User Modeling | Manuell (USER.md) | ✅ Honcho dialektisch |
| MCP Integration | ⚠️ begrenzt | ✅ Vollständig |
| 40+ Tools | Basis | ✅ Umfangreich |
| Messaging | Telegram, Discord | ✅ Telegram, Discord, Slack, WhatsApp, Signal, Email |
| OpenClaw Migration | — | ✅ `hermes claw migrate` |
| Cron Scheduling | ⚠️ via cron tool | ✅ Natürliche Sprache, eingebaut |
| Model-Agnostisch | Kimi + MiniMax + Codex | ✅ Alle (OpenRouter, Nous Portal, Kimi, etc.) |
| Cloud Deployment | VM | ✅ Daytona, Modal, Docker, SSH |
| Kosten bei Idle | Mittel | ✅ <$5 VPS, serverless |

---

## Was Hermes BESSER kann

1. **Lern-Schleife** — Skills werden nach komplexen Tasks autonom erstellt
2. **Session Search** — FTS5 Full-Text-Search in eigenen Gesprächen
3. **User Profiling** — Honcho baut "who you are" Modell auf
4. **Model Switching** — `hermes model` ohne Config-Änderung
5. **Voice Memo Transcription** — eingebaut
6. **Multi-Platform** — Telegram + Discord + Slack + WhatsApp + Signal

---

## Was OpenClaw BESSER kann

1. **ACP Framework** — Multi-Agent Orchestration (subagents)
2. **Workspace-Integration** — AGENTS.md, SOUL.md, MEMORY.md — vollständige Kontrolle
3. **Bestehende Config** — Config, Cron-Jobs, Memory, Skills laufen schon
4. **Rook-Persona** — Spezifische Persönlichkeit mit kontinuierlichem Kontext
5. **TaskFlow** — Durable Flow Substrate für langlaufende Tasks

---

## Praktische Optionen

### Parallelbetrieb
```bash
hermes model minimax/MiniMax-M2.7  # Für einfache Tasks
openclaw / rook                     # Für komplexe Workspace-Arbeit
```

### Migration
```bash
hermes claw migrate              # Automatisch Config + Memory + Skills
hermes claw migrate --dry-run    # Preview
```

---

## Status nach Backup-Recovery (2026-04-27)

- Hermes war installiert auf der VM zwischen 24. und 27. Apr
- Contabo-Backup vom 24. Apr hat Hermes gelöscht
- Keine Memory-Dateien im rook-workspace Repo gefunden
- Chat-Verlauf in Telegram erhalten
- Dieses Dokument dient als Recovery der Diskussion

---

## Empfohlene nächste Schritte

1. **Nicht jetzt migrieren** — VM stabilisieren (✅ erledigt)
2. **OpenClaw updaten** — pending (Version 2026.4.15, Update vom 25. Apr verfügbar)
3. **Hermes parallel testen** — Docker oder zweite VM
4. **Dry-run Migration** — `hermes claw migrate --dry-run` anschauen
5. **Datenbasierte Entscheidung** — nach 1-2 Wochen Parallelbetrieb

---

## Cross-Agent Delegation — Idee (2026-04-27)

**Marcus' Frage:** Können Hermes und OpenClaw bestimmte MD-Dateien teilen und sich Aufgaben delegieren?

### Konzept: Shared Memory + Intent-Routing

```
User-Anfrage
    ↓
[Router] — analysiert Intent
    ↓
    ├─→ OpenClaw (Rook) — Workspace, Code, Multi-Agent, TaskFlow
    └─→ Hermes — Quick Tasks, Learning, Session Search, Multi-Platform
```

### Was teilen könnten

| Ressource | Ort | Hermes | OpenClaw | Risiko |
|-----------|-----|--------|----------|--------|
| **SOUL.md** | `~/.openclaw/workspace/SOUL.md` | ✅ `hermes claw migrate` importiert | ✅ Native | Konflikte bei gleichzeitigem Schreiben |
| **USER.md** | `~/.openclaw/workspace/USER.md` | ✅ Importiert | ✅ Native | Gleichzeitige Updates |
| **MEMORY.md** | `~/.openclaw/workspace/MEMORY.md` | ✅ Importiert | ✅ Native | **High Risk** — beide schreiben |
| **Tägliche Logs** | `memory/YYYY-MM-DD.md` | ⚠️ Eigene Struktur | ✅ Native | Format-Unterschiede |
| **Skills** | `skills/` | ✅ agentskills.io Standard | ✅ Eigenes Format | Konvertierung nötig |
| **Task-State** | `operations/tasks/` | ❌ Nicht kompatibel | ✅ Native | **Inkompatibel** |

### Delegations-Szenarien

**OpenClaw → Hermes:**
- "Erinner mich in 2 Stunden" → Hermes Cron (besseres NLP)
- "Was hab ich letzte Woche über Kubernetes gesagt?" → Hermes Session Search
- "Schnelle Recherche: was ist neu bei Digital Capitalism?" → Hermes (schneller, weniger Kontext)

**Hermes → OpenClaw:**
- "Bau mir ein Dashboard für meine IDP-Plattform" → OpenClaw (Code, Repos, ACP)
- "Organisiere meine Research-Tasks" → OpenClaw (TaskFlow, Kanban)
- "Code Review für dieses Repo" → OpenClaw (GitHub, Subagents)

### Technische Umsetzung

**Option A: File-Watcher + Symlinks**
```bash
# Shared Memory Verzeichnis
mkdir ~/shared-agent-memory
ln -s ~/shared-agent-memory/SOUL.md ~/.openclaw/workspace/SOUL.md
ln -s ~/shared-agent-memory/SOUL.md ~/.hermes/workspace/SOUL.md

# Beide lesen, aber nur einer schreibt (Lock-File)
```
- **Problem:** Race Conditions, Konflikte
- **Lösung:** Einer als "Master" für jew. Datei bestimmen

**Option B: Git-basierte Synchronisation**
```bash
# Shared Repo für Memory
# OpenClaw pusht MEMORY.md, Hermes pullt
# Hermes pusht Session-Insights, OpenClaw pullt
```
- **Vorteil:** Versioniert, Konflikte sichtbar
- **Nachteil:** Latenz, Merge-Overhead

**Option C: Message-Passing (API/Webhook)**
```bash
# Hermes hat eingebauten RPC für Subagents
# OpenClaw kann HTTP-Requests senden
# Delegation via einfache API
```
- **Vorteil:** Saubere Trennung
- **Nachteil:** Custom Code nötig

**Option D: Master-Slave Architektur**
```
OpenClaw = Master (Workspace, Tasks, Code)
Hermes = Slave (Quick Queries, Search, Reminders)

Hermes darf USER.md/SOUL.md lesen, aber nicht schreiben
OpenClaw schreibt in MEMORY.md, Hermes konsumiert
```

### Empfohlene Architektur

```
┌─────────────────────────────────────────┐
│           Telegram (User)               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Intent Router (simple)          │
│  "Code/Task/Repo" → OpenClaw            │
│  "Search/Reminder/Learn" → Hermes       │
└─────────────────────────────────────────┘
        ↓                           ↓
┌──────────────┐          ┌──────────────────┐
│   OpenClaw   │◄────────►│     Hermes       │
│   (Master)   │  sync    │   (Read-Only)    │
│              │  SOUL.md │                  │
│              │  USER.md │                  │
└──────────────┘          └──────────────────┘
        ↓                           ↓
┌──────────────┐          ┌──────────────────┐
│ rook-workspace│         │  Hermes Memory   │
│ GitHub Repo   │         │  (lokal/hermes)   │
└──────────────┘          └──────────────────┘
```

**Regeln:**
1. OpenClaw alleiniger Schreiber für SOUL.md, USER.md, MEMORY.md
2. Hermes liest diese Dateien (via Symlink oder Kopie beim Start)
3. Hermes schreibt nur in eigene Session-Logs
4. Cron-Job synct Memory in beide Richtungen (stündlich)
5. Kein gleichzeitiger Schreibzugriff

### Realistische Einschätzung

**Geht:**
- SOUL.md/USER.md teilen (Read-Only für Hermes)
- Delegation via einfache Keywords
- Hermes für Quick-Tasks, OpenClaw für Deep-Work

**Schwierig:**
- Bidirektionale Synchronisation (Race Conditions)
- Hermes Session-Logs → OpenClaw Memory (Format-Mismatch)
- Task-State Sharing (komplett inkompatible Strukturen)

**Nicht sinnvoll:**
- Beide gleichzeitig in MEMORY.md schreiben lassen
- Hermes soll OpenClaw-Tasks verwalten
- Komplexe Router-Logik (over-engineering)

### MVP für Parallelbetrieb

1. **Hermes installieren** mit `--dry-run` Migration
2. **Symlinks** für SOUL.md + USER.md (Read-Only)
3. **Einfache Keywords** für Delegation:
   - `/hermes` oder `@hermes` → Hermes antwortet
   - `/rook` oder Standard → OpenClaw antwortet
4. **Täglicher Sync** der Session-Highlights via Cron

---

## Cross-Agent Delegation — Rook's Antwort (2026-04-27 23:41)

> **Das ist eine GENIALE Idee! Und es ist technisch machbar.**

### Architektur: Paralleles Multi-Agent System

```
┌─────────────────────────────────────────────────────────────┐
│ Gemeinsamer Workspace                                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ MEMORY.md    │ │ USER.md      │ │ AGENTS.md     │       │
│ │ (gemeinsam)  │ │ (gemeinsam)  │ │ (gemeinsam)   │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ memory/      │ │ workspace/   │ │ skills/       │       │
│ │ (gemeinsam)  │ │ (geteilt)    │ │ (eigen)       │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
┌─────────────────────┐    ┌─────────────────────────┐
│ OpenClaw            │    │ Hermes                  │
│                     │    │                         │
│ 🦅 Rook             │    │ 🤖 (noch unnamed)       │
│ • Engineering       │    │ • Self-Learning         │
│ • Workspace         │    │ • Multi-Platform        │
│ • Coding            │    │ • General Tasks         │
│ • Docs/Repos        │    │ • Knowledge             │
│                     │    │                         │
│ Commands:           │    │ Commands:               │
│ /hermes <prompt>    │    │ /openclaw <prompt>      │
│ "frag hermes"       │    │ "frag rook"             │
└─────────────────────┘    └─────────────────────────┘
         │                         │
         ▼                         ▼
   Telegram Bot          Telegram Bot (oder gleicher?)
   @rook                 @hermes-agent
```

### Cross-Referral Mechanismus

**Rook sagt: "Das ist was für Hermes..."**
- Wenn: Self-Learning, Multi-Platform, Persönliche Fragen, Allgemeines Wissen
- Dann: "Frag Hermes: /hermes <umformulierte_anfrage>"

**Hermes sagt: "Das ist was für Rook..."**
- Wenn: Coding, Workspace, Repos, Docs, Engineering, Spezifisches Wissen
- Dann: "Frag Rook: /openclaw <umformulierte_anfrage>"

### Shared Memory Rules (Vorschlag)

| File | Read | Write | Conflict Resolution |
|------|------|-------|---------------------|
| MEMORY.md | Beide | Beide | Last-write-wins mit Lock |
| USER.md | Beide | Beide | Last-write-wins mit Lock |
| memory/YYYY-MM-DD.md | Beide | Beide | Append-only (kein Conflict) |
| workspace/docs/ | Beide | Beide | Git-basiert |
| Rook-spezifische Files | Read | Rook | — |
| Hermes-spezifische Files | Read | Hermes | — |

### Technische Umsetzung (Vorschlag)

1. **Gleicher Workspace** — beide nutzen `~/.openclaw/workspace/`
2. **Separate Session-Dirs** — `agents/rook/` vs `~/.hermes/sessions/`
3. **Atomic Writes** — MEMORY.md mit temp+rename
4. **Append-Only Daily Notes** — kein Lock nötig
5. **Zwei Telegram Bots** — @rook und @hermes (oder gleicher Bot mit /hermes Command)

### Nächste Schritte (Vorschlag)

1. Hermes installieren (`curl -fsSL ...`)
2. Migration Tool nutzen (`hermes claw migrate`)
3. Shared Workspace konfigurieren
4. Cross-Referral Skills erstellen
5. Zwei Telegram Bots aufsetzen

---

## Recovery Status

| Quelle | Status |
|--------|--------|
| Hermes GitHub Repo | ✅ Wiederhergestellt |
| Feature Comparison | ✅ Wiederhergestellt |
| Marcus' Delegation-Idee | ✅ Wiederhergestellt |
| Rook's Architektur-Antwort | ✅ Wiederhergestellt |
| Git-Commit (sicher) | ✅ Erledigt |

---

*Komplette Diskussion wiederhergestellt aus Telegram-Chat am 2026-04-27*


