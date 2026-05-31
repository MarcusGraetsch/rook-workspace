# Session Review: Control UI and Hooks Hardening

Date: 2026-05-31

## Lagebild

The platform was already in a stable state after the routing and rootless-runtime work. The remaining live security warnings in the gateway logs were:

- `gateway.controlUi.allowInsecureAuth=true`
- `hooks.allowRequestSessionKey=true`

Those two flags are both compatibility conveniences, but they widen the attack surface on a VPS that already uses localhost-bound control paths and a fixed hook namespace.

## Befunde

- `gateway.controlUi.allowInsecureAuth` was enabled even though the gateway is loopback-bound and the Control UI does not need the insecure compatibility path for the current local setup.
- `hooks.allowRequestSessionKey` was enabled even though the current hook config uses a fixed `defaultSessionKey` and does not define templated hook mappings.
- The local docs are clear that `allowRequestSessionKey` should stay off unless a hook mapping needs caller-selected or templated session keys.

## Arbeitsplan

1. Verify whether any hook mapping requires request-controlled session keys.
2. Turn off `hooks.allowRequestSessionKey` if nothing depends on it.
3. Turn off `gateway.controlUi.allowInsecureAuth` and keep the Control UI on the normal auth path.
4. Restart the live gateway/node pair and verify health.
5. Re-run the doctor check for the specific warnings.

## Umgesetzte Änderungen

- Updated `/root/.openclaw/openclaw.json`
  - `hooks.allowRequestSessionKey: true` -> `false`
  - `gateway.controlUi.allowInsecureAuth: true` -> `false`

- Restarted:
  - `openclaw-gateway.service`
  - `openclaw-node.service`

## Validierung

- The gateway and node restarted successfully.
- `curl http://127.0.0.1:18789/health` returned `{"ok":true,"status":"live"}` after the reload settled.
- A filtered `openclaw doctor --deep` pass no longer reported:
  - `allowInsecureAuth`
  - `allowRequestSessionKey`
  - the earlier message-tool warnings

## Nächste Schritte

- Keep the Control UI on the normal authenticated path unless a specific local compatibility need appears.
- Keep hook session keys fixed unless a future hook mapping explicitly requires caller-selected keys.
- The remaining live noise is now lower priority: plugin auto-load warnings and the existing `tasks/registry` restore warning.
