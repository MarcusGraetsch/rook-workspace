# OpenClaw System Map

> Status: Verified against local `.openclaw` workspace on 2026-03-30
> Scope: Local runtime, connected repositories, dashboard, task system, health model, and coordination paths

## Executive Summary

The current Rook system is now centered on a hybrid task model:

- The dashboard Kanban is the primary human task interface.
- Canonical task records live in Git-backed files under `workspace/operations/tasks/`.
- Repo-linked work can mirror to GitHub Issues.
- Archived work moves to `workspace/operations/archive/tasks/`.
- Agent health is moving from prompt-based heartbeats to structured snapshots under `workspace/operations/health/`.

The strongest parts of the system are now:

- clear repo separation
- a usable dashboard Kanban
- Git-backed task persistence
- GitHub issue mirroring
- archive and restore workflow

The weakest remaining parts are:

- repo and runtime documentation drift
- local-only role workspaces
- secrets/config hygiene
- Discord and runtime policy documentation

## Directory Map

### Runtime Home: `/root/.openclaw`

Purpose: live OpenClaw runtime, agent state, messaging bindings, cron, and local configuration.

Key paths:

- `openclaw.json`
  - active runtime config
- `agents/`
  - local agent session state
- `cron/`
  - scheduled jobs and run history
- `discord/`
  - Discord routing and binding state
- `subagents/`
  - spawned subagent run metadata
- `rook-agent/`
  - agent repo with skills, identity, rescue scripts, config templates
- `workspace/`
  - main coordinated work repo
- `workspace-main/`
  - clean Git-working checkout used for focused branch/PR work against `main`
- `workspace-engineer/`, `workspace-researcher/`, `workspace-coach/`, `workspace-consultant/`
  - local role workspaces with mixed maturity
- `workspace-health/`
  - separate health-oriented repo

### Coordination Repo: `/root/.openclaw/workspace`

Purpose: main Git-backed operating repo for cross-project coordination and persistent operations state.

Key paths:

- `operations/`
  - canonical coordination state
- `engineering/`
  - engineering repos and docs
- `projects/`
  - research, writing, and website repos
- `memory/`
  - working memory notes
- `tasks/`
  - older task notes, not the canonical task system

### Canonical Operations Layer: `/root/.openclaw/workspace/operations`

Purpose: system source of truth for coordination data that must survive clone/setup/restart.

Key paths:

- `tasks/`
  - one JSON file per active task
- `archive/tasks/`
  - archived canonical tasks
- `health/`
  - one JSON file per agent health snapshot
- `projects/`
  - project registry
- `schemas/`
  - JSON schemas for task and health records

## Repository Map

### `MarcusGraetsch/rook-workspace`

Local path: `/root/.openclaw/workspace`

Purpose:

- operations hub
- cross-repo coordination
- canonical task and health state
- high-level docs and memory

Current state: active and central.

### `MarcusGraetsch/rook-workspace` Clean Working Copy

Local path: `/root/.openclaw/workspace-main`

Purpose:

- clean Git branch work
- compare and PR preparation
- documentation and merge-safe edits

Current state: active as the safer Git-working copy for reviewed changes.

### `MarcusGraetsch/rook-agent`

Local path: `/root/.openclaw/rook-agent`

Purpose:

- OpenClaw agent identity and skills
- config templates
- rescue gateway script
- agent operating docs

Current state: active, but operational docs and live runtime behavior had drifted.

### `MarcusGraetsch/rook-dashboard`

Local path: `/root/.openclaw/workspace/engineering/rook-dashboard`

Purpose:

- Next.js control-plane UI
- Kanban board
- task projection and sync
- GitHub diagnostics
- health visualization

Current state: active and now materially improved.

### `MarcusGraetsch/metrics-collector`

Local path: `/root/.openclaw/workspace/engineering/metrics-collector`

Purpose:

- data collection and metrics ingestion for dashboard/research use cases

Current state: partial; architecture exists, but implementation is still incomplete.

### `MarcusGraetsch/digital-capitalism-research`

Local path: `/root/.openclaw/workspace/projects/digital-research`

Purpose:

- research corpus
- literature pipeline
- source processing

Current state: active and substantial.

### `MarcusGraetsch/critical-theory-digital`

Local path: `/root/.openclaw/workspace/projects/critical-theory-digital`

Purpose:

- writing and theory development repo

Current state: active but lighter-weight than `digital-research`.

### `MarcusGraetsch/working-notes`

Local path: `/root/.openclaw/workspace/projects/working-notes`

Purpose:

- personal/public website and notes

Current state: active.

### `MarcusGraetsch/workspace-health`

Local path: `/root/.openclaw/workspace-health`

Purpose:

- private health tracking workspace

Current state: real repo, but still operationally separate from the main task model.

## Agent Landscape

### Permanent Operational Agents

- `rook`
  - orchestrator and intake owner
- `engineer`
  - implementation owner for code and infrastructure work
- `researcher`
  - research and source synthesis owner
- `consultant`
  - consulting and strategy deliverables
- `coach`
  - planning, reflection, coaching work
- `health`
  - health tracking and support

### System Role

- `dashboard-sync`
  - not yet a fully separate runtime agent, but the target system includes it as the owner of projection/sync work

### Deprecated or Demoted Patterns

- Discord-spawned fake peer agents
  - disabled by setting `spawnSubagentSessions` to `false`
- prompt-based heartbeat workers
  - cron jobs disabled
- permanent `test` and `review` peers
  - better treated as workflow modes or child tasks

## Communication Model

### Current Intended Model

- Humans interact through dashboard and messaging.
- Rook owns orchestration.
- Kanban expresses current work state.
- Canonical task files preserve durable state.
- GitHub issues mirror repo-linked work.

### Current Actual Reliable Paths

- Dashboard Kanban
- canonical task files
- GitHub issue sync
- archive/restore flow
- structured health snapshots

### Demoted/Deprecated Paths

- Discord as primary task store
- engineer-owned subagent thread simulation
- cron heartbeats as natural-language task polling

## Dashboard Status

The dashboard is now the primary control-plane UI, but not every page is equally mature.

Reliable areas:

- `/kanban`
- `/archive`
- `/github`
- `/agents` via health snapshots

Still mixed or incomplete:

- older routes that were built around gateway/session assumptions
- deeper repo/run observability
- formal PR/branch/commit UI

## Task System Status

The task system now follows this model:

1. User edits work in Kanban.
2. Kanban writes local DB state for UX.
3. Kanban mirrors changes to canonical task JSON.
4. Repo-linked work auto-syncs to GitHub Issues.
5. Done tasks can be archived into canonical history.
6. Archived tasks can be restored to backlog.

This is the current backbone of the multi-agent system.

## Health and Reliability Status

Old state:

- prompt-based heartbeat scripts
- cron jobs routed through engineer
- false signals and wrong workspace/session ownership

New state:

- structured health snapshots under `operations/health/`
- dashboard health endpoints and agent page driven from snapshots
- old heartbeat cron jobs disabled

## Open Weaknesses

- role workspaces outside `workspace/` are still operationally inconsistent
- secrets/config handling still needs hardening
- repo docs still describe older routing assumptions in places
- dashboard still has some legacy route debt
- branch/commit/PR linkage is not yet first-class in the UI

## Disaster Recovery Status

Improved:

- tasks now survive outside local SQLite
- GitHub issue mirrors exist for repo-linked tasks
- archive history is preserved canonically

Still incomplete:

- not all runtime state is reconstructible from repos alone
- local config and message runtime still need formal recovery docs
