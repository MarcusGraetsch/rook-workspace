# Session Review: Voice-Call Plugin Disable

Date: 2026-05-31

## Lagebild

After the previous hardening passes, the live OpenClaw stack was stable and the remaining noisy warning was the auto-load notice for the `voice-call` plugin. The gateway still also emitted a `tasks/registry` restore warning, but that was not part of the immediate config hazard.

## Befunde

- `plugins.entries.voice-call.enabled` was still `true`.
- The gateway log warned that `plugins.allow` is empty and the non-bundled `voice-call` plugin may auto-load.
- There was no evidence in the current session that voice-call was required for the core Hermes/OpenClaw workflow.

## Arbeitsplan

1. Disable the unused voice-call plugin.
2. Restart the live gateway/node pair.
3. Confirm the gateway stays healthy.
4. Re-run the doctor pass and verify the voice-call warning is gone.

## Umgesetzte Änderungen

- Updated `/root/.openclaw/openclaw.json`
  - changed `plugins.entries.voice-call.enabled` from `true` to `false`

- Restarted:
  - `openclaw-gateway.service`
  - `openclaw-node.service`

## Validierung

- `curl http://127.0.0.1:18789/health` returned `{"ok":true,"status":"live"}` after the restart settled.
- A filtered `openclaw doctor --deep` pass no longer reported the `voice-call` warning.
- The earlier control-ui and hooks hardening changes remained intact.

## Nächste Schritte

- Keep `voice-call` disabled unless a concrete telephony requirement appears.
- Investigate the persistent `tasks/registry` restore warning next, since that is the last recurring runtime warning that still appears in gateway logs.
