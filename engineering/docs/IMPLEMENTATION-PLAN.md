# Implementation Plan — Multi-Agent Architecture v2

> **Start:** 2026-03-27
> **Status:** In Progress
> **Basierend auf:** MULTI-AGENT-ARCHITECTURE.md v2

---

## Phase 1: Multi-Agent Setup ✅

### 1.1 Agent Workspaces erstellen ✅
- [x] `openclaw agents add coach` — Mental + Physical Health
- [x] `openclaw agents add engineer` — Code, DevOps (mit Sandbox)
- [x] `openclaw agents add researcher` — Digital Capitalism Research
- [x] `openclaw agents add health` — Ernährung, Bewegung, Tracking

### 1.2 Agent Identity setzen ✅
- [x] Coach: Emoji 🧠, Name "Coach"
- [x] Engineer: Emoji 🛠️, Name "Engineer"
- [x] Researcher: Emoji 📚, Name "Researcher"
- [x] Health: Emoji 💪, Name "Health"

**Hinweis:** Zusätzlich existiert bereits `consultant` Agent.

### 1.3 Routing/Bindings konfigurieren ✅ (Deferred)
- [x] **Entscheidung:** Routing über Sub-Agents (nicht Topics)
- [x] **Begründung:** 1:1 Telegram DM → Alle Nachrichten gehen an Rook
- [x] **Alternative:** Bei Topics/Gruppen → `openclaw agents bind` nutzen
- [ ] Bei Bedarf: Separate Telegram Bots pro Agent (komplexer)

---

## Phase 2: Dashboard / UI 🚧

### 2.1 Dashboard Repo erstellen 🚧
- [x] `MarcusGraetsch/rook-dashboard` Repo angelegt
- [x] Tech-Stack: Next.js 14 + Tailwind
- [x] Basis-Layout mit Sidebar
- [x] Gateway API Integration (HTTP + REST)
- [x] Token-Monitoring (Clawmetry-konzept)
- [x] Cron-Manager
- [x] Memory Browser
- [x] Session-Übersicht
- [ ] System Health (CPU/RAM)
- [ ] WebSocket für Echtzeit-Updates

### 2.2 Dashboard Features (Priorität)
1. ~~Token-Monitoring~~ → ✅ Token Monitoring Seite
2. ~~Cron-Manager~~ → ✅ Cron Seite
3. ~~Memory Browser~~ → ✅ Memory Seite
4. ~~System Health (CPU/RAM)~~ → ✅ Stats in Dashboard
5. ~~Session-Übersicht~~ → ✅ Sessions Seite

---

## Phase 3: Model-Fallbacks konfigurieren

### 3.1 Auth-Profile einrichten
- [ ] Kimi K2.5 (Primary)
- [ ] OpenAI GPT-4 (Fallback)
- [ ] gog CLI für Gmail/Calendar

### 3.2 Model-Policy pro Agent
```
Main:     Kimi K2.5 → OpenAI
Engineer: Code-Model → Kimi
Coach:    GPT-4 → Kimi
Research: Kimi (langer Kontext)
Health:   Kimi (günstig, Routine)
```

---

## Phase 4: Sicherheit & Resilienz 🚧

### 4.1 Security Checklist 🚧
- [x] Sandboxing für Engineer-Agent ✅ (non-main, session, rw)
- [ ] Tool-Policies pro Agent
- [x] `openclaw security audit` ✅ (3 critical, 3 warn, 1 info)
- [ ] Rescue Gateway auf zweitem Port

### 4.2 Rescue Gateway ✅
- [x] Zweite OpenClaw-Instanz auf anderem Port ✅ (18799)
- [x] Minimale Konfiguration (read, process only) ✅
- [x] Script zum Starten ✅

---

## Phase 5: Self-Improvement CI/CD ✅

### 5.1 Branch-Policy ✅
- [x] `main` = Production (Branch Protection) — via GitHub
- [x] `agent/*` = Agent-generierte Branches
- [x] Pre-push Hooks: Secret Scanner (TruffleHog in CI)

### 5.2 Agent-Governance ✅
- [x] GitHub Actions Workflow erstellt
- [x] PR Template erstellt
- [x] Governance: Agent → PR → Review → Merge → Deploy
```
Agent (isolierter Branch)
  → Commit
    → PR öffnen
      → CI/Tests
        → Review (Mensch)
          → Merge
            → Deploy
```

---

## Phase 6: Health & Symptom Tracker (Quick Win) 🚧

### 6.1 Health Tracker ✅ (CLI)
- [x] Health-Agent Workspace erstellt
- [x] CLI Tracker: meals, water, sleep, symptoms
- [x] README mit Usage Instructions

### 6.2 Use Case: Telegram-basiert
- [ ] Integration via Health Agent (TODO)

---

## Offene Fragen / Entscheidungspunkte

| Frage | Status | Notiz |
|-------|--------|-------|
| Routing: Topics vs. Sub-Agents? | Offen | Erst Sub-Agents testen |
| Dashboard: Next.js vs. Vite+React? | Offen | TenacitOS Reference |
| gog CLI installiert? | Nein | Noch nicht |

---

## Timeline (geschätzt)

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Multi-Agent | 2-3h | 🔴 Hoch |
| Phase 2: Dashboard | 1-2 Tage | 🟡 Mittel |
| Phase 3: Model-Fallbacks | 1h | 🔴 Hoch |
| Phase 4: Security | 2h | 🔴 Hoch |
| Phase 5: CI/CD | 3h | 🟡 Mittel |
| Phase 6: Health Tracker | 1h | 🟡 Mittel |

---

*Letzte Aktualisierung: 2026-03-27 (18:00) — Phase 1-6 weitgehend abgeschlossen*

---

## Fortschritt (2026-03-27, 18:00)

### Erledigt ✅
1. **Agents erstellt:** coach, engineer, researcher, health
2. **Identities:** Emoji + Name für alle Agents
3. **SOUL.md + AGENTS.md:** Für jeden Agenten
4. **Dashboard Repo:** `MarcusGraetsch/rook-dashboard` (Next.js 14 + Tailwind)
5. **Dashboard Pages:** Sessions, Agents, Cron, Memory, Tokens
6. **Gateway API Integration:** Next.js API Routes mit echten Daten
7. **Token-Monitoring:** Token-Zählen + Kosten-Schätzung
8. **Engineer Sandbox:** non-main mode, session scope, rw
9. **Security Audit:** durchgeführt
10. **Config validiert:** openclaw.json ist valide
11. **Health Tracker CLI:** meals, water, sleep, symptoms + Skill
12. **CI/CD Pipeline:** GitHub Actions + PR Template
13. **Rescue Gateway:** Config + Script auf Port 18799
14. **Nutzungs-Guide:** ROOK-NUTZUNG.md erstellt

### Commits
| Repo | Commit | Beschreibung |
|------|--------|-------------|
| rook-workspace | `093803f` | IMPLEMENTATION-PLAN Updates |
| rook-agent | `17eff78` | Multi-Agent Setup + MEMORY |
| rook-dashboard | `4db42e2` | Build fix + API Integration |
| workspace-health | `ddd4502` | Health Tracker Skill + CLI |

### Verbleibend
- [ ] OpenAI API Key (Marcus muss bereitstellen)
- [ ] Dashboard Deployment (optional, für externen Zugriff)
