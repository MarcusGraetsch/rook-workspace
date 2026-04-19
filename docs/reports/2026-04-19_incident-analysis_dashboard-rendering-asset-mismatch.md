# Dashboard Rendering Asset Mismatch

Date: 2026-04-19T09:59:28+02:00
Scope: diagnose why the running rook-dashboard served content but appeared unstyled or layout-broken via the live URL

## Lagebild

The dashboard service was running and returned HTML content on `http://127.0.0.1:3001`, but the rendered layout was inconsistent.

Observed behavior:

- the homepage `/` returned HTML successfully
- HTML referenced a CSS asset under `/_next/static/css/...`
- the referenced CSS asset was not served correctly
- the browser-visible effect would be: content present, layout/styling broken or absent

## Findings

1. The running server was serving inconsistent asset references.

Initially observed:

- `/` referenced `/_next/static/css/1df43e5b678b4e2a.css`
- that asset returned `400 Bad Request`

At the same time, the current `.next` output on disk only contained:

- `/_next/static/css/1d10f6e4b1daa8e8.css`

2. Static asset serving from the running process was broken.

Even requests for the current on-disk CSS asset initially returned a Next 404 HTML page instead of CSS.

3. The dashboard build output was in an inconsistent state.

Indicators:

- `.next/BUILD_ID` was missing
- `next build` had previously exited after type/lint phase
- the running service had been started earlier and then the `.next` directory was modified later by manual build attempts

This created a split-brain state between:

- the in-memory `next start` process
- the current `.next` artifacts on disk

4. The immediate build blocker was a TypeScript mismatch in the local dashboard worktree.

Concrete error:

- `src/app/api/agent/stats/route.ts`
- `Property 'status' does not exist on type 'BlockedTask'`

Root cause:

- `src/lib/control/health.ts` defined `BlockedTask` without a `status` field
- `src/app/api/agent/stats/route.ts` expected `snapshot.blocked_tasks[].status`

## Actions Taken

1. Added `status: string` to the `BlockedTask` type in `src/lib/control/health.ts`
2. Included `status: t.status` when building blocked task snapshots
3. Re-ran `npm run build` successfully
4. Restarted `rook-dashboard.service`
5. Re-verified the live URL and CSS asset delivery

## Validation

Build validation:

- `npm run build` in `engineering/rook-dashboard`
- result: success

Runtime validation after restart:

- `systemctl --user status rook-dashboard.service`
- `curl http://127.0.0.1:3001/`
- `curl http://127.0.0.1:3001/_next/static/css/1d10f6e4b1daa8e8.css`

Verified post-fix state:

- homepage `/` now references `/_next/static/css/1d10f6e4b1daa8e8.css`
- CSS asset returns `200 OK`
- CSS is served with `Content-Type: text/css`

## Open Risks

- the dashboard repo still contains additional uncommitted local work:
  - `src/app/api/agent/stats/route.ts`
  - `src/app/api/canonical/tasks/route.ts`
- `dashboard-0049.json` in the workspace repo is still inconsistent with the durable dashboard git history

## Next Steps

1. Reconcile `dashboard-0049` against actual dashboard commits
2. Decide whether the current local API work in `agent/stats` and `api/canonical/tasks` should become a named task and a clean commit
3. Consider hardening `start-dashboard.sh` so stale or partial `.next` states are detected instead of reused silently
