# Session Review: Task Registry Source of Truth

**Date:** 2026-06-01  
**Scope:** Resolve the remaining `tasks/registry` ambiguity by checking the live OpenClaw task stores and tightening backup/restore coverage.

## Lagebild

The remaining roadmap item was the persistent `tasks/registry` restore warning. The live runtime state now shows two separate SQLite-backed stores:

- task registry: `~/.openclaw/tasks/runs.sqlite`
- flow registry: `~/.openclaw/flows/registry.sqlite`

Both stores are present and healthy on disk. Runtime inspection showed the task-registry restore failure is currently `null`, and the flow-registry restore failure is also `null`.

## Befunde

- The original warning path is not currently reproducible on the live VM.
- The task registry and flow registry are separate stores, not a single mixed source of truth.
- The runtime had no explicit backup/restore coverage documented for the flow registry, even though it is part of the live state model.
- The control-plane check did not previously verify the flow registry integrity directly.

## Arbeitsplan

1. Verify the live registry state and restore-failure values.
2. Add flow-registry coverage to backup and restore scripts.
3. Add a direct integrity check for the flow registry to the control-plane checker.
4. Update the operational docs and roadmap to reflect the clarified state model.

## Umgesetzte Änderungen

- Updated `operations/bin/backup-runtime-to-drive.sh`
  - archives `/root/.openclaw/flows/registry.sqlite` as part of the runtime backup snapshot
- Updated `operations/bin/restore-runtime-backup.sh`
  - restores the flow registry alongside the other runtime state
- Updated `operations/bin/check-runtime-control-plane.mjs`
  - adds a flow-registry SQLite integrity check
- Updated `docs/DISASTER-RECOVERY.md`
  - documents the flow registry as part of the runtime backup surface
- Updated `docs/RUNTIME-OPERATIONS.md`
  - documents the flow registry in the runtime snapshot list
- Updated `docs/plans/2026-06-01_openclaw-principal-operator-roadmap.md`
  - scratched out the `tasks/registry` source-of-truth items

## Validierung

- `sqlite3 /root/.openclaw/tasks/runs.sqlite 'pragma integrity_check;'` returned `ok`
- `sqlite3 /root/.openclaw/flows/registry.sqlite 'pragma integrity_check;'` returned `ok`
- `node --input-type=module` checks against the installed OpenClaw package returned:
  - task registry restore failure: `null`
  - flow registry restore failure: `null`
- `node /root/.openclaw/workspace/operations/bin/check-runtime-control-plane.mjs` now reports `flow_registry_ok`

## Nächste Schritte

1. Continue with the remaining Phase 1 audit of `/root/.openclaw/openclaw.json` for insecure defaults and ambiguous routing rules.
2. Keep the backup/restore flow aligned with any future state layout changes.
3. Re-run the control-plane check after any OpenClaw package upgrade to catch registry drift early.
