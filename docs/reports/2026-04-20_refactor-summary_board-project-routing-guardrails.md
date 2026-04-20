# Refactor Summary: Board Project Routing Guardrails

- Date: 2026-04-20
- Scope: board-to-project inference and project-to-board projection in dashboard task sync

## Findings

- `task-sync.ts` previously mixed three different routing mechanisms:
  - fuzzy board-name to project inference
  - ad-hoc hardcoded target-board projection
  - dashboard-only special casing inside `normalizeProjectForTask`
- That made routing behavior harder to reason about and more upgrade-sensitive than necessary.
- The live board set is currently stable and small:
  - `Consulting`
  - `Digital Capitalism Research`
  - `Rook System`
  - `WorkingNotes`

## Actions Taken

- Added shared routing rules in `src/lib/control/board-project-routing.ts`.
- Moved explicit board defaults into one place:
  - `Rook System -> rook-workspace`
  - `Consulting -> rook-workspace`
  - `Digital Capitalism Research -> digital-research`
  - `WorkingNotes -> working-notes`
- Moved project-to-board projection into the same shared routing helper.
- Replaced the previous inline `inferProject()` logic in `task-sync.ts` with the shared resolver.

## Validation

- `npx tsc --noEmit` in `engineering/rook-dashboard`
  - succeeded
- reviewed focused diff for:
  - `src/lib/control/board-project-routing.ts`
  - `src/lib/control/task-sync.ts`
- read current live board names from `data/kanban.db`

## Open Risks

- `normalizeProjectForTask()` still contains the separate dashboard-content heuristic for classifying some `rook-workspace` tasks as `rook-dashboard`; that rule is intentional for now, but remains a policy layer on top of board defaults.
- If additional boards are introduced later, they should be added explicitly to the shared routing map rather than relying on fuzzy fallback.

## Next Steps

1. Decide whether the dashboard-content heuristic should eventually become explicit metadata instead of text/label inference.
2. If new boards are added, extend the routing map and avoid reintroducing broad fuzzy matching as the primary contract.
