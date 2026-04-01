# Operator / Developer Manual

This manual describes how the repaired Rook system works in practice on the VPS.

It is not a future-state architecture note.
It is the operating reference for the current OpenClaw-first coordinator-specialist environment.

## 1. What The System Is

The system has five practical layers:

1. OpenClaw runtime and hook gateway
2. Canonical task state in Git-backed JSON files
3. Dispatcher supervision and worker launches
4. Dashboard as the human control plane
5. Discord as the command and notification surface

The system is considered healthy only when those layers agree with each other closely enough that:

- a task can be created or updated
- a worker can be launched
- progress or failure is visible
- resulting code or artifacts are persisted in Git

## 2. Where Truth Lives

### Canonical Truth

Durable task truth lives in:

- `/root/.openclaw/workspace/operations/tasks/<project>/<task>.json`

Those files are the real coordination state.

They should carry, as applicable:

- `task_id`
- `project_id`
- `title`
- `description`
- `status`
- `priority`
- `assigned_agent`
- `claimed_by`
- `dependencies`
- `blocked_by`
- `related_repo`
- `branch`
- `commit_refs`
- `created_at`
- `updated_at`
- `last_heartbeat`
- `failure_reason`
- `source_channel`
- `artifacts`
- `dispatch`
- `kanban`
- `github_issue`
- `github_pull_request`

### Dashboard Truth

The dashboard is not the only source of truth.
It is the human-facing projection and editor of canonical truth.

That means:

- humans should be able to trust the board
- the board must stay synchronized with canonical tasks
- the board must not silently drift away from canonical task state

The repaired dashboard now reconciles kanban rows from canonical task state before serving the board.

### Discord Truth

Discord is not durable truth.

Discord exists to:

- accept human instructions
- surface status
- show important handoffs
- show failures and blocked conditions

If Discord says work started but canonical task state never changed, the work did not really start.

## 3. Real Runtime Components

### Two Checkout Modes

This VPS currently uses two different working trees for two different purposes.

#### Live Runtime Checkout

- `/root/.openclaw/workspace`

Use this checkout for:

- the actual supervised runtime
- canonical task files used by the live system
- dispatcher scripts used by the live system
- dashboard/runtime assets used by the live system

Important rule:

- treat this checkout as operational state, not as the preferred place for broad Git hygiene work

It can contain:

- task-state churn
- local runtime artifacts
- service-facing edits
- transient operational dirt

#### Clean Git Checkout

- `/root/.openclaw/workspace-main`

Use this checkout for:

- reviewable code/documentation changes
- clean branch work
- PR creation
- compare/merge flow
- documentation maintenance

Important rule:

- prefer this checkout for Git work that should be pushed, reviewed, and merged cleanly

### Why The Split Exists

The live checkout must keep the system running.
The clean checkout exists so Git operations do not get mixed with live runtime noise.

That means:

- live runtime repair may happen in `/root/.openclaw/workspace`
- durable reviewable change should usually be repeated or finalized in `/root/.openclaw/workspace-main`

If this distinction is ignored, the risks are:

- accidental commits of runtime dirt
- confusing diffs
- unsafe cleanup in the live path
- uncertainty about what is actually deployed vs merely staged

### Required Services

The minimum supervised runtime is:

- `openclaw-gateway.service`
- `rook-dashboard.service`
- `rook-dashboard-watchdog.timer`
- `rook-dispatcher.timer`

The live system is degraded if the gateway is up but the dashboard and dispatcher are not supervised.

### Where The Units Live

User `systemd` units are installed under:

- `~/.config/systemd/user/`

Repo copies live under:

- `/root/.openclaw/workspace/operations/systemd/`

### Why Supervision Matters

Without supervision, the system degrades into:

- chat that sounds orchestrated
- stale kanban
- no restart path
- no honest escalation

That exact failure already happened once.

## 4. Control Loop

The intended control loop is:

1. Human creates work in the dashboard or gives an instruction in Discord.
2. Canonical task state is created or updated.
3. Dispatcher scans canonical tasks.
4. Dispatcher blocks non-dispatchable work and claims dispatchable work.
5. Dispatcher launches an isolated hook worker session.
6. Worker executes bounded work in the local repo workspace.
7. Worker writes code, commits, artifacts, and task updates.
8. Dashboard and Discord surface progress.
9. Dispatcher clears claims, completes tasks, or blocks tasks honestly on failure.

If a step is missing, the system is not coordinating. It is narrating.

## 5. Agent Roles

### Rook

Rook is the coordinator.

Rook should:

- read task truth
- classify work
- explain what is happening
- trigger or support dispatch
- escalate failures

Rook should not:

- pretend a task is executing without a worker launch
- silently leave tasks in fake progress
- use Discord speech as proof of execution

### Engineer

Engineer is the strongest implementation worker.

Current practical responsibilities:

- code changes
- CI/workflow fixes
- infra/runtime fixes
- fallback for setup work in test/review stages

### Researcher

Researcher handles:

- source gathering
- evidence collection
- research-heavy tasks

### Test

Test owns testing-stage work in the target model.

Current reality:

- test stage exists
- testing runtime passes smoke checks
- some bootstrap/setup work still routes through `engineer`

### Review

Review owns review-stage work in the target model.

Current reality:

- review stage exists
- review runtime passes smoke checks
- some setup/bootstrap work still routes through `engineer`

## 6. Task Lifecycle

The normal target pipeline is:

`research -> engineer -> test -> review -> done`

Not every task needs every stage.

### Practical Status Meanings

- `backlog`: known work, not ready
- `ready`: dispatchable if dependencies are satisfied
- `in_progress`: worker or stage owner is actively executing
- `testing`: task is in test-stage execution
- `review`: task is in review-stage execution or awaiting final review closeout
- `blocked`: not safely dispatchable or worker failed honestly
- `done`: completed and normalized

