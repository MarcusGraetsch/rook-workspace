# Session Review: Message Tool Routing

Date: 2026-05-31

## Lagebild

`openclaw doctor --deep` still reported two routing warnings after the rootless runtime work:

- `dispatcher` was routed from Discord, but had no messaging tool available.
- `rook` was routed from Discord and Telegram, but had no messaging tool available.

The rest of the live OpenClaw stack was already healthy. The remaining warning was Telegram first-time setup / allowlist mode.

## Befunde

- `tools.profile: "coding"` does not include `group:messaging`.
- `dispatcher` had an explicit allowlist with only `read` and `exec`.
- `rook` had no explicit tool override, so it inherited the coding profile without messaging.
- The doctor warning was specific: add `message`, add `group:messaging`, or switch to a messaging-capable profile.

## Arbeitsplan

1. Keep the existing coding profile.
2. Add only `group:messaging` to the two routed agents that need outbound channel actions.
3. Restart gateway and node.
4. Re-run `openclaw doctor --deep` and confirm the messaging warnings are gone.

## Umgesetzte Änderungen

- Updated `/root/.openclaw/openclaw.json`
  - added `tools.alsoAllow: ["group:messaging"]` for `rook`
  - added `tools.alsoAllow: ["group:messaging"]` for `dispatcher`
- Restarted:
  - `openclaw-gateway.service`
  - `openclaw-node.service`

## Validierung

- `systemctl restart openclaw-gateway.service openclaw-node.service` completed successfully.
- `systemctl status` showed both services active after restart.
- `openclaw doctor --deep` no longer reported the `message tool is unavailable` warnings for `rook` or `dispatcher`.
- The only remaining warning in the filtered doctor output is Telegram first-time setup / allowlist mode.

## Nächste Schritte

- Decide whether Telegram should stay in allowlist mode or be opened further.
- If Telegram stays restricted, document the intended sender and group allowlist explicitly so the warning becomes expected state rather than drift.
- If needed, continue with the remaining config drift: registry restore warning and any Telegram group policy cleanup.
