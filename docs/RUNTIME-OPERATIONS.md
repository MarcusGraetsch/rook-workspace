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
timeout 25s openclaw agent --agent engineer --message 'Reply with exactly OK and nothing else.' --json
```

## Notes

- Canonical task files under `workspace/operations/tasks/` are the source of truth.
- The dashboard is the human control plane.
- Discord is intake and notification, not durable execution state.
- Dispatcher logs are written under `workspace/operations/logs/dispatcher/`.
- Keep `rook-dispatcher.timer` disabled until the smoke test above succeeds and the target specialist workspace can reach the repo/task files it was assigned to handle.
