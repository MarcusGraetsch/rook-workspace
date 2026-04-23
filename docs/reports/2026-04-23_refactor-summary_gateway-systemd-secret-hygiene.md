# Gateway Systemd Secret Hygiene

Date: 2026-04-23

## Scope

Remove API keys from the OpenClaw gateway systemd unit and make future inline-secret regressions visible in the operations diagnostics.

## Findings

- `operations/systemd/openclaw-gateway.service` and the installed user unit contained provider API keys directly as `Environment=` assignments.
- The dispatcher already used the safer pattern: `EnvironmentFile=-/root/.openclaw/.env.d/*.txt`.
- Existing drift diagnostics did not include `openclaw-gateway.service`, so gateway unit drift and inline secret regressions were not visible in the aggregate control-plane check.

## Actions Taken

- Replaced inline API-key `Environment=` entries in `operations/systemd/openclaw-gateway.service` with:
  - `EnvironmentFile=-/root/.openclaw/.env.d/brave-api-key.txt`
  - `EnvironmentFile=-/root/.openclaw/.env.d/minimax-api-key.txt`
  - `EnvironmentFile=-/root/.openclaw/.env.d/kimi-api-key.txt`
- Created the live Brave key environment file from the previously installed unit.
- Hardened live key file permissions for Brave, MiniMax, and Kimi to `0600`.
- Synced the repo unit to `/root/.config/systemd/user/openclaw-gateway.service`.
- Ran `systemctl --user daemon-reload` and restarted `openclaw-gateway.service`.
- Extended `operations/bin/check-runtime-control-plane.mjs`:
  - includes `openclaw-gateway.service` in user systemd drift checks.
  - treats inline secret-like `Environment=` assignments in checked units as errors.

## Validation

- Installed gateway unit now references only EnvironmentFiles for provider API keys.
- Provider key files have mode `0600`.
- `openclaw-gateway.service` restarted successfully.
- `node operations/bin/check-runtime-control-plane.mjs` is green with no user-systemd drift and no inline-secret findings.

## Open Risks

- Secret values are still present in Git history and shell/tool output history from earlier diagnostics. Rotating exposed provider keys should be handled as a separate operational security task.
- Other non-checked service files or future units may still need broader repository secret scanning.

## Next Steps

- Rotate exposed Brave, MiniMax, and Kimi keys.
- Add a repository-wide secret scan that fails on committed API-key patterns while allowing documented local `EnvironmentFile` references.
