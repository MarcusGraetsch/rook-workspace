# Runtime Operations

This runbook is for the actual VPS runtime, not the aspirational architecture.

## What Must Be Supervised

- `openclaw-gateway.service`
- `rook-dashboard.service`
- `rook-dashboard-watchdog.timer`
- `rook-dispatcher.timer`
- `rook-runtime-backup.timer`

The gateway alone is not enough. If the dashboard and dispatcher are unsupervised, the system degrades into chat without execution.

## Which Checkout Is Which

There are two different workspace checkouts on this VPS:

- `/root/.openclaw/workspace`
  - the live runtime checkout
- `/root/.openclaw/workspace-main`
  - the clean Git/PR checkout

Use `/root/.openclaw/workspace` for:

- live service scripts
- live task-state inspection
- live dashboard/runtime verification
- user `systemd` unit sync from the currently deployed repo copy

Use `/root/.openclaw/workspace-main` for:

- branch work
- PR preparation
- compare review
- documentation changes
- clean merges into `main`

Do not treat the live runtime checkout as the safest place for broad Git cleanup.

## Install User Units

```bash
mkdir -p ~/.config/systemd/user
cp /root/.openclaw/workspace/operations/systemd/rook-dashboard.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dashboard-watchdog.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dashboard-watchdog.timer ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dispatcher.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dispatcher.timer ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-runtime-backup.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-runtime-backup.timer ~/.config/systemd/user/
chmod +x /root/.openclaw/workspace/operations/bin/bootstrap-specialist-workspaces.sh
chmod +x /root/.openclaw/workspace/operations/bin/start-dashboard.sh
chmod +x /root/.openclaw/workspace/operations/bin/dashboard-watchdog.sh
chmod +x /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs
chmod +x /root/.openclaw/workspace/operations/bin/backup-runtime-to-drive.sh
chmod +x /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
chmod +x /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
/root/.openclaw/workspace/operations/bin/bootstrap-specialist-workspaces.sh
systemctl --user daemon-reload
systemctl --user enable --now rook-dashboard.service
systemctl --user enable --now rook-dashboard-watchdog.timer
systemctl --user enable --now rook-dispatcher.timer
systemctl --user enable --now rook-runtime-backup.timer
```

## Verification

```bash
# Gateway health
systemctl --user status openclaw-gateway.service --no-pager
curl -fsS http://127.0.0.1:3001/health | jq

# Dashboard and timers
systemctl --user status rook-dashboard.service --no-pager
systemctl --user status rook-dashboard-watchdog.timer --no-pager
systemctl --user status rook-dispatcher.timer --no-pager
systemctl --user status rook-runtime-backup.timer --no-pager

# Kanban accessible
curl -fsS http://127.0.0.1:3001/kanban >/dev/null

# Dispatcher dry run
node /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs --dry-run --limit 3

# Runtime smoke checks
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs

# Manual runtime backup test
/root/.openclaw/workspace/operations/bin/backup-runtime-to-drive.sh

# Restore a runtime snapshot
/root/.openclaw/workspace/operations/bin/restore-runtime-backup.sh \
  --from-local /root/backups/rook-runtime/<timestamp>

# Hook dispatch test (replace <task-id>)
ROOK_DISPATCH_TIMEOUT_SECONDS=35 node /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs --task <task-id> --limit 1 --dispatch-mode hook
```

## Stage Transition Validation

The Kanban board reflects real execution stages:

| Stage | Meaning |
|-------|---------|
| **Intake** | Ticket is being refined into a real task contract |
| **Ready** | Dispatchable but not yet claimed |
| **In Progress** | Engineer execution is active |
| **Testing** | Test-stage work is active |
| **Review** | Review-stage work is active |
| **Done** | Task completed honestly, board and canonical state aligned |

Each stage transition should correspond to real worker activity, not just text updates.

`Ready` is intentionally gated:

- the task must have a non-empty intake brief
- the task must have at least one checklist item

If those requirements are missing, the dashboard should keep the ticket in `Intake`/planning rather than allowing dispatchable state.

`Ready` is now also an execution trigger:

- when a ticket is moved into `Ready` through the dashboard API, the system immediately runs the canonical dispatch wrapper
- that means drag-and-drop into `Ready` should start the same real dispatch path that the old Discord command used
- if the dispatch attempt fails, the ticket still lands in `Ready`, but the dashboard returns the real failure reason so the UI can surface it
- edits to a ticket that is already sitting in `Ready` do not repeatedly re-dispatch it unless it newly transitions into `Ready`

