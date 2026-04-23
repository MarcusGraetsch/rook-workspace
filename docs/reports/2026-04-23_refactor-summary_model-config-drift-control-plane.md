# Refactor Summary: Model Config Drift Control-Plane Coverage

- Date: 2026-04-23
- Scope: model configuration drift detection, runtime agent model declarations, and dispatcher timer drift

## Findings

- The installed `rook-dispatcher.timer` still used the older 15-second schedule while the repo version uses the newer 2-minute cadence.
- `openclaw-gateway.service` logs showed runtime failures for an unknown Kimi model on `main`/persistent session lanes.
- `check-model-config-drift.mjs` already detected the concrete mismatch:
  - active agents were configured for `kimi-coding/moonshot-k2-6`
  - seven local agent `models.json` files only declared `kimi-coding/k2p5`
  - `rook` already had the correct `moonshot-k2-6` declaration
- `check-runtime-control-plane.mjs` did not include that model drift check, so the aggregate operator view missed a real execution blocker.

## Actions Taken

- Synchronized the installed user timer:
  - copied `operations/systemd/rook-dispatcher.timer` to `/root/.config/systemd/user/rook-dispatcher.timer`
  - ran `systemctl --user daemon-reload`
  - restarted `rook-dispatcher.timer`
- Added `model_config_drift` as a first-class check in `check-runtime-control-plane.mjs`.
- Made `check-model-config-drift.mjs` write JSON output synchronously so parent checks can reliably collect its output even when it exits nonzero.
- Added the existing `rook` `kimi-coding/moonshot-k2-6` model declaration to these runtime model files:
  - `/root/.openclaw/agents/engineer/agent/models.json`
  - `/root/.openclaw/agents/researcher/agent/models.json`
  - `/root/.openclaw/agents/test/agent/models.json`
  - `/root/.openclaw/agents/review/agent/models.json`
  - `/root/.openclaw/agents/coach/agent/models.json`
  - `/root/.openclaw/agents/health/agent/models.json`
  - `/root/.openclaw/agents/dispatcher/agent/models.json`

## Validation

- `systemctl --user status rook-dispatcher.timer --no-pager`
  - active with 2-minute schedule
- `node operations/bin/check-model-config-drift.mjs`
  - `ok: true`
  - `warning_count: 0`
- `node operations/bin/check-runtime-control-plane.mjs`
  - `model_config_drift.ok: true`
  - `model_config_drift.error_count: 0`
  - `user_systemd_drift.warning_count: 0`

## Open Risks

- `/root/.openclaw/agents/main` still exists as an unbound runtime directory and appears to be recreated around gateway startup.
- The gateway log still needs a post-restart verification window to confirm the old `kimi/moonshot-k2-6` lane error no longer recurs.
- The dispatcher hook model remains intentionally different from the default primary model and still appears as a warning.

## Next Steps

1. Restart or otherwise refresh the gateway only after deciding whether current sessions can tolerate it.
2. Re-check gateway logs after restart for `Unknown model` errors.
3. Investigate why the gateway recreates `/root/.openclaw/agents/main`.
