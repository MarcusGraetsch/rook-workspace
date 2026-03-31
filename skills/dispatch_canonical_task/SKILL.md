---
name: dispatch_canonical_task
description: Deterministically launch one canonical task through the dispatcher from Discord without doing the task work in chat.
user-invocable: true
disable-model-invocation: false
---

# Dispatch Canonical Task

Use this skill only when the human explicitly wants to dispatch a canonical task by id.

## Input contract

- Expect exactly one canonical task id such as `ops-0019`.
- If the user does not provide a valid task id, ask for the exact id and do nothing else.

## Required behavior

1. Extract the canonical task id.
2. Run exactly this command and nothing broader:

```bash
node /root/.openclaw/workspace/operations/bin/dispatch-canonical-task.mjs <TASK_ID>
```

3. Do not edit the task file yourself.
4. Do not perform the task work yourself.
5. Do not narrate stage progression unless the dispatcher/task state actually changed.

## Response contract

- If dispatch was accepted, reply with a short acknowledgement that includes:
  - task id
  - resulting status
  - claimed_by
  - assigned_agent
- If dispatch failed or blocked, reply with the real failure reason from the wrapper output.
- Keep the reply short. The dispatcher and Discord lifecycle notifications own the detailed progress reporting.
