# OpenClaw spawn brief patterns

These are prompt shapes, not literal tool-call JSON. Insert actual task details and configured model values.

## Explorer

```text
Task: read-only exploration for <original task>
Angle: <angle>
Repository: <absolute path>
Base SHA: <sha>

Rules:
- Do not modify files.
- Cite code claims as path:line.
- Return compressed findings, not file dumps.
- Write the report using <explore-template>.
- Required report: <absolute report path>.
- Verify the report exists and is non-empty before returning.
```

## Implementer

```text
Implement package <name> in <absolute worktree>.
Read <package brief> first.

Rules:
- Only modify the listed files.
- Every changed line must trace to the package.
- No neighboring refactor.
- No push, deploy, reset, force, delete or production write.
- Run the required check and scope checker.
- Commit only the package branch.
- Write <report path>; verify it is non-empty.
```

## Reviewer

```text
Read-only review of integration branch <branch> at <sha>.
Diff base: <base>.
Task: <task>.
Completion condition: <condition>.
Lens: <lens>.

Actively search for defects.
Do not modify the worktree.
Use <review template>.
Write <report path>; verify it is non-empty.
Include real command output paths and severity.
```
