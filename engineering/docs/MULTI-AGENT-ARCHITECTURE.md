# Multi-Agent & System-Architektur — Entwurf v2

> **Status:** Analyse/Entscheidungsphase — noch NICHT umsetzen
> **Datum:** 2026-03-27
> **Quellen:** OpenClaw Docs, ChatGPT Architektur-Analyse, Ecosystem-Recherche

---

## Leitprinzip

> **Nicht forken. Erweitern.**
> OpenClaw als unveränderte Basis lassen. Neue Features als Plugins, Hooks oder separate UI.
> Upstream-Updates bleiben trivial (`openclaw update`).

---

## 1. Gateway als Control Plane (bereits vorhanden)

OpenClaw ist bereits ein Orchestrator:
- Multiplexed Port (18789): WebSocket + HTTP APIs + Web UI
- OpenAI-kompatible Endpoints (`/v1/chat/completions`, `/v1/models`)
- Control UI als statisches SPA (Vite + Lit)
- Session Tools für Inter-Agent-Kommunikation

**→ Wir brauchen KEIN orchestrierendes Backend drumherum.**

---

## 2. Multi-Agent Architektur

### Agent-Portfolio (Start-Design)

| Agent | Rolle | Model-Policy | Sandbox |
|-------|-------|-------------|---------|
| **Rook (Main)** | Persönlicher Front-Door, Orchestrator | Bestes Model + Fallbacks | Nein |
| **Coach** | Mental + Physical Health, Reflexion | Empathisches Model | Nein |
| **Engineer** | Code, DevOps, Architektur | Code-starkes Model | Ja (Sandbox) |
| **Researcher** | Digital Capitalism, Literatur | Langer Kontext | Nein |
| **Health** | Ernährung, Bewegung, Tracking | Günstiges Model (Routine) | Nein |

### Setup per Agent

```bash
openclaw agents add coach
openclaw agents add engineer
openclaw agents add researcher
openclaw agents add health
```

Jeder Agent bekommt:
- Eigene Workspace (`~/.openclaw/workspace-<agentId>/`)
- Eigene `SOUL.md`, `AGENTS.md`, `USER.md`
- Eigenes Memory (`memory/`)
- Eigene Skills (`skills/`)
- Eigene Auth-Profile und Sessions

### Routing (Bindings)

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace" },
      { id: "coach", workspace: "~/.openclaw/workspace-coach" },
      { id: "engineer", workspace: "~/.openclaw/workspace-engineer" },
      { id: "researcher", workspace: "~/.openclaw/workspace-researcher" },
      { id: "health", workspace: "~/.openclaw/workspace-health" }
    ]
  },
  bindings: [
    // Telegram Haupt-Chat → Rook (Main)
    // Telegram Topics/Gruppen → Spezialisierte Agenten
    // Oder: Rook delegiert intern via Sub-Agents
  ]
}
```

### Koordination

- **Parallelität:** Über mehrere Sessions/Sub-Agents (nicht innerhalb einer Session)
- **Delegation:** `sessions_spawn` für Mikrotasks, `sessions_send` für Abstimmung
- **Feedback-Loop-Schutz:** `REPLY_SKIP` und `ANNOUNCE_SKIP` nutzen
- **Serialisierung:** Agent-Loop pro Session ist serialisiert (Queueing/Lanes)

### Model-Strategie pro Agent

```
Main:     Primary: Kimi K2.5 → Fallback: OpenAI GPT-4
Engineer: Primary: Code-Model → Fallback: Kimi (tool-calling stabil halten!)
Coach:    Primary: Empathisches Model → Fallback: GPT-4
Research: Primary: Langer Kontext → Fallback: Kimi
Health:   Primary: Günstiges Model (Routine-Tasks)
```

OpenClaw-Mechanik: Primary → Auth-Profile Rotation → Cooldown → nächstes Model in Fallbacks

---

## 3. Dashboard/UI-Strategie

### Entscheidung: Separate UI (Option C)

**NICHT** OpenClaw forken. Stattdessen: Eigenes Dashboard als separates Projekt.

```
OpenClaw (unverändert)          Unser Dashboard (eigenes Repo)
┌─────────────────────┐        ┌──────────────────────────┐
│ Gateway (Port 18789) │◄──────│ WebSocket + HTTP Client   │
│ - Control UI (orig.) │        │ - Token-Monitoring        │
│ - WebSocket Protocol │        │ - Cron-Manager            │
│ - HTTP APIs          │        │ - Memory Browser          │
│ - Session History    │        │ - System Health (CPU/RAM) │
│ - Tools Invoke       │        │ - To-Do Übersicht         │
└─────────────────────┘        │ - Graph-Visualisierung    │
                                └──────────────────────────┘
