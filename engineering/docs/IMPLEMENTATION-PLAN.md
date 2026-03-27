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

### 1.3 Routing/Bindings konfigurieren
- [ ] Telegram Topics → Spezialisierte Agenten (via `openclaw agents bind`)
- [ ] Oder: Rook delegiert intern via Sub-Agents

---

## Phase 2: Dashboard / UI 🚧

### 2.1 Dashboard Repo erstellen 🚧
- [x] `MarcusGraetsch/rook-dashboard` Repo angelegt
- [x] Tech-Stack: Next.js 14 + Tailwind
- [x] Basis-Layout mit Sidebar
- [ ] WebSocket + HTTP Client für Gateway-API
- [ ] Token-Monitoring (Clawmetry-konzept)
- [ ] Cron-Manager
- [ ] Memory Browser
- [ ] Session-Übersicht

### 2.2 Dashboard Features (Priorität)
1. ~~Token-Monitoring~~ → Clawmetry-konzept
2. ~~Cron-Manager~~ → Basis gelegt
3. ~~Memory Browser~~
4. ~~System Health (CPU/RAM)~~ → Basis gelegt
5. ~~Session-Übersicht~~ → Basis gelegt

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

## Phase 4: Sicherheit & Resilienz

### 4.1 Security Checklist
- [ ] Sandboxing für Engineer-Agent
- [ ] Tool-Policies pro Agent
- [ ] `openclaw security audit`
- [ ] Rescue Gateway auf zweitem Port

### 4.2 Rescue Gateway
- [ ] Zweite OpenClaw-Instanz auf anderem Port
- [ ] Minimale Konfiguration (SSH + Shell Tools)

---

## Phase 5: Self-Improvement CI/CD

### 5.1 Branch-Policy
- [ ] `main` = Production (Branch Protection)
- [ ] `agent/*` = Agent-generierte Branches
- [ ] Pre-push Hooks: Secret Scanner

### 5.2 Agent-Governance
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

## Phase 6: Health & Symptom Tracker (Quick Win)

### 6.1 Use Case: Telegram-basiert
- [ ] Health-Agent für Ernährungs-Tracking
- [ ] Via Telegram Bot (einfachster Weg)
- [ ] Privacy-First: Separate Google-Account

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

*Letzte Aktualisierung: 2026-03-27 (Phase 1 + 2 gestartet)*
