# Pipeline contract

## Stages

```text
Preflight
→ Explore
→ Plan
→ Implement
→ Merge
→ Review
→ Fix loop, maximum two rounds
→ Final verification
→ Optional commit, push or PR only when requested
```

## Stage barriers

A later stage may begin only when all required evidence from the previous stage exists.

- Plan needs all exploration briefs.
- Implement needs a complete package plan.
- Merge needs every required package branch or an explicit failed-package decision.
- Review needs the merged integration state.
- Completion needs real checks and no unresolved blocker.

## Package rules

A package must contain:

- title;
- outcome;
- constraints;
- exact file ownership;
- worktree and branch;
- one check command;
- expected result;
- required report path.

Parallel packages must have disjoint write sets. Shared files force serialization or a dedicated integration package.

## Artifact rule

A reported path is a claim, not evidence.

Before another agent depends on an artifact:

```bash
test -s /path/to/artifact
```

If it is missing:

1. repeat the producing stage once with an explicit write requirement;
2. verify again;
3. abort the dependent fan-out if still missing.

## Review lenses

Default review lenses:

1. plan conformance;
2. correctness and edge cases;
3. regressions and real test output.

Optional lenses:

- security;
- operations;
- maintainability;
- documentation;
- governance.

A reviewer must actively search for defects. An empty finding list must be earned.

## Severity

- `blocker` — completion condition not met, data loss/security risk, broken build or invalid architecture.
- `major` — important defect that should be fixed before merge.
- `minor` — useful improvement that does not justify endless polish.

Only blocker and selected major findings enter the fix loop. Maximum two rounds unless the user explicitly changes the limit.
