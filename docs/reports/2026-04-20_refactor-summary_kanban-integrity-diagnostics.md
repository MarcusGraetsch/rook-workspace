# Refactor Summary: Kanban Integrity Diagnostics

- Date: 2026-04-20
- Scope: dashboard Kanban integrity diagnostics and agent API workflow enforcement

## Findings

- The canonical workflow-column guardrails were already added for `/api/kanban/columns`, but the token-efficient agent endpoint still exposed a second mutation path for ad-hoc column creation and deletion.
- The control diagnostics endpoint did not yet surface dashboard-DB drift in the Kanban projection layer.
- The live dashboard database currently appears clean:
  - `board_count: 4`
  - `column_count: 32`
  - `active_task_count: 36`
  - `warning_count: 0`

## Actions Taken

- Reused the shared workflow schema inside `/api/kanban/agent`.
- Blocked non-workflow column creation via the agent API.
- Blocked deletion of canonical workflow columns via the agent API.
- Added `kanban_integrity` to `/api/control/diagnostics`.
- Added findings/remediation coverage for:
  - non-workflow columns
  - missing workflow columns
  - duplicate workflow columns
  - tasks without canonical linkage
  - tasks pointing to missing canonical records

## Validation

- `npx tsc --noEmit` in `engineering/rook-dashboard`
  - succeeded
- direct read-only probe of `engineering/rook-dashboard/data/kanban.db`
  - returned `warning_count: 0`
- reviewed focused diff for:
  - `src/app/api/kanban/agent/route.ts`
  - `src/app/api/control/diagnostics/route.ts`
  - `src/lib/control/kanban-integrity.ts`

## Open Risks

- `next build` still exits non-zero after the type/lint phase without surfacing a useful terminal error in this shell context; the failure does not currently point at these changes, but the build command is not yet a reliable release gate here.
- The new integrity diagnostics are route-local; if they should become part of the operations CLI toolchain later, they should be mirrored by a dedicated script under `operations/bin/`.

## Next Steps

1. Decide whether Kanban integrity should remain dashboard-local or become part of the repo-level control-plane checks.
2. If desired, add a small operator action for automatic repair of missing workflow columns on affected boards.
