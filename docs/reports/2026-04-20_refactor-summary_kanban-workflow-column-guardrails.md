# Refactor Summary: Kanban Workflow Column Guardrails

- Date: 2026-04-20
- Scope: `engineering/rook-dashboard` Kanban column mutation API and workflow schema consistency

## Findings

- The canonical task state and dashboard projection both assume a fixed workflow column model:
  `Backlog -> Intake -> Ready -> In Progress -> Testing -> Review -> Blocked -> Done`.
- `task-sync.ts` and board reconciliation map task status back to columns by workflow column name.
- Despite that contract, `/api/kanban/columns` still allowed arbitrary column creation, renaming, reordering, and deletion.
- That meant the dashboard could silently diverge from the canonical task model and make board state less trustworthy as an operational control plane.

## Actions Taken

- Added a shared workflow helper at `src/lib/control/kanban-workflow.ts`.
- Moved canonical workflow column definitions out of the boards route into that shared helper.
- Hardened `/api/kanban/columns`:
  - reject non-workflow custom columns
  - make workflow-column creation idempotent
  - block renaming canonical workflow columns
  - block manual reordering of canonical workflow columns
  - block deletion of canonical workflow columns

## Validation

- `npm run build` in `engineering/rook-dashboard`
  - succeeded
- `next lint` was not usable as a validation gate because the repository still lacks an ESLint configuration and the command entered interactive setup
- reviewed focused diff for:
  - `src/lib/control/kanban-workflow.ts`
  - `src/app/api/kanban/boards/route.ts`
  - `src/app/api/kanban/columns/route.ts`

## Open Risks

- Existing SQLite data could still contain legacy non-workflow columns from earlier phases; this change prevents new drift but does not migrate old unexpected rows.
- The schema still stores columns as generic records without an explicit `kind` or `is_system` flag, so workflow protection is name-based rather than schema-native.

## Next Steps

1. Add a small diagnostics check that flags legacy non-workflow columns in the dashboard database.
2. Consider a future schema marker for system workflow columns if column customisation ever needs to return in a controlled form.
