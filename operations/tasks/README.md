# Tasks

Canonical task files live here.

## Layout

```text
tasks/
└── <project_id>/
    └── <task_id>.json
```

Archived tasks should move to:

```text
archive/
└── tasks/
    └── <project_id>/
        └── <task_id>.json
```

## Lifecycle

- `backlog`
- `ready`
- `in_progress`
- `review`
- `testing`
- `blocked`
- `done`

## Assignment

`assigned_agent` should be one of:

- `rook`
- `engineer`
- `researcher`
- `consultant`
- `coach`
- `health`
- `dashboard-sync`

Temporary execution roles like review or test should be tracked in `workflow_stage`, `handoff_notes`, or child tasks rather than treated as permanent owners.

## Hybrid Workflow

- The dashboard Kanban is the main editing surface.
- Each Kanban task should mirror into one canonical task file.
- Canonical tasks may optionally mirror onward to GitHub Issues for repo-linked delivery work.
- GitHub issue linkage should be stored in the task's `github_issue` object.
