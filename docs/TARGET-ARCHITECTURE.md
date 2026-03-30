# Target Architecture

> Status: Target operating model after March 2026 stabilization work

## Core Principles

1. GitHub is the persistent backbone.
2. The dashboard is the primary control-plane UI.
3. Discord is a readable coordination layer, not a source of truth.
4. Rook is the orchestrator.
5. Specialists execute bounded work against tasks, repos, and branches.
6. No critical work state should exist only in local runtime memory.

## System Layers

### 1. Persistence Layer

Primary persistent systems:

- Git repositories
- canonical task files in `rook-workspace`
- canonical health files in `rook-workspace`
- GitHub issues for repo-linked delivery work

Non-canonical caches:

- dashboard SQLite
- transient session files
- local message delivery queues

### 2. Orchestration Layer

Primary orchestrator:

- `rook`

Responsibilities:

- intake
- planning
- prioritization
- assignment
- cross-repo coordination
- escalation

### 3. Execution Layer

Permanent domain agents:

- `engineer`
- `researcher`
- `consultant`
- `coach`
- `health`

System service role:

- `dashboard-sync`

Temporary workflow modes:

- review
- test
- devops
- planner
- culture

### 4. Presentation Layer

Primary UI:

- `rook-dashboard`

Messaging layer:

- Discord

## Task Model

Each task must include:

- `task_id`
- `project_id`
- `title`
- `description`
- `status`
- `assigned_agent`
- `priority`
- `dependencies`
- `related_repo`
- `branch`
- `commits`
- `timestamps`

Recommended additional fields:

- `workflow_stage`
- `review_status`
- `github_issue`
- `kanban`
- `labels`
- `handoff_notes`
- `blocked_reason`

## Task Lifecycle

Primary visible Kanban lifecycle:

- `backlog`
- `ready`
- `in_progress`
- `testing`
- `review`
- `done`

Operational lifecycle additions:

- `blocked`
- `archived`

Archive policy:

- `done` means completed active work
- `archive` removes the task from active board views while preserving history
- archived tasks remain restorable to backlog

## Task Storage Model

Canonical:

- `workspace/operations/tasks/<project_id>/<task_id>.json`

Archive:

- `workspace/operations/archive/tasks/<project_id>/<task_id>.json`

Projection:

- dashboard Kanban database for fast UI rendering

## Git Model

### Branch Naming

Use:

`agent/<agent_id>/<task_id>-<slug>`

Examples:

- `agent/engineer/dashboard-0042-kanban-dnd`
- `agent/researcher/research-0012-methodology`

### Commit Format

Use:

`[agent:<agent_id>][task:<task_id>] summary`

Examples:

- `[agent:engineer][task:dashboard-0042] fix kanban drag persistence`
- `[agent:rook][task:ops-0001] disable fake heartbeat cron jobs`

### Repo Strategy

- `rook-workspace` is the coordination repo
- domain repos remain independent execution repos
- `rook-dashboard` remains the UI/control-plane repo
- `rook-agent` remains the identity/skills/runtime repo

## GitHub Issue Strategy

GitHub Issues are not the only task system.

They are a mirror for tasks that:

- belong to a specific repo
- benefit from repo discussion
- should link directly to branches, commits, and PRs

They are not required for:

- private coaching tasks
- private health tasks
- broad cross-repo orchestration tasks without a single execution repo

## Dashboard Role

The dashboard should provide:

- Kanban and task editing
- archive and restore history
- GitHub issue sync and sync diagnostics
- agent health and queue state
- branch/commit/PR visibility
- run and handoff visibility

The dashboard should not become the only persistent store.

## Discord Role

Discord should provide:

- human-readable intake
- discussion
- notifications
- failure alerts

Discord should not provide:

- canonical task storage
- primary assignment state
- fake independent agent ownership by channel

## Health Model

Health must be machine-readable.

One file per agent under `workspace/operations/health/` should capture:

- `agent_id`
- `status`
- `current_task_id`
- `last_seen_at`
- `queue_depth`
- `last_error`
- `repo_heads`
- `workspace`

Health checks should derive from:

- active tasks
- repo state
- runtime/session presence
- sync failures

Not from natural-language cron prompts.

## Conflict Avoidance

1. One task has one primary owner.
2. Cross-repo work uses child tasks or linked tasks.
3. Workers do not self-assign without orchestration or explicit user action.
4. Task state changes must be durable outside the dashboard UI.
5. Dashboard cache must be reconstructible from canonical state.

## Disaster Recovery Goal

A full recovery should be possible by:

1. cloning the repos
2. restoring environment configuration
3. starting the gateway and dashboard
4. rebuilding dashboard projection state from canonical files

This goal is partially met for tasks and archives, but not yet complete for the entire runtime.