### What Makes A Status Real

A status is only operationally real when:

- canonical task JSON says so
- the board reflects it
- claim/dispatch metadata makes sense
- the related branch/commit/artifact story is coherent

### Claimed vs Executing vs Stalled

The system must distinguish:

- `claimed`: dispatcher reserved the task
- `executing`: worker activity is visible in the session transcript
- `stalled`: claim exists but no meaningful activity is happening

Stalled claims should be released or blocked.
They should not be left around indefinitely.

## 7. Dashboard Behavior

The dashboard is the control plane for the human operator.

It should answer:

- what is ready
- what is running
- what is blocked
- what finished
- what failed
- whether the runtime itself is healthy

### Kanban Expectations

Kanban is allowed to be a projection.
It is not allowed to be misleading.

The operator should be able to look at the board and trust that:

- cards in `Done` are actually done
- cards in `In Progress` are not abandoned claims
- cards in `Blocked` have a real reason
- cards in `Ready` are genuinely ready for work

### Dashboard Failure Semantics

If the dashboard is down:

- that is a real system incident
- watchdog or supervision should recover it
- failure should be visible in logs and health

## 8. Discord Behavior

Discord is the operator visibility layer, not the execution engine.

### Good Discord Uses

- human instructions
- dispatch started
- worker completed
- blocked/failure notifications
- stale-claim release notices
- major handoffs between stages

### Bad Discord Uses

- using Discord as the only task database
- assuming conversation equals execution
- hiding failures because the bot can still reply conversationally

### Message Discipline

Important coordination events should be visible in Discord.

Not every internal step needs to be posted.
The operator should see at least:

- task claimed
- stage/worker launched
- stage completed
- task blocked
- stale claim released
- dashboard/runtime failure if it affects execution

## 9. Worker Execution Model

Workers run through OpenClaw hooks against the local gateway.

### Required Runtime Contract

The live contract depends on:

- hooks enabled
- hook token present
- explicit request session keys allowed
- `hook:` session key prefix allowed
- `agents.defaults.timeoutSeconds >= 180`
- `minimax-portal/MiniMax-M2.5` as the stable default worker model

### Why Isolated Hook Sessions Matter

Bounded worker dispatch must use isolated hook sessions.

Persistent `agent:<id>:main` sessions are not safe for dispatcher-launched bounded tasks because they carry stale state and can wedge future dispatches.

### What Counts As Real Worker Activity

A launch is not enough.

The worker is only considered real when:

- hook launch succeeds
- a session appears in `agents/<id>/sessions/`
- the transcript shows actual assistant/tool activity

## 10. Git And GitHub Model

Git is durable memory.

The system should leave behind recoverable evidence:

- branch
- commit
- workflow run
- artifact path
- task record

### Expected Commit Style

Use:

- `[agent:<id>][task:<id>] ...`

Example:

- `[agent:engineer][task:ops-0014] fix follow-up CI check failures`

### Expected PR Flow

1. open focused branch
2. push branch
3. create PR
4. review compare
5. merge when intentional
6. delete branch immediately

### Branch Discipline

Do not keep already-absorbed branches around.

If a branch is no longer ahead of `main`, it should usually be deleted.

Branch lists should reflect active work, not old history.

## 11. Upgrade Safety

Official OpenClaw updates are not trusted automatically.

Before and after updates, run:

```bash
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
```

If either fails:

- do not trust dispatcher output
- do not assume worker routing still works
- repair the contract first

### Things An Update Can Break

- hook/session-key support
- model defaults
- timeout defaults
- allowed agents through hooks
- dispatcher runtime assumptions
- transcript format used for abort detection

## 12. Day-To-Day Operator Checks

### Basic Runtime Check

```bash
systemctl --user status rook-dashboard.service --no-pager
systemctl --user status rook-dispatcher.timer --no-pager
curl -fsS http://127.0.0.1:3001/kanban >/dev/null
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
```

### Which Checkout To Use

Use:

- `/root/.openclaw/workspace` when checking live services, live canonical tasks, and live runtime behavior
- `/root/.openclaw/workspace-main` when preparing commits, opening PRs, or reviewing diffs against `main`

Do not assume those two trees are always identical at every moment.

### When Looking At The Board

Ask:

- does the board match canonical task state?
- do `In Progress` cards have recent dispatch activity?
- do `Blocked` cards have real reasons?
- do recent `Done` cards have matching commits/PRs/artifacts?

### When A Worker Fails

Check:

- `operations/logs/dispatcher/<date>.jsonl`
- `operations/health/dispatcher-alerts.json`
- worker transcript in `agents/<id>/sessions/`
- canonical task `failure_reason`

## 13. Recovery Principles

The system should prefer honest degradation over fake smoothness.

That means:

- block the task instead of pretending it is still running
- log the failure locally even if Discord send fails
- recover the dashboard through supervision, not manual memory
- update the board from canonical truth, not from wishful UI state

## 14. What Is Still Imperfect

The repaired system is real, but not effortless.

Current limits:

- long worker runs can still abort mid-cleanup
- provider/runtime stability still matters
- `engineer` remains the safe fallback for some specialist setup work
- some task completion normalization still relies on dispatcher-side cleanup logic

Those are known limits.
They are narrower and more honest than the original failure mode.

## 15. What “Working” Means Now

The system is working when all of this is true together:

- dashboard is supervised and reachable
- dispatcher is active
- canonical tasks are coherent
- kanban reflects canonical state closely
- Discord shows important lifecycle events
- workers launch through isolated hook sessions
- completed work leaves commits, PRs, and task artifacts

If one of those is missing, the system may still look alive.
It is not fully healthy until the whole loop is real.
