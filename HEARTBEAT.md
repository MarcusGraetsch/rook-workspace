# HEARTBEAT.md

## Active Heartbeat Mechanism

For long-running agent tasks (>20 min), use the heartbeat script to prevent claim staleness:

```bash
node operations/bin/write-heartbeat.mjs <task_id> <project_id>
```

Example (from repo root):
```bash
node operations/bin/write-heartbeat.mjs ops-0039 rook-workspace
```

The script:
- Updates `last_heartbeat` and `timestamps.updated_at` in the runtime task-state file
- Writes atomically (tmp + rename)
- Exits silently if the task-state file doesn't exist

## Deprecated Items

The old `heartbeat.js` polling flow for the engineer workspace has been retired.

Current source of truth:

- tasks: `workspace/operations/tasks/`
- archive: `workspace/operations/archive/tasks/`
- health: `workspace/operations/health/`
- dashboard UI: `rook-dashboard` Kanban

Use these docs instead:

- `/root/.openclaw/workspace/docs/TARGET-ARCHITECTURE.md`
- `/root/.openclaw/workspace/docs/DISCORD-POLICY.md`
- `/root/.openclaw/workspace/docs/DISASTER-RECOVERY.md`

If a runtime asks for a heartbeat response from this file, prefer a quiet no-op response rather than inventing task work from here.

