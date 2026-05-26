# VM Ops Baseline

## Purpose

`operations/bin/vm-ops-baseline.sh` creates a single markdown snapshot of the current operator state for the VM and both agent systems.

It is intentionally read-only and focuses on:

- host capacity and cron posture
- Git cleanliness and remotes for key repos
- OpenClaw control-plane checks
- Rook/Phoenix bridge signal counts

## Usage

```bash
cd /root/.openclaw/workspace
bash operations/bin/vm-ops-baseline.sh
```

The script writes a timestamped report to:

`operations/docs/reports/YYYY-MM-DD_HH-MM-SS_vm-ops-baseline.md`

## Recommended cadence

- run daily (manual or cron)
- run before major upgrades
- run before and after incident response changes

## Phase 2.1 automation

Daily baseline generation:

```bash
30 5 * * * /root/.openclaw/workspace/operations/bin/vm-ops-baseline.sh >> /var/log/vm-ops-baseline.log 2>&1
```

Threshold gate (10 minutes later):

```bash
40 5 * * * node /root/.openclaw/workspace/operations/bin/check-vm-ops-baseline-thresholds.mjs >> /var/log/vm-ops-thresholds.log 2>&1
```

Failure notification (5 minutes after gate):

```bash
45 5 * * * node /root/.openclaw/workspace/operations/bin/notify-vm-ops-threshold-failure.mjs >> /var/log/vm-ops-notify.log 2>&1
```

Threshold config:

- `operations/config/vm-ops-baseline-thresholds.json`
- `operations/config/vm-ops-notify.json`

Notifier runtime note:

- notifier uses `/usr/bin/node /usr/lib/node_modules/openclaw/dist/index.js message send` (does not depend on `openclaw` in PATH)
- set `"dry_run": true` in `vm-ops-notify.json` to test delivery plumbing without sending live alerts
- current production-safe default in this VM is Telegram as primary notifier channel; enable Discord only after channel/plugin availability is verified in `openclaw channels status`.

## Interpretation notes

- `check-runtime-posture.mjs` and `check-runtime-control-plane.mjs` emit JSON; warnings/errors in those blocks should be triaged first.
- Dirty repos in the Git section are expected in active agent systems, but sustained unmanaged churn is a drift risk.
- Bridge counts are trend signals; sudden spikes often indicate loops or archival lag.
- If notification delivery fails, pending alert payloads are stored in `operations/logs/vm-ops-notify-pending.jsonl`.
- Delivery success is treated as `at least one channel delivered` (primary or Telegram fallback).
