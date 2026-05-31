# Session Review: Telegram DM-only Policy and Dispatcher Messaging Profile

Date: 2026-05-31

## Lagebild

The platform was already mostly stabilized. The remaining doctor output was the Telegram first-time setup warning, while `dispatcher` was still configured in a way that prevented OpenClaw from recognizing messaging capability cleanly.

The live gateway/node pair stayed on the hardened single-VPS architecture and the rootless runtime changes remained in place.

## Befunde

- Telegram was still configured with `groupPolicy: "allowlist"` and no group registry, which kept `openclaw doctor` warning about first-time setup mode.
- `dispatcher` needed messaging capability, but the first attempt mixed `allow` and `alsoAllow` in the same scope, which invalidated the config.
- The cleanest fix was to make Telegram explicitly DM-only and to model `dispatcher` as a messaging agent with narrow extra runtime access.

## Arbeitsplan

1. Move Telegram from implicit group-allowlist state to explicit DM-only state.
2. Rework `dispatcher` so it uses the messaging profile instead of a mixed allowlist.
3. Restore service health.
4. Re-run doctor and confirm the route warnings are gone.

## Umgesetzte Änderungen

- Updated `/root/.openclaw/openclaw.json`
  - changed `channels.telegram.groupPolicy` from `allowlist` to `disabled`
  - changed `dispatcher.tools` to:
    - `profile: "messaging"`
    - `alsoAllow: ["read", "exec"]`

- Restarted:
  - `openclaw-gateway.service`
  - `openclaw-node.service`

## Validierung

- `systemctl reset-failed` and restart succeeded for both services.
- `curl http://127.0.0.1:18789/health` returned `{"ok":true,"status":"live"}`.
- `systemctl status` showed both gateway and node active after restart.
- `openclaw doctor --deep` no longer reports the `message tool is unavailable` warnings for `dispatcher` or `rook`.
- The remaining visible warning in the filtered doctor output is the Telegram DM allowlist / first-time setup note, which is now reduced by the DM-only policy change.

## Nächste Schritte

- Decide whether Telegram should remain DM-only permanently or whether a specific group registry should be added later.
- If Telegram stays DM-only, document that explicitly as the intended operating mode.
- Review the remaining non-fatal security warnings in the live logs, especially the insecure auth flags and the voice-call plugin auto-load notice.
