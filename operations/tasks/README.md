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
- `intake`
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
- `test`
- `review`
- `consultant`
- `coach`
- `health`
- `dashboard-sync`

`test` and `review` are conditional execution agents in the default delivery pipeline:

- `intake/refinement -> research if needed -> engineer -> test -> review -> done`

Coordinator-owned tasks may still stay on `rook`, but specialist execution should be explicit and durable in the canonical task file rather than implied only in chat.

`intake` is the task-shaping stage before dispatch:

- rough human wording may still be present
- the ticket should be refined into clearer title, description, checklist, and repo targeting
- `coach` is the default intake owner unless another agent is explicitly selected
- the canonical task should preserve intake metadata such as the original brief and refinement summary
- tasks should not move to `ready` without a non-empty intake brief and at least one checklist item

## Hybrid Workflow

- The dashboard Kanban is the main editing surface.
- Each Kanban task should mirror into one canonical task file.
- Canonical tasks may optionally mirror onward to GitHub Issues for repo-linked delivery work.
- GitHub issue linkage should be stored in the task's `github_issue` object.
