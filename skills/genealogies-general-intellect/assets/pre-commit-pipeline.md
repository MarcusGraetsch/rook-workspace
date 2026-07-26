# Pre-Commit-Pipeline — Genealogies of the General Intellect

Replaces the older per-commit "explicit instruction" gate with an automated review pipeline. Model: CI/CD + Scrum/Kanban. Owner of this file: `documentation-maintainer`. Source of truth: the project's skill body (Git & Safety + Pre-Commit-Pipeline sections).

## Why this exists

Explicit per-commit approvals slow down a continuous research project and add no semantic value the moment the same checks run automatically. The pipeline encodes the same intent (don't commit nonsense) as code, so the project can move at research pace while staying honest.

## The six gates

### Gate 1 — Lint + Schema-Validator (hard-stop)

- **Owner:** `documentation-maintainer` (or static Python in `.git/hooks/pre-commit` + `scripts/validate/validate_data.py`).
- **Trigger:** every commit touching YAML/JSON/markdown with internal links.
- **Pass criteria:**
  - All changed YAML/JSON files validate against their JSON Schema / Pydantic model.
  - All internal `[text](path)` links resolve to existing files at this revision.
  - New entities carry stable local IDs.
- **Hard-stop on fail:** broken JSON, missing ID, dangling link.
- **Auto-fix allowed:** ID reformat, link rename.

### Gate 2 — Source-Critic (hard-stop)

- **Owner:** `source-critic` agent (or a deterministic check on `data/curated/claims/*.yaml`).
- **Trigger:** every commit that touches `data/curated/claims/`, `data/curated/sources/`, or `data/curated/relations/`.
- **Pass criteria:**
  - Every claim row has a `status` ∈ {`documented`, `interpreted`, `hypothesis`, `reconstructed`, `remembered`, `speculative`, `open`}.
  - Every `relation` row has a non-empty `provenance` field.
  - Every `source` row carries the minimum fields from `docs/source-criticism.md` (Quelle, Typ, Autor/Institution, Entstehungszeit, behandelte Zeit, Ort, Zielgruppe, Zugangsweg, Perspektive, mögliche Interessen, Vollständigkeit, Lizenzstatus, Abrufdatum, Grenzen).
- **Hard-stop on fail:** claim without status, relation without provenance.

### Gate 3 — Skeptical-Reviewer (yellow)

- **Owner:** `skeptical-reviewer` agent.
- **Trigger:** every commit that adds or modifies a row with `status = reconstructed` in `data/curated/`.
- **Pass criteria:**
  - Every reconstructed row carries an explicit `uncertainty` field with at least one qualifier (e.g. `low / medium / high` + free-text reason).
  - Interpretation is not mixed into the same row as reconstruction.
- **Yellow on fail:** commit is allowed, but `AGENT_CHANGELOG.md` entry must carry `"human-review-recommended": true` and link to the offending row.

### Gate 4 — Kanban-Guard (hard-stop)

- **Owner:** `research-coordinator` (or a script that diffs `backlog/now.md`, `backlog/issues.md`).
- **Trigger:** every commit.
- **Pass criteria:**
  - Diff does not close a ticket that's already in `backlog/archive.md`.
  - Diff does not re-open a ticket whose status is `done` in `backlog/issues.md` without a documented reason.
  - New files referenced from the diff appear somewhere in `backlog/now.md` or the diff comment mentions the relevant ticket.
- **Hard-stop on fail:** no commit.

### Gate 5 — Changelog-Checker (yellow)

- **Owner:** `documentation-maintainer`.
- **Trigger:** every commit.
- **Pass criteria:**
  - `AGENT_CHANGELOG.md` (or `CHANGELOG.md` if a human-facing release) has a new entry pointing at this commit's intent + files.
- **Yellow on fail:** commit is allowed, but the `AGENT_CHANGELOG.md` entry must be added in the same commit (auto-append allowed via `git commit --amend`).

### Gate 6 — Synthesis-Stop (pre-publication only)

- **Owner:** `synthesis-editor` + `skeptical-reviewer`.
- **Trigger:** before any **synthesis publication** (public working-notes, blogpost, public release, exported PDF).
- **Pass criteria:** gates 2 + 3 both green for the synthesis artefact; Marcus's explicit approval for public surfaces.
- **Hard-stop on fail:** no publication; queue as draft.

## Pipeline outcome logic

```
all gates 1..5 green              -> auto-commit + push OK
gate 1 or 2 red                   -> STOP, no commit
gate 3 or 4 or 5 yellow           -> commit OK, mark human-review
gate 6 fail (synthesis only)      -> no publication, draft only
```

## Implementation (when the skill is applied)

1. **Git hook layer.** Add `scripts/pre-commit` that runs gates 1, 4, 5 deterministically (Python + shell). Gates 2 and 3 require agent judgement or live LLM calls — those are wrapped as labelled advisories.
2. **Advisory layer.** A `scripts/pre-commit-advisory.py` runs the agent-side checks (gates 2, 3) and emits `[advisory] gate X yellow at file:line` messages. Commit succeeds when advisories are acknowledged.
3. **Synthesis layer.** A separate `scripts/pre-synthesis-check.py` runs gate 6 fully and refuses to allow the artefact to leave the private repo.
4. **Override protocol.** `git commit --no-verify` is reserved for emergencies. The override commit must include an explicit `AGENT_CHANGELOG.md` entry with `"override": { "reason": "...", "by": "..." }`.
5. **Audit trail.** Every pipeline run appends a line to `logs/pre-commit.log` with timestamp + gate results + commit hash.

## Error catalogue (initial)

| Error | Gate | Action |
|-------|------|--------|
| `INVALID_YAML` | 1 | hard-stop, parse-error report |
| `MISSING_ID` | 1 | hard-stop, file:line |
| `BROKEN_INTERNAL_LINK` | 1 | hard-stop, link target |
| `CLAIM_NO_STATUS` | 2 | hard-stop, row ref |
| `RELATION_NO_PROVENANCE` | 2 | hard-stop, row ref |
| `RECONSTRUCTION_NO_UNCERTAINTY` | 3 | yellow, row ref |
| `KANBAN_DRIFT` | 4 | hard-stop, ticket ref |
| `CHANGELOG_MISSING` | 5 | yellow, auto-append allowed |
| `SYNTHESIS_GATES_NOT_GREEN` | 6 | hard-stop (publication only) |

## Initial rollout (post-skill-application)

1. Implement gate 1, 4, 5 as a deterministic `scripts/pre-commit` hook (one PR).
2. Implement gate 2, 3 as advisory wrappers (separate PR; agent-side).
3. Implement gate 6 as `scripts/pre-synthesis-check.py` (separate PR).
4. Update `backlog/issues.md` to point at this pipeline as the active commit-gate.
5. After ~10 successful runs across all six gates, retire the older "explicit instruction" rule entirely (already done in the skill body).
