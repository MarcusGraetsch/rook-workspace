# Operations

This directory is the Git-backed coordination layer for the Rook multi-agent system.

## Purpose

- Persistent task state lives here
- Agent health snapshots live here
- Project registry lives here
- The dashboard should treat these files as canonical input

The local dashboard database may cache or index this data for performance, but it is not the source of truth.

## Structure

```text
operations/
├── archive/
├── health/
├── projects/
├── schemas/
└── tasks/
```

## Rules

1. Tasks are stored as one JSON file per task.
2. `task_id` is globally unique.
3. Every task must reference exactly one `project_id`.
4. Every task must reference exactly one primary `related_repo`.
5. Branches should follow `agent/<agent_id>/<task_id>-<slug>`.
6. Commits should follow `[agent:<agent_id>][task:<task_id>] summary`.
7. `claimed_by`, `last_heartbeat`, and `failure_reason` should reflect real execution state, not conversational intent.
8. Dashboard uptime and dispatcher runs must be supervised outside chat.

## Current Scope

This is the first migration slice away from local-only task state in `rook-dashboard/data/kanban.db`.

The dashboard now follows a hybrid workflow:

- The Kanban remains the primary UI for creating and updating work.
- Kanban task changes should mirror into canonical task files under `operations/tasks/`.
- Canonical task files preserve durable state, board linkage, and future GitHub issue metadata.
- Archived tasks should move to `operations/archive/tasks/` instead of being hard-deleted.
