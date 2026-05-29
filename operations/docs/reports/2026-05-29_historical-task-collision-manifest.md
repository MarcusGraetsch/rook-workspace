# Historical Task Collision Manifest

- date: 2026-05-29 13:10 CEST
- scope: `agent-0001` Git-backed workspace archive collision
- mode: manifest and checker integration

## Lagebild

After runtime archive duplicate quarantine, only `agent-0001` remained in archive cleanup diagnostics. The active task and Git-backed archived task share `task_id=agent-0001` but represent different historical work.

## Befunde

- Active `agent-0001`: Rook Agent health snapshot work in `MarcusGraetsch/rook-agent`.
- Archived `agent-0001`: Ecology Dashboard work in `MarcusGraetsch/rook-dashboard`.
- Moving or renaming the archived task would destroy useful historical evidence unless a broader migration is designed.
- Suppressing this case by task id alone would be unsafe; the suppression must be tied to exact paths and content hashes.

## Umgesetzte Aenderungen

- Added `operations/archive/task-collisions/agent-0001.historical-collision.json`.
- Updated `operations/bin/plan-archive-task-cleanup.mjs` to load accepted historical collision manifests.
- Updated `operations/bin/check-canonical-task-integrity.mjs` to apply the same manifest-aware suppression.
- Updated `operations/README.md` and `docs/RUNTIME-OPERATIONS.md`.

## Validierung

- `node --check operations/bin/plan-archive-task-cleanup.mjs`: passed.
- `node --check operations/bin/check-canonical-task-integrity.mjs`: passed.
- `node operations/bin/plan-archive-task-cleanup.mjs`: `action_count=0`, `approved_historical_collision_count=1`.
- `node operations/bin/check-canonical-task-integrity.mjs`: `ok=true`, no duplicate warnings, no archive mismatches.
- Isolated negative test with deliberately wrong manifest hashes kept the cleanup action visible.
- Dashboard diagnostics: `status=ok`, `integrity_warnings=0`, `archive_cleanup_actions=0`, `kanban_integrity_ok=true`.

## Offene Risiken

- Control-plane warnings remain at 28 and are unrelated to archive cleanup.
- The provider probe remains unavailable in dashboard diagnostics because `KIMI_API_KEY` is not loaded there.

## Naechste Schritte

1. Treat future historical collisions the same way: review first, preserve both records only with hash-pinned manifests.
2. Move to the next operational warning class, likely user systemd drift or provider probe environment loading.
