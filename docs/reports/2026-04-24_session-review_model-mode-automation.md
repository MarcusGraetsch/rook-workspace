# Session Review: Model Mode Automation

Date: 2026-04-24

## Lagebild

OpenClaw had no centralized policy layer for model quota pressure. Default worker models were configured statically in `openclaw.json`, while runtime checks already exposed token/session telemetry in `agents/*/sessions/sessions.json`. The dashboard watchdog already provided a periodic control loop, which made it a suitable integration point for an automatic model-mode controller.

## Befunde

- The system could detect quota pressure only implicitly through session telemetry.
- Model switching had been handled manually or ad hoc, which made Telegram `/model` changes brittle.
- There was no shared policy file for limits, reset windows, or fallback behavior.
- Telegram notification failures could have broken the automation path if not handled defensively.

## Arbeitsplan

1. Add a single model-policy config file with default/fallback model refs and thresholds.
2. Add a controller that reads session telemetry, evaluates pressure, and updates the active model in `openclaw.json`.
3. Hook the controller into the existing dashboard watchdog timer.
4. Expose the active mode in the control-plane diagnostics.
5. Add a small reusable skill for sharing the pattern.

## Umgesetzte Änderungen

- Added `workspace/operations/config/model-mode-policy.json`.
- Added `workspace/operations/bin/model-mode-controller.mjs`.
- Updated `workspace/operations/bin/dashboard-watchdog.sh` to run the controller.
- Updated `workspace/operations/bin/check-runtime-control-plane.mjs` to report model-mode state.
- Added reusable skill `rook-agent/skills/model-mode-guard/SKILL.md`.
- Runtime config `~/.openclaw/openclaw.json` was switched to the fallback model at runtime by the controller.

## Validierung

- `node --check` passed for the controller and control-plane script.
- `bash -n` passed for the watchdog script.
- `node model-mode-controller.mjs status` reported a valid fallback state and window usage.
- `node model-mode-controller.mjs evaluate` completed successfully after Telegram failures were made non-blocking.
- `check-runtime-control-plane.mjs` now reports model-mode findings in the diagnostics stream.

## Open Risks

- Usage estimation is based on local session telemetry, not a provider-side quota API.
- Thresholds in `model-mode-policy.json` are heuristic and may need adjustment after real-world observation.
- If the provider changes its quota window behavior, the local reset calculation will need to be revisited.

## Nächste Schritte

- Watch the next few watchdog cycles to confirm the fallback/restoration behavior is stable.
- Tune the thresholds if the local usage estimator is too aggressive.
- Consider wiring a dashboard badge or control panel view to the new runtime state file.
