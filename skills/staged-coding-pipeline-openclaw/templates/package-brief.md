# Work package

## Identity

- Package:
- Worktree:
- Branch:
- Base SHA:
- Report path outside the Git worktree:

## Outcome

## Files owned

Only these paths may be modified:

```text
```

## Constraints

- Every changed line must trace to this package.
- No neighboring refactor.
- No push, deploy, reset, force, delete or production write.
- Do not edit files owned by another package.
- When sufficient evidence exists, act rather than overplanning.

## Required check

```bash
```

## Required return

```text
status: completed | blocked | failed
branch:
head:
files_changed:
check_command:
check_exit_code:
check_output_path:
report_path:
deliberately_untouched:
risks:
```

Write the report to the assigned path. The path must exist and be non-empty before returning.
