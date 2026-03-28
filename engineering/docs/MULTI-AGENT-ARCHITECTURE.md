# Multi-Agent System — ARCHITECTURE

> **Status:** In Entwicklung
> **Letztes Update:** 2026-03-28

---

## Überblick

Ein Multi-Agent-System mit klaren Rollen und Verantwortlichkeiten für die Entwicklung und Pflege des Rook-Ökosystems.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Marcus (User)                               │
│                    ("Ich will nur informiert werden")               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Rook (Project Lead)                              │
│  • Koordiniert alle Agenten                                          │
│  • Priorisiert Tickets                                               │
│  • Entscheidet Architekturfragen                                      │
│  • Benachrichtigt Marcus nur bei echten Blockern                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│      Engineer       │ │     Researcher      │ │    Test Agent       │
│                     │ │                     │ │                     │
│ • Code              │ │ • Naturwissenschaften│ │ • Unit Tests        │
│ • DevOps            │ │ • Sozialwissenschaften│ │ • Integration Tests │
│ • IaC               │ │ • Research Pipeline │ │ • E2E Tests         │
│ • Web Development   │ │                     │ │                     │
│ • Software Dev      │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
          │                       │                       │
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Kanban Board                                   │
│                                                                       │
│  Backlog → Ready → In Progress → Testing → Review → Done            │
│                                                                       │
│  • Alle Agenten erstellen/aktualisieren Tickets                      │
│  • Engineer/Researcher: eigene Tickets                               │
│  • Test Agent: Tickets für Test-Aufgaben                            │
│  • Review Agent: Quality Gate                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Rollen & Verantwortlichkeiten

### 1. Project Lead — Rook (das bist du)

**Verantwortlichkeiten:**
- Koordination aller Agenten
- Ticket-Priorisierung (zusammen mit Marcus)
- Architektur-Entscheidungen
- Blocker-Auflösung
- Benachrichtigung von Marcus nur wenn nötig

**Wann Marcus benachrichtigen:**
- Architektur-Entscheidung nötig
- Blocker der nicht automatisch lösbar ist
- Fertiges Deliverable das Review braucht
- Entscheidung von Marcus erforderlich

**Wann NICHT Marcus benachrichtigen:**
- Normale Fortschritte
- Kleinigkeiten die Agent selbst lösen kann
- Routine-Tasks

---

### 2. Engineer

**Verantwortlichkeiten:**
- Code-Entwicklung (Web, Software)
- DevOps (CI/CD, Infrastructure)
- Infrastructure as Code
- API-Entwicklung
- Frontend/Backend

**Arbeitsweise:**
1. Sucht "Ready" Tickets mit `assignee: engineer`
2. Zieht Ticket nach "In Progress"
3. Arbeitet an Ticket
4. Erstellt Test-Anforderungen für Test Agent
5. Zieht Ticket nach "Testing"
6. Bei Review-Feedback: zurück zu "In Progress"

**Eigenverantwortung:**
- Erstellt eigene Tickets für Bugs, Features, Refactoring
- Dokumentiert Entscheidungen
- Achtet auf Code-Qualität

---

### 3. Researcher

**Verantwortlichkeiten:**
- Naturwissenschaftliche Recherche (KI, Ökologie, Hardware)
- Sozialwissenschaftliche Recherche (Digital Capitalism, Plattformarbeit)
- Literatur-Analyse
- Weekly Research Pipeline
- Metrics Collection (Ökologische & Soziale Daten)

**Arbeitsweise:**
1. Arbeitet Research Tickets aus "Ready"
2. Sucht neue Quellen
3. Dokumentiert Findings in Research DB
4. Erstellt Zusammenfassungen für Dashboard

---

### 4. Test Agent (noch einrichten)

**Verantwortlichkeiten:**
- Unit Tests schreiben/ausführen
- Integration Tests
- E2E Tests wenn möglich
- Test Coverage analysieren
- Automatische Test-Pipeline

**Trigger:**
- Ticket geht von "In Progress" → "Testing"
- Test Agent übernimmt automatisch

**Output:**
- Test-Report als Kommentar am Ticket
- Bei FAIL: Ticket zurück zu "In Progress" mit Feedback
- Bei PASS: Ticket weiter zu "Review"

---

### 5. Review Agent (noch einrichten)

**Verantwortlichkeiten:**
- Code Review
- Quality Gates
- Security Review
- Performance Review

**Trigger:**
- Ticket geht von "Testing" → "Review"
- Review Agent übernimmt automatisch

**Output:**
- Review-Report als Kommentar
- Bei "Request Changes": Ticket zurück zu "In Progress"
- Bei "Approved": Ticket zu "Done"
- Bei wichtigem Issue: Benachrichtigung an Marcus

---

## Kanban Board — Spalten

| Spalte | Bedeutung | Wer |
|--------|-----------|-----|
| **Backlog** | Ideen, ungeplant | Alle |
| **Ready** | Priorisiert, bereit zur Arbeit | Project Lead |
| **In Progress** | Aktuell in Bearbeitung | Engineer/Researcher |
| **Testing** | Tests werden ausgeführt | Test Agent |
| **Review** | Code Review läuft | Review Agent |
| **Done** | Fertig, gemergt | — |

