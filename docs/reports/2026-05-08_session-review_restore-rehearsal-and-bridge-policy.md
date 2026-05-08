# Session Review: Restore Rehearsal and Bridge Review Policy

Date: 2026-05-08
Scope: `rook-workspace` operational tooling for Hermes DR and Rook/Hermes bridge governance

## Lagebild

The workspace already had baseline Hermes backup and restore helpers plus a schema validator for structured bridge payloads.

Two operational gaps remained:

- restore validation still depended on ad hoc synthetic checks rather than a reusable rehearsal path
- bridge payload review expectations were only partially embedded in the integration contract

## Befunde

1. `backup-hermes-runtime.sh` still archived bridge directories from a fixed `/root` path, which made safe disposable rehearsals harder than necessary.
2. `restore-hermes-runtime.sh` still restored bridge directories into a fixed `/root` path, which prevented a full rehearsal into an isolated target root.
3. Bridge review expectations needed their own operator-facing policy artifact so review is auditable and not implicit.

## Arbeitsplan

1. make backup and restore helpers parameterizable enough for disposable rehearsals
2. add a single end-to-end rehearsal helper for synthetic Hermes backup and restore
3. formalize bridge review policy linkage in the contract and docs
4. validate the new helper path with a real rehearsal run

## Umgesetzte Änderungen

- updated `operations/bin/backup-hermes-runtime.sh`
- updated `operations/bin/restore-hermes-runtime.sh`
- added `operations/bin/rehearse-hermes-restore.sh`
- updated `docs/HERMES-DISASTER-RECOVERY.md`
- updated `docs/ROOK-HERMES-INTEGRATION-CONTRACT.md`
- added `docs/BRIDGE-REVIEW-POLICY.md`

## Validierung

Checked:

- `bash -n` for the updated shell helpers
- disposable end-to-end execution of `operations/bin/rehearse-hermes-restore.sh`
- resulting snapshot validation via `check-hermes-restore-snapshot.sh`
- bridge review wrapper against the example payload

Not checked:

- restore against a real production Hermes snapshot
- hard enforcement of bridge review in an automated runtime path

## Open Risks

- bridge review remains policy-driven rather than hard-enforced
- sensitive auth restore is still intentionally separated from the default rehearsal path
- no scheduled rehearsal cadence exists yet

## Nächste Schritte

1. decide whether bridge review should become mandatory before archival
2. add review metadata fields once the payload schema is ready to carry them
3. run a supervised rehearsal against a scrubbed real-world snapshot if available
