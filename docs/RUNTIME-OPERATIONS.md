# Runtime Operations

This runbook is for the actual VPS runtime, not the aspirational architecture.

## What Must Be Supervised

- `openclaw-gateway.service`
- `rook-dashboard.service`
- `rook-dashboard-watchdog.timer`
- `rook-dispatcher.timer`

The gateway alone is not enough. If the dashboard and dispatcher are unsupervised, the system degrades into chat without execution.

## Install User Units

```bash
mkdir -p ~/.config/systemd/user
cp /root/.openclaw/workspace/operations/systemd/rook-dashboard.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dashboard-watchdog.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dashboard-watchdog.timer ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dispatcher.service ~/.config/systemd/user/
cp /root/.openclaw/workspace/operations/systemd/rook-dispatcher.timer ~/.config/systemd/user/
chmod +x /root/.openclaw/workspace/operations/bin/bootstrap-specialist-workspaces.sh
chmod +x /root/.openclaw/workspace/operations/bin/start-dashboard.sh
chmod +x /root/.openclaw/workspace/operations/bin/dashboard-watchdog.sh
chmod +x /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs
chmod +x /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
chmod +x /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
/root/.openclaw/workspace/operations/bin/bootstrap-specialist-workspaces.sh
systemctl --user daemon-reload
systemctl --user enable --now rook-dashboard.service
systemctl --user enable --now rook-dashboard-watchdog.timer
systemctl --user enable --now rook-dispatcher.timer
```

## Verification

```bash
systemctl --user status rook-dashboard.service --no-pager
systemctl --user status rook-dashboard-watchdog.timer --no-pager
systemctl --user status rook-dispatcher.timer --no-pager
curl -fsS http://127.0.0.1:3001/kanban >/dev/null
node /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs --dry-run --limit 3
timeout 25s openclaw agent --local --agent engineer --message 'Reply with exactly OK and nothing else.' --json
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
ROOK_DISPATCH_TIMEOUT_SECONDS=35 node /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs --task <task-id> --limit 1 --dispatch-mode hook
```

## Notes

- Canonical task files under `workspace/operations/tasks/` are the source of truth.
- The dashboard is the human control plane.
- Discord is intake and notification, not durable execution state.
- Dispatcher logs are written under `workspace/operations/logs/dispatcher/`.
- Dispatcher alert snapshots are written under `workspace/operations/health/dispatcher-alerts.json`, even if Discord notification fails.
- Runtime smoke checks are written under `workspace/operations/health/runtime-smoke.json` and should be treated as stronger evidence than heartbeat files.
- Local-mode specialist execution depends on provider env vars being available. Keep these current:
  - `/root/.openclaw/.env.d/minimax-api-key.txt`
  - `/root/.openclaw/.env.d/kimi-api-key.txt`
- The dispatcher and runtime smoke checker now load those env files explicitly before spawning `openclaw agent --local`.
- Specialist sandboxes should reuse the checked-out VPS repos through `/root/.openclaw/workspace-*/workspace/repos/*` links instead of trying to clone GitHub repos on demand.
- Dispatcher handoffs should use hook mode against the local OpenClaw gateway. That path supports explicit isolated `sessionKey` values and avoids reusing poisoned `agent:<id>:main` sessions.
- Dispatcher-launched workers should prefer `minimax-portal/MiniMax-M2.5` unless there is a verified reason to override it. The `kimi-coding/k2p5` path has shown mid-task aborts and malformed tool-call behavior during longer tool-heavy runs.
- Hook dispatch success means the isolated worker session actually starts and produces assistant activity. Full task completion still belongs to the worker/task lifecycle, not the dispatcher launch step.
- Dispatcher claims now store explicit hook metadata in the canonical task file under `dispatch`. That metadata is also used to detect worker aborts from the transcript before the old stale-claim timeout expires.
- Stage fallback is enabled by default for `testing` and `review`: if the dedicated `test` or `review` runtime is unstable, the dispatcher can execute that bounded work through `engineer` while keeping the canonical task in `testing` or `review`.
- Discord notification is best-effort only. If `openclaw message send` or upstream network fetch fails, the canonical task should still land in `blocked` with a durable dispatcher alert record.
- Keep `rook-dispatcher.timer` disabled until the hook-based smoke test above succeeds on the live gateway and the target specialist workspace can reach the repo/task files it was assigned to handle.