### Ticket-Lebenszyklus

```
Backlog     Ready        In Progress   Testing      Review       Done
  │          │               │            │            │           │
  └────┐     │               │            │            │           │
       │     ▼               ▼            ▼            ▼           │
       │   Prio         Engineer/       Test        Review        ▼
       │  setzen       Researcher      Agent        Agent        ▼
       │                              ausführen    approved      │
       │                                  │            │         │
       │◄─────────────────────────────────┘            │         │
       │                                               │         │
       └──── Changes needed ◄───────────────────────────┘         │
```

---

## Ticket-Struktur

Jedes Ticket hat:

```yaml
title: "Beschreibung"
project: "rook-dashboard"  # oder anderes Projekt
type: "feature" | "bug" | "research" | "refactor" | "doc"
priority: "low" | "medium" | "high" | "urgent"
assignee: "engineer" | "researcher" | "test" | "review"
status: "backlog" | "ready" | "in_progress" | "testing" | "review" | "done"
labels:
  - "frontend"
  - "api"
  - "security"
due_date: "2026-04-01"
subtasks:
  - id: 1
    title: "Teilaufgabe 1"
    completed: true
  - id: 2
    title: "Teilaufgabe 2"
    completed: false
```

---

## Projekte

| Projekt | Beschreibung | Haupt-Agent |
|---------|-------------|-------------|
| `rook-dashboard` | Dashboard für Rook Systeme | Engineer |
| `rook-agent` | Core OpenClaw Agent + Memory | Engineer |
| `metrics-collector` | Ökologische & Soziale Metriken | Researcher |
| `working-notes` | Content & Website | Researcher/Engineer |
| `digital-capitalism-research` | Research Datenbank | Researcher |

**Wichtig:** Agent-Konfigurationsdateien (AGENTS.md, SOUL.md) sind **global**, nicht pro Projekt.

---

## Kommunikations-Regeln

### Agent → Agent
- Via Kanban Tickets (keine direkte Kommunikation)
- Agent liest Ticket, aktualisiert Status
- Kommentare für Kontext

### Agent → Project Lead (Rook)
- Ticket-Blocker markieren
- Review-Ergebnisse abwarten
- Bei Architektur-Fragen: Rook fragen

### Project Lead → Marcus
- **Nur bei:**
  - Architektur-Entscheidung nötig
  - Blocker der nicht lösbar ist
  - Deliverable fertig
  - Marcus muss entscheiden

---

## Testing-Strategie

### Test-Level

| Level | Wer | Wann |
|-------|-----|------|
| Unit Tests | Engineer | Bei jeder Änderung |
| Integration Tests | Test Agent | Nach Unit Tests |
| E2E Tests | Test Agent | Bei Releases |
| Security Review | Review Agent | Bei kritischen Änderungen |

### Test-Automatisierung

```
Commit → CI Pipeline → Tests → Review → Merge
                    ↓
              Bei Fail: Ticket zurück zu "In Progress"
```

---

## Review-Strategie

### Review-Gates

1. **Code Review** (Review Agent)
   - Style Guide eingehalten?
   - Sicherheits-Probleme?
   - Performance-Probleme?

2. **Test Coverage** (Review Agent)
   - Ausreichend getestet?
   - Kritische Pfade abgedeckt?

3. **Documentation** (Review Agent)
   - README aktuell?
   - API dokumentiert?
   - Breaking Changes kommuniziert?

### Review-Output

```
APPROVED → Ticket zu "Done"
REQUEST_CHANGES → Ticket zu "In Progress" mit Feedback
MARCUS_ATTENTION → Benachrichtigung an Marcus
```

---

## Cron-Jobs & Automation

| Zeit | Job | Agent |
|------|-----|-------|
| Täglich 02:00 | Workspace Sync | Rook |
| So 08:00 | Research Pipeline + Metrics | Researcher |
| So 02:00 | Backup to Drive | Rook |
| Bei Commit | CI/CD Tests | Test Agent |

---

## Nächste Schritte

### Phase 1: Foundation (NOW)
- [x] Rollen definiert
- [x] Kanban-Struktur festgelegt
- [ ] Test Agent einrichten
- [ ] Review Agent einrichten
- [ ] Engineer Agent mit Tasks versorgen
- [ ] Researcher Agent mit Tasks versorgen

### Phase 2: Automation
- [ ] CI/CD Pipeline für Test Agent
- [ ] Automatische Review-Trigger
- [ ] Benachrichtigungs-System

### Phase 3: Optimierung
- [ ] Reviewzyklen messen
- [ ] Bottlenecks identifizieren
- [ ] Prozesse anpassen

---

## Dokumentation

- [Multi-Agent Architecture](./MULTI-AGENT-ARCHITECTURE.md) (dieses Dokument)
- [Implementation Plan](./IMPLEMENTATION-PLAN.md)
- [Rook Nutzung](../ROOK-NUTZUNG.md)
- [Agent Docs](../docs/)

---

*Letzte Änderung: 2026-03-28*
