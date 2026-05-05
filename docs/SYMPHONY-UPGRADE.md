# Symphony → Rook Pipeline Upgrade

> Analyse der OpenAI Symphony Architektur und konkrete Übernahme in unsere bestehende Pipeline.
> Datum: 2026-05-05

## Was Symphony besser macht

| Symphony | Unsere Pipeline | Upgrade |
|----------|-----------------|---------|
| **WORKFLOW.md** als zentrale Steuerung (YAML front matter + Markdown prompt) | JSON Task-Files + separater Prompt im Dispatcher | `WORKFLOW.md` pro Projekt einführen |
| **Ziele statt Abläufe** im Prompt | Detaillierte Checklisten in JSON | Prompt-Template mit `{{ issue.title }}` + Zielbeschreibung |
| **Per-issue Workspace** (isoliertes Verzeichnis pro Ticket) | Branch-Isolierung, aber gemeinsamer Workspace | Optional: `workspaces/<task_id>/` für komplexe Tasks |
| **State Machine**: Todo → In Progress → Review → **Rework** → Merging → Done | intake → ready → in_progress → review → testing → done | **Rework** und **Human Review** als explizite States |
| **Automatische Ticket-Erstellung** bei Nebenproblemen | Nicht implementiert | `auto_create_tasks: true` im WORKFLOW |
| **Proof of Work**: CI status, PR review, complexity, Video | Nur `handoff_notes` + `commits` | Erweiterte Artifacts: `proof_of_work[]` |
| **Bounded Concurrency** (`max_concurrent_agents: 10`) | Dispatcher ohne explizites Limit | `concurrency_limit` in WORKFLOW front matter |
| **Retry mit Exponential Backoff** | Kein Retry-Mechanismus | Retry-Queue mit `max_retries`, `backoff_ms` |
| **Structured Logs** + Observability | `handoff_notes` als Log-Ersatz | `logs/` Verzeichnis pro Task |

## Architektur-Vergleich

### Symphony Layer
1. **Policy Layer** → `WORKFLOW.md` (repo-defined)
2. **Configuration Layer** → YAML front matter parsing
3. **Coordination Layer** → Orchestrator (Polling, Eligibility, Concurrency, Retries)
4. **Execution Layer** → Workspace + Agent subprocess
5. **Integration Layer** → Linear adapter
6. **Observability Layer** → Logs + Status Surface

### Unsere Layer (aktuell)
1. **Policy** → `task-dispatcher.mjs` (hart codiert)
2. **Config** → `operations/config/` (JSON files)
3. **Coordination** → `task-dispatcher.mjs` poll loop
4. **Execution** → `sessions_spawn` / ACP harness
5. **Integration** → GitHub API via `gh` CLI
6. **Observability** → Dashboard + `health/*.json`

**Kernproblem:** Unsere Policy ist im Code, nicht im Repo. Symphony's Erkenntnis: Das Workflow-Prompt sollte versioniert mit dem Code leben.

## Konkrete Upgrades (nach Umsetzbarkeit sortiert)

### ✅ Sofort umsetzbar (heute)

#### 1. WORKFLOW.md pro Projekt einführen

```markdown
---
tracker:
  kind: github_issues
  project_slug: "rook-dashboard"
agent:
  max_concurrent: 3
  max_turns: 15
  retry_limit: 2
workspace:
  isolation: branch  # branch | directory | none
states:
  active: [backlog, ready, in_progress, review]
  terminal: [done, cancelled, failed]
  handoff: [human_review, merging]
proof_of_work:
  - pr_link
  - test_results
  - complexity_analysis
auto_create_tasks: true
---

# Workflow Prompt

You are working on task {{ task.id }}: {{ task.title }}

## Context
- Repo: {{ repo.url }}
- Branch: {{ branch.name }}
- Priority: {{ task.priority }}

## Goal
{{ task.description }}

## Definition of Done
{{ task.acceptance_criteria }}

## Rules
- Commit with format: `[agent:{{ agent.id }}][task:{{ task.id }}] <summary>`
- Push branch after terminal status
- If you discover new work: create a follow-up task
- Provide proof of work in handoff_notes
```

#### 2. State Machine erweitern

