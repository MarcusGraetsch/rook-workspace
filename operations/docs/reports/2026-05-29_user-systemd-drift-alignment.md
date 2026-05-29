# User Systemd Drift Alignment

- date: 2026-05-29 14:25 CEST
- scope: tracked user systemd unit templates versus installed live units
- mode: repo alignment to already-installed runtime state, no service restart

## Lagebild

`check-runtime-control-plane.mjs` reported 3 user systemd drift warnings for:

- `openclaw-gateway.service`
- `rook-dashboard.service`
- `rook-dispatcher.service`

The installed units were already active in the live runtime. The repo templates were stale compared with the installed units, so the Git-backed Single Source of Truth no longer matched the actual host.

## Befunde

- `openclaw-gateway.service` differed only in `OPENCLAW_SERVICE_VERSION`: repo `2026.4.15`, installed `2026.4.27`.
- `rook-dashboard.service` differed only in dashboard bind host: repo `127.0.0.1`, installed `0.0.0.0`.
- `rook-dispatcher.service` differed only by Telegram notification environment:
  - `ROOK_NOTIFY_TELEGRAM_ENABLED=1`
  - `ROOK_NOTIFY_TELEGRAM_TARGET=user:549758481`
- These live differences looked intentional and already operational, so the repo templates were updated to match the installed runtime instead of rolling the host back.

## Umgesetzte Aenderungen

- Updated `operations/systemd/openclaw-gateway.service`.
- Updated `operations/systemd/rook-dashboard.service`.
- Updated `operations/systemd/rook-dispatcher.service`.
- Added this operations report.

## Validierung

- `diff -q` between repo and installed unit for all three changed units: no differences.
- `systemd-analyze --user verify ...`: passed outside the filesystem sandbox.
- `node operations/bin/check-runtime-control-plane.mjs`: `ok=true`, `warning_count=25`, `user_systemd_drift.warning_count=0`.
- No `systemctl --user daemon-reload` or restart was required because installed units were not changed.

## Offene Risiken

- Dashboard currently binds to `0.0.0.0`; this is acceptable only with the existing local/reverse-proxy/firewall posture and should remain covered by runtime posture review.
- Remaining control-plane warnings are unrelated to user systemd drift: model config drift, stale agent directories, runtime state coverage, and accepted posture warnings.

## Naechste Schritte

1. Move to provider/model configuration drift or provider probe environment loading.
2. Keep future live unit edits paired with immediate repo template updates to preserve Git as SSOT.
