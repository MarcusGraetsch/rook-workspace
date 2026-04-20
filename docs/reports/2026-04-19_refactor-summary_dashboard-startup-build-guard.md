# Dashboard Startup Build Guard

Date: 2026-04-19
Scope: `operations/bin/start-dashboard.sh`, runtime startup behavior for the live dashboard service

## Findings

- The dashboard startup path previously rebuilt only when `.next/BUILD_ID` was missing.
- That was too weak for the live runtime: the recent layout incident showed that `.next/` could be partially broken while still looking "present enough" to skip a rebuild.
- The practical failure mode was inconsistent asset serving:
  - HTML referenced stale CSS asset paths
  - the running process served missing or invalid CSS responses
  - the service stayed up, but the UI lost its layout

## Actions Taken

- Added a structural build-integrity check to `operations/bin/start-dashboard.sh`.
- The startup script now requires these artifacts before it will reuse `.next/`:
  - `.next/BUILD_ID`
  - `.next/build-manifest.json`
  - `.next/required-server-files.json`
  - `.next/routes-manifest.json`
  - `.next/prerender-manifest.json`
  - `.next/server/app-paths-manifest.json`
  - at least one built CSS file under `.next/static/css/`
- If the build is incomplete, the script now moves the current `.next/` tree into:
  - `engineering/rook-dashboard/.next-invalid/next-<timestamp>`
- After quarantining the invalid build, the script runs `npm run build` and then starts the dashboard normally.

## Validation

- Reviewed the current `.next/` layout after a healthy dashboard build to anchor the required artifact set.
- Re-ran `npm run build` in `engineering/rook-dashboard`.
- Restarted `rook-dashboard.service`.
- Verified the service remains active after startup.
- Verified `/` still returns HTML and the referenced CSS asset is served as `200 OK` with `Content-Type: text/css`.

## Open Risks

- This guard detects incomplete local build output, but it does not detect every possible semantic mismatch between source files and a stale but structurally complete `.next/` tree.
- The dashboard repo still has uncommitted local API work in:
  - `src/app/api/agent/stats/route.ts`
  - `src/app/api/canonical/tasks/route.ts`
  Those changes should be reconciled separately.

## Next Steps

1. Decide whether startup should also enforce source-to-build freshness, not just build completeness.
2. Reconcile the remaining dirty dashboard API work into a real task or revert it intentionally.
3. Consider extending the watchdog to probe one CSS asset path as well as an HTML route if layout integrity needs a stronger runtime signal.