Neue States:
- `rework` → Nach Review wenn Changes requested
- `human_review` → Expliziter Handoff-State (wie Symphony's "Human Review")
- `merging` → PR ist approved, wird gemerged

State Transitions:
```
backlog → ready → in_progress → review → human_review → merging → done
                    ↓              ↓
                 cancelled      rework
                    ↓              ↓
                 failed         in_progress
```

#### 3. Proof of Work Artifacts erweitern

Aktuell: `commits[]`, `handoff_notes`

Neu: `artifacts[]` mit Typen:
```json
{
  "type": "pr_link",
  "url": "https://github.com/.../pull/13",
  "status": "open"
}
{
  "type": "test_results",
  "summary": "12 passed, 0 failed",
  "details_url": "..."
}
{
  "type": "complexity_analysis",
  "lines_changed": 245,
  "files_touched": 8,
  "risk_score": "medium"
}
{
  "type": "video_walkthrough",
  "url": "..."
}
```

### 🔧 Mittelfristig (diese Woche)

#### 4. Retry-Mechanismus mit Exponential Backoff

Neue Task-Felder:
```json
{
  "retry": {
    "attempt": 0,
    "max_attempts": 2,
    "backoff_ms": 60000,
    "last_error": null,
    "next_retry_at": null
  }
}
```

Dispatcher-Logik:
- Wenn `status: failed` und `retry.attempt < max_attempts`
- Setze `next_retry_at = now + (backoff_ms * 2^attempt)`
- Verschiebe in `retry_queue` statt sofort `backlog`

#### 5. Bounded Concurrency

WORKFLOW.md Config:
```yaml
agent:
  max_concurrent: 3
```

Dispatcher-Tracking:
- `running_sessions: Map<task_id, session_info>`
- Vor Dispatch: prüfe `running_sessions.size < max_concurrent`
- Wenn Limit erreicht: Task bleibt in `ready`

#### 6. Automatische Task-Erstellung

Wenn Agent während der Arbeit auf ein neues Problem stößt:
- Neues Task-File in `operations/tasks/<project_id>/`
- Status: `backlog`
- `parent_task`: `{{ task.id }}`
- `source`: `auto_created_by:{{ agent.id }}:{{ task.id }}`

### 🏗️ Langfristig (nächster Sprint)

#### 7. Per-Task Workspace Isolation

Aktuell: Alle Tasks im selben Workspace-Verzeichnis, nur Branches unterscheiden.

Symphony-Style: `workspaces/<task_id>/` als isoliertes Verzeichnis.

Vorteile:
- Keine versehentlichen Cross-Task Änderungen
- Saubere Cleanup nach Terminal-State
- Mehrere Tasks im selben Repo parallel ohne Branch-Wechsel-Konflikte

#### 8. Structured Logging statt handoff_notes

Aktuell: `handoff_notes` ist menschlich lesbar, aber maschinell schwer parsbar.

Neu: `logs/<task_id>/` Verzeichnis:
```
logs/
└── dashboard-0042/
    ├── 001-start.json       { "event": "start", "timestamp": "..." }
    ├── 002-git-clone.json
    ├── 003-codex-start.json
    ├── 004-commit.json
    ├── 005-push.json
    ├── 006-pr-create.json
    └── 007-complete.json
```

#### 9. Observability Dashboard für Agent-Runs

Wie Symphony's Phoenix Service:
- Echtzeit-Status aller laufenden Agent-Sessions
- Token-Usage pro Task
- Letzte Codex Events
- Queue Depth

## Implementation Order

1. **Heute:** WORKFLOW.md Template erstellen, State Machine erweitern
2. **Morgen:** Proof of Work Artifacts, Retry-Mechanismus
3. **Diese Woche:** Bounded Concurrency, Auto-Task-Creation
4. **Nächste Woche:** Workspace Isolation, Structured Logging

## Files to Create/Modify

### Neue Files
- `operations/workflows/default.md` — Default WORKFLOW.md Template
- `operations/workflows/engineer.md` — Engineer-spezifisch
- `operations/workflows/researcher.md` — Researcher-spezifisch
- `operations/schemas/workflow-v1.json` — JSON Schema für WORKFLOW.md parsing

### Modified Files
- `operations/bin/task-dispatcher.mjs` — WORKFLOW.md Loader, Retry-Logik, Concurrency
- `operations/tasks/README.md` — Neue States dokumentieren
- `operations/schemas/task-v1.json` — Neue Felder: `retry`, `artifacts`, `parent_task`
- `docs/TARGET-ARCHITECTURE.md` — Symphony-Learnings integrieren

### Dashboard UI Changes (rook-dashboard repo)

#### Kanban Board Columns

| Current Columns | New Columns | Notes |
|-----------------|-------------|-------|
| backlog | backlog | unchanged |
| ready | ready | unchanged |
| in_progress | in_progress | unchanged |
| review | **review** | handoff state |
| — | **rework** ← | NEW: after changes requested |
| — | **human_review** ← | NEW: explicit human approval gate |
| — | **merging** ← | NEW: PR approved, merge in progress |
| testing | testing | unchanged |
| done | done | unchanged |

**Column Color Coding:**
- `rework`: 🟠 Orange (attention needed, back to engineer)
- `human_review`: 🔵 Blue (waiting for human)
- `merging`: 🟣 Purple (automated final step)

#### Task Detail Panel Erweiterungen

**1. Proof of Work Artifacts Section**
```tsx
interface ArtifactsPanel {
  artifacts: Array<{
    type: 'pr_link' | 'test_results' | 'complexity_analysis' | 'video_walkthrough' | 'code_change';
    url?: string;
    file?: string;
    description: string;
    status?: string;
    summary?: string;
  }>;
}
```

UI: Collapsible section "Proof of Work" with icons per type:
- 📝 PR Link → clickable link
- ✅ Test Results → badge with pass/fail count
- 📊 Complexity → lines changed, files touched
- 🎥 Video → embedded or link

**2. Retry Status Badge**
```tsx
{task.retry && task.retry.attempt > 0 && (
  <Badge variant="warning">
    Retry {task.retry.attempt}/{task.retry.max_attempts}
    {task.retry.next_retry_at && ` · Next: ${formatTime(task.retry.next_retry_at)}`}
  </Badge>
)}
```

**3. Parent/Child Task Links**
```tsx
{task.parent_task && (
  <div className="text-sm text-muted">
    ↳ Sub-task of <Link href={`/kanban?task=${task.parent_task}`}>{task.parent_task}</Link>
  </div>
)}

{childTasks.length > 0 && (
  <div className="mt-2">
    <div className="text-sm font-medium">Auto-created follow-ups:</div>
    {childTasks.map(child => (
      <Link key={child.task_id} href={`/kanban?task=${child.task_id}`}>
        <Badge variant="outline">{child.status}</Badge> {child.title}
      </Link>
    ))}
  </div>
)}
```

**4. Workflow Badge**
```tsx
{task.workflow_stage && (
  <Badge variant="secondary">{task.workflow_stage}</Badge>
)}
```

#### API Endpoint Changes

**`/api/control/tasks` (GET):**
- Include `retry`, `artifacts`, `parent_task` in response
- Filter by `workflow_stage` query param

**`/api/control/tasks` (PATCH):**
- Accept `artifacts` append operation
- Accept `retry` reset operation (when manually retrying)
- Validate `status` against extended enum (rework, human_review, merging)

**`/api/control/health` (GET):**
- Include `running_sessions_count` vs `max_concurrent` per agent
- Include `retry_queue_depth` (tasks with `next_retry_at` in future)

#### Agent Health Page (`/agents`) Erweiterungen

**Queue & Blockers Panel:**
- Show `rework` tasks in engineer queue
- Show `human_review` tasks as "waiting for human"
- Color-code by state

**New Metrics:**
- `proof_of_work_coverage`: % of done tasks with artifacts
- `retry_rate`: % of tasks that needed retry
- `auto_created_tasks`: count of tasks spawned by agents

### Dashboard Files to Modify (rook-dashboard)

- `src/lib/control/tasks.ts` — Task model types erweitern
- `src/app/api/control/tasks/route.ts` — PATCH/GET handler
- `src/app/kanban/page.tsx` — Neue Spalten, Badges
- `src/app/kanban/TaskDetail.tsx` — Artifacts, Retry, Parent sections
- `src/app/agents/page.tsx` — Queue-Panel erweitern
- `src/lib/control/health.ts` — Agent-Health mit Concurrency-Metrics

## Risk Analysis

| Risk | Mitigation |
|------|-----------|
| WORKFLOW.md drift (nicht mehr aktuell) | Lint-Check im CI |
| Zuviele Auto-Tasks | `max_auto_created_per_run: 3` |
| Retry-Loops | `max_attempts` hard cap + Alert nach 2. Retry |
| Workspace-Bloat | Cleanup-Cron für terminal workspaces |
| Concurrency zu niedrig | Default: 3, pro WORKFLOW überschreibbar |

## Fazit

Symphony ist ein Proof of Concept für eine Idee, die wir unabhängig entwickelt haben. Der Unterschied ist Polishing und Durchgängigkeit. Die größte Einzelverbesserung ist der **WORKFLOW.md Ansatz**: Policy im Repo statt im Code. Das macht die Pipeline wartbar und versioniert.
