# Session Review: Explicit Approval Gate for Risky OpenClaw Actions

**Date:** 2026-06-01  
**Scope:** Make the approval gate explicit for service restarts, config rewrites, and outbound messages in the Hermes + OpenClaw control plane.

## Lagebild

The runtime already had several risky action paths, but the approval boundary was implicit. The remaining restart and rewrite logic lived in a handful of helper scripts and service units:

- `dashboard-watchdog.sh` could restart `rook-dashboard.service`
- `health-guardian.sh` and `check-gateway.sh` could restart `openclaw-gateway.service`
- `openclaw-gateway-autoreload.service` could restart the gateway after package changes
- `model-mode-controller.mjs` could rewrite `openclaw.json` and model-mode state
- `dispatcher/notify.mjs` could emit outbound Discord and Telegram messages

The goal for this slice was to make those actions visibly gated, policy-driven, and easy to audit.

## Befunde

- The system had multiple independent restart paths, so gating only one of them would have left drift.
- Outbound messaging was already centralized enough that one helper could cover the important notification surfaces.
- The model-mode controller was the clearest config-rewrite path and needed an explicit approval check before any switch or restore.
- The posture checker already had the right place to enforce the policy shape, but it did not yet describe approval gates.

## Arbeitsplan

1. Add a shared approval-gate helper and policy entries.
2. Wire the helper into restart, config rewrite, and outbound-message paths.
3. Add policy validation to the runtime posture check.
4. Update the live user/system unit files so the gate is actually active on the VM.
5. Validate the helper, scripts, and unit files.

## Umgesetzte Änderungen

- Added [`operations/bin/approval-gate.mjs`](/root/.openclaw/workspace/operations/bin/approval-gate.mjs)
  - policy-driven approval helper for `service_restart`, `config_rewrite`, and `outbound_message`
- Updated [`operations/config/runtime-posture-policy.json`](/root/.openclaw/workspace/operations/config/runtime-posture-policy.json)
  - added explicit `approval_gates` entries with env var names and descriptions
- Updated [`operations/bin/model-mode-controller.mjs`](/root/.openclaw/workspace/operations/bin/model-mode-controller.mjs)
  - blocks mode switches/restores unless config-rewrite approval is present
  - skips Telegram state-change alerts if outbound approval is missing
- Updated [`operations/bin/dispatcher/notify.mjs`](/root/.openclaw/workspace/operations/bin/dispatcher/notify.mjs)
  - gates outbound Discord and Telegram notification sends
- Updated [`operations/bin/dashboard-watchdog.sh`](/root/.openclaw/workspace/operations/bin/dashboard-watchdog.sh)
  - requires service-restart approval before restarting `rook-dashboard.service`
- Updated [`/root/.openclaw/health/health-guardian.sh`](/root/.openclaw/health/health-guardian.sh)
  - requires service-restart approval before restarting `openclaw-gateway.service`
- Updated [`/root/.openclaw/health/check-gateway.sh`](/root/.openclaw/health/check-gateway.sh)
  - requires service-restart approval before trying a gateway restart
- Updated [`operations/bin/check-runtime-posture.mjs`](/root/.openclaw/workspace/operations/bin/check-runtime-posture.mjs)
  - now validates that the approval-gate policy entries exist
- Updated user/systemd unit files in the workspace and live VM copies:
  - [`operations/systemd/rook-dashboard-watchdog.service`](/root/.openclaw/workspace/operations/systemd/rook-dashboard-watchdog.service)
  - [`operations/systemd/openclaw-gateway-autoreload.service`](/root/.openclaw/workspace/operations/systemd/openclaw-gateway-autoreload.service)
  - [`operations/systemd/openclaw-gateway-health.service`](/root/.openclaw/workspace/operations/systemd/openclaw-gateway-health.service)
  - [`operations/systemd/rook-dispatcher.service`](/root/.openclaw/workspace/operations/systemd/rook-dispatcher.service)
  - `/etc/systemd/system/rook-dashboard-watchdog.service`
  - `/etc/systemd/system/openclaw-gateway-autoreload.service`
  - `/root/.config/systemd/user/rook-dashboard-watchdog.service`
  - `/root/.config/systemd/user/openclaw-gateway-autoreload.service`
  - `/root/.config/systemd/user/openclaw-gateway-health.service`
  - `/root/.config/systemd/user/rook-dispatcher.service`

## Validierung

- `node --check` passed for:
  - `operations/bin/model-mode-controller.mjs`
  - `operations/bin/dispatcher/notify.mjs`
  - `operations/bin/approval-gate.mjs`
  - `operations/bin/check-runtime-posture.mjs`
- `bash -n` passed for:
  - `operations/bin/dashboard-watchdog.sh`
  - `/root/.openclaw/health/health-guardian.sh`
  - `/root/.openclaw/health/check-gateway.sh`
- `node operations/bin/check-runtime-posture.mjs` returned `ok: true`
  - remaining warnings are unchanged baseline items (`main` agent dir and rook bundle visibility warnings)
- `approval-gate.mjs` returned approved results when the approval env vars were set:
  - `ROOK_APPROVAL_SERVICE_RESTART=1`
  - `ROOK_APPROVAL_CONFIG_REWRITE=1`
  - `ROOK_APPROVAL_OUTBOUND_MESSAGE=1`
- `systemd-analyze verify` passed for the modified unit files, with only pre-existing warnings about executable bits and unrelated `snapd`/connect noise
- The installed system unit files now contain the approval env lines
- `systemctl --user daemon-reload` was executed successfully after the user unit updates

## Open Risks

- The approval gate currently uses env vars set in the relevant systemd units. That is explicit and operationally simple, but it still depends on the unit files staying in sync with the repo copies.
- The `tasks/registry` restore warning is still open and remains the next state-simplification item.
- The baseline posture checker still reports the pre-existing `main` agent directory warning and rook bundle file-visibility warnings.

## Nächste Schritte

1. Update the roadmap to scratch out the approval-gate task.
2. Tackle the remaining `tasks/registry` source-of-truth warning.
3. Continue the audit of `/root/.openclaw/openclaw.json` for any remaining ambiguous routing or legacy drift.
