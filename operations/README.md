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
├── bin/
├── config/
├── health/
├── projects/
├── schemas/
├── sysctl/
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
9. Hook-dispatched tasks should record `dispatch` metadata so worker session identity survives restart and postmortem analysis.
10. Host-level runtime requirements that affect OpenClaw reliability should be tracked here as auditable operations artifacts, for example sysctl files under `operations/sysctl/`.

## Host Runtime Policy

- `operations/sysctl/99-openclaw-inotify.conf` raises inotify capacity for the VPS workload. The gateway, dashboard, Kubernetes tooling, and file-watching automation share the same host, so the distro default `fs.inotify.max_user_instances=128` is too low.
- Validate host watcher capacity with `node operations/bin/check-inotify-capacity.mjs`.
- The aggregate control-plane check includes this signal through `node operations/bin/check-runtime-control-plane.mjs`.

## Current Scope

This is the first migration slice away from local-only task state in `rook-dashboard/data/kanban.db`.

The dashboard now follows a hybrid workflow:

- The Kanban remains the primary UI for creating and updating work.
- Kanban task changes should mirror into canonical task files under `operations/tasks/`.
- Canonical task files preserve durable state, board linkage, and future GitHub issue metadata.
- Archived tasks should move to `operations/archive/tasks/` instead of being hard-deleted.
