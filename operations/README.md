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
├── events/
├── health/
├── projects/
├── schemas/
├── sysctl/
├── templates/
├── tests/
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
11. Cross-system coordination events must use JSON under `operations/events/` and validate with `node operations/bin/validate-event.mjs`.
12. Event ledger changes should be covered by `node operations/bin/check-event-ledger.mjs`.
13. Task status events should be emitted with `node operations/bin/emit-task-event.mjs` so payloads stay schema-valid and bridge-safe.
14. Event outbox delivery should use `node operations/bin/dispatch-events.mjs`; supervised operation is documented in `operations/docs/runbooks/event-dispatcher.md`.

## Canonical Task Archive Roots

Active canonical tasks live under `operations/tasks/<project_id>/<task_id>.json`.

Archived task records can exist in two valid locations:

- `operations/archive/tasks/<project_id>/<task_id>.json` is the Git-backed legacy workspace archive. These records remain valid lookup targets for completed or retired Kanban cards, but they should not be counted as active work.
- `/root/.openclaw/runtime/operations/archive/tasks/<project_id>/<task_id>.json` is the mutable runtime archive used by dashboard/archive flows and runtime restore tooling.

Readers that validate Kanban links or resolve an individual canonical task must check both archive roots. Bulk active-work views should read only `operations/tasks/` unless they explicitly present archive history. New archive writes should prefer the runtime archive unless a Git-backed historical artifact is intentionally required.

Use these checks before changing archive files:

```bash
node operations/bin/check-canonical-task-integrity.mjs
node operations/bin/plan-archive-task-cleanup.mjs
```

`plan-archive-task-cleanup.mjs` is read-only by default. Its guarded apply mode is intentionally narrow:

```bash
node operations/bin/plan-archive-task-cleanup.mjs --task-id <task-id> --apply
node operations/bin/plan-archive-task-cleanup.mjs --allow-reviewed --apply
```

Apply mode only moves reviewed runtime archive duplicates into `/root/.openclaw/runtime/operations/archive/task-collisions/`. It refuses Git-backed workspace archive records unless a separate migration note exists, checks for a fresh local runtime backup under `/root/backups/rook-runtime/`, and writes a `.manifest.json` file next to every moved archive record.

Accepted historical task-id collisions are documented under `operations/archive/task-collisions/`. These manifests must include the active task path, archived task path, and SHA-256 for both records. `check-canonical-task-integrity.mjs` and `plan-archive-task-cleanup.mjs` only suppress the warning/action while the manifest still matches the current file hashes.

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
- Archived task records should be preserved in one of the documented archive roots instead of being hard-deleted.
