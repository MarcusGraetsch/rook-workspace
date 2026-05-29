# Archive Cleanup Apply Guardrails

- date: 2026-05-29 12:25 CEST
- scope: `operations/bin/plan-archive-task-cleanup.mjs`
- mode: implementation and isolated validation, no live archive files moved

## Lagebild

The archive cleanup planner previously produced a useful dry-run plan but had no safe execution path. The preceding cleanup review identified six runtime archive duplicates as later quarantine candidates and one workspace archive historical ID collision, `agent-0001`, that must not be moved automatically.

## Befunde

- A broad `--apply` would be too risky because planner actions mix normal runtime duplicates, filename mismatch review actions, and Git-backed workspace archive collisions.
- Runtime archive moves require backup evidence because they mutate live restore material under `/root/.openclaw/runtime/operations/archive/tasks/`.
- Every move needs its own machine-readable manifest so later operators can see the original path, target path, hash, reason, and backup preflight evidence.

## Umgesetzte Aenderungen

- Added guarded apply support to `operations/bin/plan-archive-task-cleanup.mjs`.
- Added `--apply` and `--allow-reviewed` flags.
- `--apply` now refuses to run unless paired with `--task-id <id>` or `--allow-reviewed`.
- Apply mode only supports `quarantine_archive_duplicate` actions from the mutable runtime archive root.
- Git-backed workspace archive records are refused with an explicit migration-note message.
- Apply mode checks for a fresh local runtime backup under `/root/backups/rook-runtime/` before moving anything.
- Every successful move writes a sidecar `.manifest.json` containing original path, target path, task id, project id, SHA-256, reason, review timestamp, move timestamp, and backup preflight details.
- Documented the guarded apply semantics in `operations/README.md` and `docs/RUNTIME-OPERATIONS.md`.

## Validierung

- `node --check operations/bin/plan-archive-task-cleanup.mjs`: passed.
- Dry-run on the live workspace still reports 8 actions and moves nothing.
- `--apply` without selector fails with `Refusing --apply without --task-id or --allow-reviewed.`
- Isolated `/tmp` runtime-archive apply test moved a duplicate into `task-collisions/` and wrote its manifest.
- Isolated `/tmp` workspace-archive apply test refused the `agent-0001`-style collision and left the source file in place.

## Offene Risiken

- The live archive files have not been moved yet.
- `agent-0001` still needs a separate historical-collision manifest or migration procedure.
- Running `--allow-reviewed --apply` on the live runtime will also encounter the `ops-0036` filename mismatch review action, which is intentionally skipped because rename review is not supported by apply mode.

## Naechste Schritte

1. Run `check-runtime-backup-integrity.mjs` immediately before any live apply.
2. Apply reviewed runtime duplicate quarantine one task at a time with `--task-id <id> --apply`.
3. Re-run canonical integrity, cleanup planner, and dashboard diagnostics after each batch.
4. Design a dedicated historical-collision manifest for `agent-0001`.
