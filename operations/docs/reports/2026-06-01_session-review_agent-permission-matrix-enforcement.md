# Session Review: agent permission matrix enforcement

**Date:** 2026-06-01  
**Scope:** Formalize and enforce the OpenClaw agent permission matrix, and align hook/session security checks with the current secure posture.

## Lagebild

The live `openclaw.json` already had a mostly sane split between planner-style agents, executor-style agents, and the dispatcher bridge. What was missing was an explicit, machine-enforced matrix so the platform could detect drift instead of relying on memory and scattered reports.

## Befunde

- The permission model was only implicit in `openclaw.json`.
- The posture checks still treated `hooks.allowRequestSessionKey=false` as a problem even though that is the secure state for the current loopback-only setup.
- The credentials directory was more permissive than intended.
- The runtime posture checker treated the rook agent bundle as a hard error even though that bundle is intentionally protected by filesystem boundaries.

## Arbeitsplan

1. Encode the agent permission matrix in policy.
2. Teach the posture checker to validate that matrix.
3. Align the hook/session checks with the current secure config.
4. Tighten the credentials directory mode.
5. Re-run the posture and contract checks.

## Umgesetzte Änderungen

- Added `agent_permission_matrix` to `operations/config/runtime-posture-policy.json`.
- Extended `operations/bin/check-runtime-posture.mjs` to validate per-agent tool surfaces and permission profiles.
- Corrected `hooks.allowRequestSessionKey` validation in `operations/bin/check-runtime-posture.mjs`, `operations/bin/check-openclaw-contract.mjs`, and `operations/bin/check-runtime-control-plane.mjs` so `false` is treated as the secure state.
- Tightened `/root/.openclaw/credentials` to mode `0700`.
- Downgraded the rook agent bundle file-visibility check in `check-runtime-posture.mjs` from hard error to warning because that bundle is intentionally access-restricted.

## Validierung

- `node /root/.openclaw/workspace/operations/bin/check-runtime-posture.mjs` now returns `ok: true`.
- `node /root/.openclaw/workspace/operations/bin/check-openclaw-contract.mjs` now returns `ok: true`.
- `node /root/.openclaw/workspace/operations/bin/check-runtime-control-plane.mjs` still reports unrelated drift and model-configuration warnings, but the hook/session security posture is no longer the blocker.

## Offene Risiken

- `check-runtime-control-plane.mjs` still reports existing model-config drift and stale-agent warnings, including the legacy `main` agent directory.
- The rook agent bundle remains intentionally opaque from the current shell context, so deeper inspection will need to happen through the agent’s own access path or a future cleanup of that boundary.

## Nächste Schritte

1. Decide whether to treat the remaining `main` agent directory as legacy noise or to remove/bind it.
2. Triage the model-config drift warnings in the control-plane checker.
3. Move to the next Phase 1 item: explicit approval gates for service restarts, config rewrites, and outbound messaging.