- Canonical task files under `workspace/operations/tasks/` are the durable source of truth.
- The dashboard is the human control plane.
- Discord is intake and notification, not durable execution state.
- The live deployed runtime currently reads from `/root/.openclaw/workspace`, not `/root/.openclaw/workspace-main`.
- Mutable runtime state is separated from the tracked repo under `/root/.openclaw/runtime/operations/`.
- Dispatcher logs are written under `/root/.openclaw/runtime/operations/logs/dispatcher/`.
- Dispatcher alert snapshots are written under `/root/.openclaw/runtime/operations/health/dispatcher-alerts.json`, even if Discord notification fails.
- Discord dispatch bridge state is written under `/root/.openclaw/runtime/operations/health/discord-dispatch-state.json`.
- Runtime task overlays are written under `/root/.openclaw/runtime/operations/task-state/` and should be treated as live execution state, not reviewable source history.
- Archived tasks live under `/root/.openclaw/runtime/operations/archive/tasks/`.
- Runtime smoke checks are written under `/root/.openclaw/runtime/operations/health/runtime-smoke.json` and should be treated as stronger evidence than heartbeat files.
- The dashboard SQLite file at `workspace/engineering/rook-dashboard/data/kanban.db` is runtime state. It should be snapshotted by backup jobs rather than committed as normal source code.
- Passive Kanban reconciliation must not rewrite canonical task files just to persist regenerated board projection metadata such as card position or column ids.
- The runtime backup job snapshots:
  - dashboard SQLite state
  - canonical tasks and project registry from the tracked workspace
  - archived tasks from `/root/.openclaw/runtime/operations/archive/tasks/`
  - health snapshots, task overlays, and dispatcher logs from `/root/.openclaw/runtime/operations/`
- Runtime backups are stored locally under `/root/backups/rook-runtime/`.
- If `rclone` is configured with the `gdrive:` remote, runtime backups should sync to `gdrive:DigitalCapitalismBackups/rook-runtime/<host>/`.
- Local-mode specialist execution depends on provider env vars being available. Keep these current:
  - `/root/.openclaw/.env.d/minimax-api-key.txt`
  - `/root/.openclaw/.env.d/kimi-api-key.txt`
- The dispatcher and runtime smoke checker now load those env files explicitly before spawning `openclaw agent --local`.
- Specialist sandboxes should reuse the checked-out VPS repos through `/root/.openclaw/workspace-*/workspace/repos/*` links instead of trying to clone GitHub repos on demand.
- Dispatcher handoffs should use hook mode against the local OpenClaw gateway. That path supports explicit isolated `sessionKey` values and avoids reusing poisoned `agent:<id>:main` sessions.
- Dispatcher-launched workers should prefer `minimax-portal/MiniMax-M2.7` unless there is a verified reason to override it. The `kimi-coding/k2p5` path has shown mid-task aborts and malformed tool-call behavior during longer tool-heavy runs.
- The live OpenClaw contract should keep `agents.defaults.timeoutSeconds` at `180` and the core worker agents (`engineer`, `researcher`, `test`, `review`) on `minimax/MiniMax-M2.7`, with the dispatcher user unit aligned to `minimax-portal/MiniMax-M2.7`.
- Hook dispatch success means the isolated worker session actually starts and produces assistant activity. Full task completion still belongs to the worker/task lifecycle, not the dispatcher launch step.
- Dispatcher claims now store explicit hook metadata in the canonical task file under `dispatch`. That metadata is also used to detect worker aborts from the transcript before the old stale-claim timeout expires.
- Runtime smoke checks should use isolated hook sessions, not persistent `agent:<id>:main` sessions. Persistent-session smoke results are weaker and can be poisoned by unrelated session history.
- Stage fallback is enabled by default for `testing` and `review`: if the dedicated `test` or `review` runtime is unstable, the dispatcher can execute that bounded work through `engineer` while keeping the canonical task in `testing` or `review`.
- Ready-stage bootstrap tasks for `test` and `review` should also execute through `engineer` when the ticket is about setting up the specialist itself.
- Discord notification is best-effort only. If `openclaw message send` or upstream network fetch fails, the canonical task should still land in `blocked` with a durable dispatcher alert record.
- Keep `rook-dispatcher.timer` disabled until the hook-based smoke test above succeeds on the live gateway and the target specialist workspace can reach the repo/task files it was assigned to handle.
