# Runtime Posture Policy

Date: 2026-04-18
Scope: turning persistent runtime posture warnings into explicit operator acknowledgements

## Summary

After the stale-state cleanup, the remaining control-plane findings were no longer implementation defects.
They were operator posture decisions:

- Telegram group ingress is intentionally disabled while DM allowlist access remains enabled.
- `gateway.controlUi.allowInsecureAuth=true` remains tolerated only because the control UI is loopback-bound and token auth is still enabled.

Leaving those as plain warnings created durable noise without making the posture more legible.

This package adds an explicit runtime posture policy file and teaches the posture checks to downgrade only those findings whose documented constraints still match the live configuration.

## Changed

- `operations/config/runtime-posture-policy.json`
- `operations/bin/check-runtime-posture.mjs`
- `operations/bin/check-runtime-control-plane.mjs`
- `docs/RUNTIME-OPERATIONS.md`

## Policy Model

Each acknowledged finding includes:

- `enabled`
- `reason`
- `review_after`
- `constraints`

Acknowledgement is valid only while:

1. the policy entry remains enabled
2. the live config still matches the documented constraints
3. the `review_after` date has not expired

If any of those conditions fails, the finding becomes a warning again automatically.

## Validation

Executed:

- `node operations/bin/check-runtime-posture.mjs`
- `node operations/bin/check-runtime-control-plane.mjs`

Expected outcome:

- acknowledged posture findings remain visible as `info`
- they no longer inflate warning counts
- unexpected config drift re-promotes them to warnings
