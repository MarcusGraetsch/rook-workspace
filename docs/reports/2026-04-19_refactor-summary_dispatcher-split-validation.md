# Dispatcher Split Validation

Date: 2026-04-19
Scope: validate the in-progress modular split of `operations/bin/task-dispatcher.mjs` and identify whether `ops-0045` is truly in a committable state

## Lagebild

The dispatcher refactor branch reduces `operations/bin/task-dispatcher.mjs` to a thin wrapper and moves the old monolith into `operations/bin/dispatcher/`.

The refactor is structurally real:

- `task-dispatcher.mjs` now imports `./dispatcher/index.mjs`
- orchestration is spread across:
  - `claims.mjs`
  - `dispatch.mjs`
  - `github.mjs`
  - `loader.mjs`
  - `notify.mjs`
  - `validation.mjs`
  - `index.mjs`

However, the new module tree is still untracked in git and therefore not yet durable.

## Findings

1. A real import/export break existed in the split.

`dispatch.mjs` imports `summarizeTask` from `validation.mjs`, but `validation.mjs` did not export it directly.

Observed failure:

- `node operations/bin/task-dispatcher.mjs --dry-run --limit 3`
- error: `The requested module './validation.mjs' does not provide an export named 'summarizeTask'`

2. A more serious runtime bug also existed: double dispatcher execution.

`index.mjs` called `main()` at module load time.
The thin wrapper `task-dispatcher.mjs` then imported `index.mjs` and called `main()` again.

That means the production entrypoint could execute the dispatcher loop twice per invocation.

3. The thin wrapper also regressed fatal-error logging behavior.

After removing implicit autorun from `index.mjs`, the wrapper would only print fatal errors to stderr unless logging was restored explicitly.

4. Validation is improved but still incomplete.

The split is now syntactically consistent and dry-run capable, but it has not yet been validated against a real dispatchable task in the current task set.

## Actions Taken

1. Exported `summarizeTask()` directly from `operations/bin/dispatcher/validation.mjs`
2. Changed `operations/bin/dispatcher/index.mjs` so it only auto-runs when invoked directly
3. Restored fatal dispatcher log writing in `operations/bin/task-dispatcher.mjs`

## Validation Performed

- `node --check` on all dispatcher modules
- `node operations/bin/task-dispatcher.mjs --dry-run --limit 1`
- `node operations/bin/dispatcher/index.mjs --dry-run --limit 1`

Results:

- all module syntax checks pass
- wrapper dry-run exits 0
- direct `index.mjs` dry-run exits 0

Additional observation:

- no currently dispatchable canonical task was found quickly in the live task set during this validation pass, so no real candidate task was used for a dry-run target check

## Open Risks

- the dispatcher module tree is still untracked and therefore not yet durably integrated
- `ops-0045` is still marked `done` before the refactor has been fully committed and reviewed
- current validation covers syntax and entrypoint behavior, not full live dispatch semantics

## Next Steps

1. Stage the dispatcher module tree only after one more behavioral validation pass
2. Reconcile `ops-0045` task metadata with the actual git state
3. If no suitable live task exists, use a conservative fixture or controlled temporary task to validate one dispatch path without affecting production state
