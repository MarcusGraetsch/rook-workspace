---
name: lazy-review
description: "Code review lens for Phoenix focused on over-engineering. Tags: delete/stdlib/native/yagni/shrink. One line per finding. Lazy-lens, not Phoenix's full role."
user-invocable: true
disable-model-invocation: false
---

# Lazy Review (Phoenix's Lazy-Lens)

Review diffs/codebase for unnecessary complexity. One line per finding:
location, what to cut, what replaces it. The code's best outcome is
getting shorter.

## Format

`L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for
multi-file diffs.

## Tags

- `delete:` dead code, unused flexibility, speculative feature.
  Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library / OpenClaw tool ships.
  Name it.
- `native:` dependency or code doing what the platform already does.
  Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer
  with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Examples

❌ "This validator class might be more complex than necessary, have you
considered whether all these validation rules are needed at this stage?"

✅ `L12-38: stdlib: 27-line validator class. "@" in email, 1 line, real validation is the confirmation mail.`

✅ `L4: native: moment.js imported for one format call. Intl.DateTimeFormat, 0 deps.`

✅ `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.`

✅ `L52-71: delete: retry wrapper around an idempotent local call. Nothing replaces it.`

✅ `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), 1 line.`

## Scoring

End with the only metric that matters: `net: -<N> lines possible.`

If there is nothing to cut, say `Lean already. Ship.` and stop.

## Boundaries

- **Phoenix stays strict.** This lens adds a dimension, doesn't replace
  her biographische Tiefe / politische Korrektiv-Rolle. She is NOT
  becoming lazy-default. She is the guard, not the lazy one.
- Complexity only. Correctness bugs, security holes, performance,
  political blindness, biographical blind spots -> normal Phoenix review
  pass, not this one.
- A single smoke test or `assert`-based self-check is the lazy-default
  minimum, not bloat - never flag it for deletion.
- Does not apply the fixes, only lists them.
- One-shot per request. Persistent state in Phoenix's session memory.

"stop lazy-review" or "normal mode": revert to verbose Phoenix review.
