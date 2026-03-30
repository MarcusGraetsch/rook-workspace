# HEARTBEAT.md

## Deprecated

This workspace no longer uses prompt-based heartbeat polling as an operational control path.

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

