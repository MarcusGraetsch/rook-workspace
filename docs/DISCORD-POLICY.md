# Discord Policy

> Status: Active operating policy
> Last updated: 2026-03-30

## Role of Discord

Discord is a readable coordination layer.

Use it for:

- human requests
- discussion
- notifications
- escalation

Do not use it for:

- canonical task storage
- primary assignment state
- fake independent agent ownership by thread

## Routing Model

All inbound human messages should route to `rook`.

`rook` then decides whether work should:

- remain a conversation
- become a task
- be assigned to a specialist

## Agent Model

Discord should not spawn fake persistent peer sessions for:

- `engineer`
- `researcher`
- `coach`
- `health`

Those roles should receive work through task assignment, not through channel ownership.

## Message Types

Recommended Discord system messages:

```text
[task:dashboard-0042][agent:engineer][status:in_progress]
Repo: MarcusGraetsch/rook-dashboard
Branch: agent/engineer/dashboard-0042-kanban-dnd
Summary: Drag persistence fix implemented, verification pending.
```

## Operational Rules

1. Human input goes to `rook`.
2. Durable work should become a canonical task.
3. Repo-linked work should sync to GitHub.
4. Discord notifications should summarize, not store, system state.
5. Failures and sync errors may be announced in Discord, but remediation happens in the dashboard and repos.

## Pipeline Testing

The system validates multi-stage execution through canonical tasks:

1. **Ready** → dispatched to specialist
2. **In Progress** → engineer working
3. **Testing** → test stage verification
4. **Review** → review stage approval
5. **Done** → task completed

Each stage transition must correspond to real work, not just text updates.

