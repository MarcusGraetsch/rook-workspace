# OpenClaw Upgrade Guide

This guide exists to keep the Rook runtime working after an official OpenClaw update.

For the broader operating model and runtime expectations, also read:

- `docs/OPERATOR-DEVELOPER-MANUAL.md`

## Goal

After an update, verify that:

- hooks still work
- isolated worker sessions are still allowed
- dispatcher units still point at the intended execution path
- dashboard and dispatcher supervision are still installed
- runtime smoke checks still pass

Do not assume an official update preserves local behavior. Verify it.

## Pre-Upgrade Snapshot

Before updating OpenClaw:

```bash
cd /root/.openclaw
git status --short
git -C /root/.openclaw/workspace status --short
git -C /root/.openclaw/workspace submodule status
cp openclaw.json /tmp/openclaw.json.pre-upgrade.$(date +%F-%H%M%S)
systemctl --user status rook-dashboard.service --no-pager
systemctl --user status rook-dispatcher.timer --no-pager
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
node /root/.openclaw/workspace/operations/bin/check-runtime-control-plane.mjs
```

## Post-Upgrade Contract Checks

Run this first:

```bash
node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs
node /root/.openclaw/workspace/operations/bin/check-runtime-control-plane.mjs
git -C /root/.openclaw/workspace submodule status
```

The contract check must confirm:

- hooks are enabled
- `allowRequestSessionKey` is enabled
- `hook:` session keys are allowed
- `agents.defaults.timeoutSeconds` is still at least `180`
- `agents.defaults.model.primary` is still `minimax/MiniMax-M2.7`
- `rook`, `engineer`, `researcher`, `test`, and `review` are still defined
- those agents are still allowed through hooks
- `engineer`, `researcher`, `test`, and `review` still default to `minimax/MiniMax-M2.7`
- `rook-dispatcher.service` still runs in hook mode
- `rook-dispatcher.service` still points at a hook model compatible with the worker default model family
  - accepted today:
    - exact match with `agents.defaults.model.primary`
    - same model id across the `minimax` / `minimax-portal` provider pair

If that fails, fix the contract before trusting live dispatch.

## Runtime Verification

After the contract check:

```bash
systemctl --user daemon-reload
systemctl --user restart rook-dashboard.service
systemctl --user restart rook-dispatcher.timer
curl -fsS http://127.0.0.1:3001/kanban >/dev/null
node /root/.openclaw/workspace/operations/bin/check-agent-runtime.mjs
ROOK_DISPATCH_TIMEOUT_SECONDS=35 node /root/.openclaw/workspace/operations/bin/task-dispatcher.mjs --task ops-smoke-hook --limit 1 --dispatch-mode hook
```

## Required Live Config Expectations

The live `/root/.openclaw/openclaw.json` must continue to support:

- hooks enabled
- hook token present
- hook path enabled for the local gateway
- explicit requested `sessionKey` values
- `hook:` session key prefix
- `agents.defaults.timeoutSeconds >= 180`
- `agents.defaults.model.primary = minimax/MiniMax-M2.7`
- core worker agents defaulting to `minimax/MiniMax-M2.7`
- allowed hook agents including `engineer`, `researcher`, `test`, `review`, and `rook`

If an upgrade rewrites `openclaw.json`, inspect those fields immediately.

## Required User Units

These units must remain installed under `~/.config/systemd/user/`:

- `rook-dashboard.service`
- `rook-dashboard-watchdog.service`
- `rook-dashboard-watchdog.timer`
- `rook-dispatcher.service`
- `rook-dispatcher.timer`

After any upgrade that touches runtime paths or env behavior, resync the unit files from the repo and reload user `systemd`.

## Submodule Expectations

The live workspace depends on intentional submodule revisions.

At minimum, verify:

- `git -C /root/.openclaw/workspace submodule status`
- `engineering/rook-dashboard` still points at the deployed dashboard revision
- no submodule is left dirty unless you are actively repairing it

Do not treat a clean submodule worktree and a stale superproject pointer as the same thing.
The dashboard can be locally clean while `rook-workspace` still points at an outdated dashboard commit.

## What To Watch For

Common breakage patterns after an update:

- hooks disabled or token removed
- dispatcher falls back to non-isolated sessions
- model/provider defaults changed silently
- compatible hook model pair becomes incompatible because provider/model naming changed upstream
- tool policy changes break worker execution
- dashboard process path or Node environment changed
- submodule pointers no longer match the deployed dashboard or project revisions
- worker transcript format changes, breaking abort detection

## Recovery Order If Upgrade Breaks Runtime

1. Stop automatic dispatch if it is producing false task claims.
2. Restore hook/session-key support in `openclaw.json`.
3. Re-sync user units from `workspace/operations/systemd/`.
4. Re-run contract and smoke checks.
5. Re-enable dispatcher timer only after the smoke task behaves honestly.
