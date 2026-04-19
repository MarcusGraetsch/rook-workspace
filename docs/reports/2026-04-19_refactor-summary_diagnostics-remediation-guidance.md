# Diagnostics Remediation Guidance

Date: 2026-04-19
Scope: Dashboard diagnostics API and diagnostics UI

## Findings

- The Diagnostics page showed control-plane findings, but operators had to infer the next action from raw finding text.
- The open follow-up request captured in `ops-0049` was valid: the dashboard exposed problems, but not an operationally useful answer to "what should I do next?"
- Blind auto-fix was not the right first step because many findings affect live runtime state and require operator judgment.

## Actions Taken

- Added server-side remediation mapping in `src/app/api/control/diagnostics/route.ts`.
- Control-plane findings now carry a `remediation` object when the finding type is recognized.
- The remediation object includes:
  - a concise summary
  - an operator action
  - a suggested command where appropriate
  - an automation level (`manual`, `guided`, `dry-run`)
- Updated `src/app/diagnostics/page.tsx` to render a dedicated `What to do` panel under each finding.
- The UI now surfaces safe operator commands directly for findings such as:
  - stale or unbound agent directories
  - runtime state coverage mismatches
  - dispatcher hook model drift
  - acknowledged posture exceptions

## Validation

- `npm run build` in `engineering/rook-dashboard`
- `systemctl --user restart rook-dashboard.service`
- `systemctl --user status rook-dashboard.service --no-pager`
- `curl -sS http://127.0.0.1:3001/api/control/diagnostics`

The live diagnostics payload now includes `control_plane.findings[].remediation`, and the dashboard service is running cleanly after restart.

## Open Risks

- This change improves operator guidance, but it does not yet execute automated fixes.
- The remediation mapping currently covers the control-plane finding types seen in the live system. Unknown future finding types will still render without guidance until mapped.
- The dashboard repo still contains separate local-only API work in:
  - `src/app/api/agent/stats/route.ts`
  - `src/app/api/canonical/tasks/route.ts`

## Next Steps

1. Add remediation guidance for integrity and backup findings, not only control-plane findings.
2. Decide which dry-run actions are safe enough to expose as explicit dashboard-triggered operations.
3. Reconcile the remaining dirty dashboard API work into a separate task instead of leaving it as ambient local state.
