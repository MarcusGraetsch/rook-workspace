# Multi-Agent Architektur — Entwurf (DRAFT)

> **Status:** Diskussion/Analyse — noch NICHT umsetzen
> **Datum:** 2026-03-27

---

## Ist-Zustand

- Ein Agent (Rook) in `~/.openclaw/workspace/`
- Rollenbasierte Ordner: coaching/, assistant/, engineering/, tasks/, archive/
- Alle Rollen teilen sich denselben Kontext/Session

## Soll-Zustand (Vorschlag)

Mehrere isolierte Agenten statt Ordner:

```
~/.openclaw/
├── workspace/                  # Rook (Main-Agent, Orchestrator)
├── workspace-coaching/         # Coach-Agent (Mental + Physical Health)
├── workspace-engineering/      # Engineer-Agent (Code, DevOps, Architektur)
├── workspace-health/           # Health-Agent (Ernährung, Bewegung, Tracking)
└── workspace-research/         # Research-Agent (Digital Capitalism)
```

### Jeder Agent hat:
- Eigene `SOUL.md` (spezialisierte Persönlichkeit)
- Eigene `AGENTS.md` (Regeln für diesen Bereich)
- Eigenes Memory (`memory/`)
- Eigene Skills (`skills/`)
- Eigene Sessions (keine Kontext-Verschmutzung)

### Routing (via OpenClaw Bindings):
- Telegram Haupt-Chat → Rook (Main)
- Telegram Topics/Gruppen → Spezialisierte Agenten
- Oder: Rook delegiert intern via Sub-Agents

## OpenClaw Multi-Agent Konzepte

### 1. Multi-Agent Routing
- Mehrere isolierte Agenten auf einem Gateway
- Routing via `bindings` in `openclaw.json`
- Jeder Agent = eigener Workspace + eigene Auth + eigene Sessions
- Setup: `openclaw agents add <name>`

### 2. Sub-Agents
- Hintergrund-Tasks, gespawnt aus einem Agent
- Eigene Session (`agent:<id>:subagent:<uuid>`)
- Ergebnis wird zurück an den Chat gemeldet
- Nützlich für parallele Tasks

### 3. Delegate Architecture
- Agenten handeln "on behalf of" Personen
- Für organisationale Setups

## Offene Fragen

1. Soll Rook der Orchestrator bleiben und an spezialisierte Agenten delegieren?
2. Oder sollen die Agenten unabhängig sein (eigene Telegram-Bots/Topics)?
3. Wie teilen die Agenten Wissen? (Shared Skills? Memory-DB? Oder explizite Übergaben?)
4. Welches Modell pro Agent? (z.B. Engineer = Code-Model, Coach = empathisches Model)
5. Token-Budget pro Agent? (Billiger Model für Routine, teurer für komplexe Tasks)
6. Wie passt das Dashboard (TenacitOS-Features) in die Multi-Agent-Architektur?
7. Noch zu analysierende Architektur-Fragen von Marcus (TBD)

## Referenzen

- https://docs.openclaw.ai/concepts/multi-agent
- https://docs.openclaw.ai/tools/subagents
- https://docs.openclaw.ai/concepts/delegate-architecture
- SwarmClaw: https://github.com/swarmclawai/swarmclaw
- TenacitOS: https://github.com/carlosazaustre/tenacitOS

---

*DRAFT — Nicht umsetzen bevor Architektur-Entscheidungen finalisiert sind.*
