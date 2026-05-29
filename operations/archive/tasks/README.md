# Workspace Archived Tasks

This is the Git-backed legacy archive for deleted or retired Kanban tasks.

Records here are still valid canonical lookup targets for completed or retired cards, but they are not active work and should not be included in active task queues.

## Layout

```text
archive/
└── tasks/
    └── <project_id>/
        └── <task_id>.json
```

## Runtime Archive

New dashboard/archive flows normally write to the mutable runtime archive:

```text
/root/.openclaw/runtime/operations/archive/tasks/<project_id>/<task_id>.json
```

Both this workspace archive and the runtime archive are checked by canonical task lookup and integrity tooling. Do not move or delete archived records without first reviewing:

```bash
node operations/bin/check-canonical-task-integrity.mjs
node operations/bin/plan-archive-task-cleanup.mjs
```
