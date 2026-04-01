# Live System Behavior

This document describes the system that is actually running on the VPS today.

It is not an architecture wish list.
It is the current operational model after the dispatcher, dashboard, and hook runtime repairs.

## Core Runtime Pieces

The live system depends on these supervised components:

- `openclaw-gateway.service`
- `rook-dashboard.service`
- `rook-dashboard-watchdog.timer`
- `rook-dispatcher.timer`

If the gateway is up but the dashboard and dispatcher are not supervised, the system degrades into chat without reliable execution.

## Source Of Truth

Canonical task state lives in:

- `workspace/operations/tasks/<project>/<task>.json`

This is the real coordination state.

The dashboard reads and edits that state.
Discord is not the source of truth.

## Human Control Paths

There are two real entry paths:

1. Human changes task state in the dashboard / kanban.
2. Human gives instruction through Discord, and Rook translates that into canonical task work.

The control loop is only considered real when canonical task state changes and the dispatcher can claim and launch work from it.

## Rook's Actual Role

Rook is the coordinator.

Rook should:

- read canonical task state
- summarize and classify work
- trigger or inform dispatch
- surface failures and blocking conditions

Rook should not be treated as proof that work happened.

Speech in Discord is not execution.
Execution only counts when a task is claimed, a worker session is launched, and state is written back.

## Dispatcher Role

The dispatcher is the control-loop bridge between canonical tasks and worker execution.

The dispatcher:

- scans canonical tasks
- blocks tasks with unresolved dependencies
- claims dispatchable tasks
- launches isolated hook sessions with explicit `sessionKey`
- records launch metadata in `task.dispatch`
- watches worker transcripts for completion or aborts
- releases claims or blocks tasks when runs fail
- writes durable alerts even if Discord notifications fail

Transient runtime-abort rule:

- if a hook worker dies with a transient `Request was aborted` style failure, the dispatcher now retries automatically before marking the task `blocked`
- only after retry budget is exhausted should the task remain blocked for human attention

The dispatcher does not own business logic for the task itself.
It owns launch, supervision, and state honesty.

## Worker Execution Model

Workers run through OpenClaw hooks against the local gateway.

Important runtime properties:

- isolated hook sessions are required
- persistent `agent:<id>:main` sessions are not safe for bounded worker dispatch
- hook workers currently prefer `minimax-portal/MiniMax-M2.5`
- live `openclaw.json` keeps `agents.defaults.timeoutSeconds = 180`

That means a worker launch is considered healthy only when:

- the hook request is accepted
- the worker session appears in `agents/<id>/sessions/`
- the transcript shows real assistant/tool activity

## Stage Ownership And Fallback

The intended normal pipeline is:

`research -> engineer -> test -> review -> done`

Current live behavior is slightly more pragmatic:

- `engineer` is fully usable as the fallback execution agent
- `test` and `review` now pass isolated hook smoke checks
- bootstrap/setup tasks for `test` and `review` still route through `engineer`

That fallback is intentional.
It prevents recursive setup tasks from depending on a specialist that does not yet fully exist.

Examples:

- `ops-0014` established the testing stage with a real `.github/workflows/tests.yml` pipeline and was merged to `main` after green `Tests` and `Review Agent` runs
- `ops-0013` set up the review stage through `engineer`, produced a real workflow artifact, and was normalized to `done`

## Health Signals

Old heartbeat files are not enough.

Stronger health now comes from:

- `workspace/operations/health/runtime-smoke.json`
- `workspace/operations/health/dispatcher-alerts.json`
- `workspace/operations/logs/dispatcher/<date>.jsonl`
- canonical task `dispatch` metadata
- supervised service state in user `systemd`

This gives four different truths:

- can the services stay alive
- can a worker start
- did a worker really do anything
- did canonical task state get updated honestly

## Dashboard Behavior

The dashboard is the human control plane.

It is expected to:

- stay online under supervision
- expose kanban and task state
- reconcile kanban rows from canonical task state before serving the board
- reflect real runtime health
- not invent execution that did not happen

Operational details:

- the kanban board now auto-refreshes every 5 seconds so stage movement is visible without manual reloads
- if a task becomes `blocked` and the board has no explicit `Blocked` column, the card stays anchored to the stage that actually failed
- that means an engineer-stage abort renders as `In Progress` plus a blocked pipeline badge, not `Ready` plus confusion

If the dashboard goes down, the system is degraded even if Discord still replies.

## Discord Behavior

Discord is:

- command intake
- status output
- escalation surface
- operator visibility for important dispatcher handoffs and lifecycle events
- the human-facing place where important agent handoffs should remain visible

Discord is not:

- a durable task store
- a reliable worker runtime
- proof that orchestration completed

Operational rule:

- `#agent-commands` is now a narrow control channel, not general Rook chat
- that channel is bound to the dedicated `dispatcher` agent
- a user `systemd` timer (`rook-discord-dispatch-bridge.timer`) scans new `#agent-commands` messages every 15 seconds
- when it sees an explicit dispatch request such as `dispatch canonical task ops-0019`, it launches the canonical dispatcher wrapper directly and posts an accepted/blocked acknowledgement back to Discord
- this path exists so one Discord command can start real pipeline movement without requiring repeated human nudges

Important caveat:

- Rook can still speak elsewhere in Discord
- the control loop is only trusted when the bridge/dispatcher changes canonical task state and the dashboard reflects it

## Lifecycle Events

Important lifecycle events (dispatch started, handoff, blocked, failure, completion) must appear in Discord, but Discord is not the source of truth.

## Git And GitHub Behavior

Git remains the durable memory for work products.

Expected pattern:

- task points at a target branch
- worker produces commits with `[agent:...][task:...]`
- task records relevant commits/artifacts
- branch is pushed to GitHub
- GitHub workflows in `rook-workspace` should fetch only the specific submodule each job needs
- `.gitmodules` should use GitHub Actions-compatible HTTPS URLs, not SSH-only URLs that require extra runner keys
- workflow steps must run inside the actual package roots, not assume the repository root is the build root
- `working-notes` is treated as an external project CI concern here: this repository validates the pinned gitlink, while the site build itself belongs in the `working-notes` repository
- workspace CI may still need project-specific install commands when an external repo has not yet standardized its own lockfile or test dependency manifest
- Review Agent must match real repository capabilities: PR-comment steps need explicit `pull-requests` and `issues` permissions, and CodeQL upload should stay disabled unless code scanning is enabled for the repository
- Review Agent comment publication is best-effort only. The review gate is the analysis itself, not whether GitHub allowed an automated PR comment in that workflow context.
- Kanban is not the only source of truth, but it must stay synchronized enough to be a reliable human-facing projection of canonical task state.
- Agent branches should be short-lived: open them for focused work, merge them quickly, and delete them immediately after merge so branch lists reflect active work rather than stale history.

That is how task execution stays recoverable after a crash or OpenClaw update.

## OpenClaw Update Safety

An official OpenClaw update is not trusted automatically.

After any update, run:

```bash
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
```

These checks verify:

- hook support
- allowed isolated session keys
- core agent presence
- model and timeout defaults
- real hook worker responsiveness

If either check fails, do not trust the dispatcher until it is repaired.

## Current Limits

The system is now operational, but not yet effortless.

The remaining limits are:

- long worker runs can still abort mid-cleanup
- specialist stages exist, but `engineer` is still the safe fallback for setup tasks
- canonical task finalization still benefits from dispatcher-side normalization when a task spans multiple follow-up PRs

That is acceptable for now.
The execution core is now real, observable, and recoverable.