```

### Genutzte APIs

| API | Zweck |
|-----|-------|
| WebSocket Protocol | Live-Updates, Agent-Status |
| `GET /sessions/{key}/history` | Session-History + SSE Follow |
| `POST /tools/invoke` | Tool-Aktionen (mit Auth) |
| `/v1/models` | Verfügbare Models |
| Gateway Auth (Bearer Token) | Authentifizierung |

### Tech-Stack (Vorschlag)

- **Framework:** Next.js oder Vite + React (wie TenacitOS)
- **Styling:** Tailwind CSS
- **Datenbank:** SQLite (für historische Metriken)
- **Referenz-Code:** TenacitOS (Features cherry-picken)
- **Repo:** `MarcusGraetsch/rook-dashboard` (eigenes Repo)

### Vorteile gegenüber Fork

| | Fork | Separate UI |
|---|---|---|
| Upstream-Updates | ⚠️ Merge-Konflikte | ✅ Unabhängig |
| Entwicklungsgeschwindigkeit | Langsam (Core verstehen) | Schnell (nur APIs) |
| Community-Contribution | Möglich, aber komplex | Eigenes Produkt |
| Risiko | Hoch (Core-Änderungen) | Niedrig (API-basiert) |

---

## 4. Erweiterbarkeit: Plugins & Hooks

### Plugins (für neue Capabilities)

OpenClaw Plugin-System mit typed SDK:
- Provider (neue LLM-Provider)
- Channels (neue Messaging-Plattformen)
- Tools (neue Werkzeuge)
- Speech, Media Understanding, Web Search

**→ Eigene Skills und Tools als Plugins bauen, nicht als Core-Änderungen.**

### Hooks (Event-basierte Automation)

- Laufen im Gateway bei Events
- Für Logging, Guardrails, Lifecycle-Automationen
- Entdeckung über Verzeichnisse

**→ Monitoring, Alerting, Token-Tracking als Hooks implementieren.**

---

## 5. Self-Improvement & CI/CD

### Governance-Regel

> **Agent darf Änderungen erzeugen — aber NICHT direkt deployen.**

```
Agent (isolierter Branch)
  → Commit
    → PR öffnen
      → CI/Tests (GitHub Actions)
        → Review (Mensch)
          → Merge
            → Deploy (clean worktree → openclaw update kompatibel)
```

### Warum?

1. `openclaw update` verlangt clean worktree — dirty Changes = Update scheitert
2. Rückverfolgbarkeit: Welcher Code läuft tatsächlich?
3. Sicherheit: Kein "root by proxy" durch unkontrollierte Agent-Änderungen

### Branch-Policy

- `main` = Production (Branch Protection, PR required)
- `agent/*` = Agent-generierte Branches
- Pre-push Hooks: TruffleHog (Secret Scanner)
- CI: Build + Test vor Merge

---

## 6. Sicherheit

### Trust Boundaries

- Gateway = vertrauenswürdiger Operator-Boundary
- Multi-User auf einem Gateway = geteilte Tool-Autorität (Risiko!)
- Per-Agent Sandbox/Tool-Policy setzen

### Checkliste

- [ ] Sandboxing für Engineer-Agent aktivieren
- [ ] Tool-Policies pro Agent definieren
- [ ] TruffleHog Pre-Push Hooks installieren
- [ ] `openclaw security audit` regelmäßig laufen lassen
- [ ] Rescue Gateway einrichten (zweite Instanz, anderer Port)
- [ ] Secrets NUR in Env-Vars oder SecretRef, NIE in Git

---

## 7. Operative Resilienz

### Rescue Gateway

Zweite OpenClaw-Instanz auf anderem Port:
- Wenn Main-Bot down/misconfig → Rescue-Bot hilft beim Fix
- Eigenes Profile, eigener Port (Port-Spacing beachten für CDP)
- Minimale Konfiguration, nur SSH + Shell Tools

---

## 8. SwarmClaw (wenn wir es brauchen)

Erst relevant wenn:
- Mehrere Gateways nötig (verschiedene VMs)
- Fleet-Management über Hosts hinweg
- Enterprise-Level Orchestration

Für jetzt: **Ein Gateway, mehrere Agents reicht.**

---

## Zusammenfassung: Was wir tun / nicht tun

| Tun | Nicht tun |
|-----|-----------|
| ✅ Multi-Agent über `openclaw agents add` | ❌ Einen "Super-Agent" bauen |
| ✅ Separate Dashboard-UI (eigenes Repo) | ❌ OpenClaw Core forken |
| ✅ Plugins/Hooks für neue Features | ❌ Core-Code ändern |
| ✅ Model-Policy pro Agent | ❌ Ein Model für alles |
| ✅ PR-basierte Self-Improvement | ❌ Agent schreibt direkt ins Prod |
| ✅ Rescue Gateway als Backup | ❌ Nur einen Gateway ohne Fallback |

---

## Nächste Schritte (wenn Architektur finalisiert)

1. [ ] Multi-Agent Setup: `openclaw agents add coach/engineer/researcher/health`
2. [ ] Dashboard-Repo erstellen: `MarcusGraetsch/rook-dashboard`
3. [ ] Gateway Protocol studieren (WebSocket + HTTP APIs)
4. [ ] TenacitOS Code als Referenz klonen
5. [ ] Erste Plugin/Hook experimentieren
6. [ ] Model-Fallbacks konfigurieren (Kimi + OpenAI)
7. [ ] Security Audit + Rescue Gateway

---

*DRAFT v2 — Basiert auf OpenClaw Docs + ChatGPT Architektur-Analyse + Ecosystem-Recherche*
*Letzte Aktualisierung: 2026-03-27*
