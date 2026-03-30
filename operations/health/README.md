# Health

Structured agent health snapshots should be written here.

One file per agent is recommended:

```text
health/
├── rook.json
├── engineer.json
└── researcher.json
```

The goal is to replace prompt-based heartbeats with machine-readable state:

- `status`
- `current_task_id`
- `last_seen_at`
- `last_error`
- `queue_depth`
- `repo_heads`

## Current Workflow

- Health snapshots are generated from local runtime/session/task state.
- The dashboard can refresh them through `/api/control/health`.
- These files are now the canonical health record.
- Legacy cron-based natural-language "heartbeat" prompts should be treated as deprecated.
