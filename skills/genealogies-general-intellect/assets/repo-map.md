# Repo Quick-Map — Genealogies of the General Intellect

Source of truth: `/root/.openclaw/genealogies-general-intellect/` (private GitHub mirror `MarcusGraetsch/genealogies-general-intellect`, default branch `master`).

## Top-level

- `AGENTS.md` — repo-level rules for evidence, status tags, validator gate, no fabrication.
- `README.md` — public-style overview.
- `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- `pyproject.toml`, `.gitignore`, `.github/`.
- `CHANGELOG.md`, `AGENT_CHANGELOG.md` — change history (read for context).

## docs/ (governance + methods)

- `project-charter.md` — purpose, success criteria for v0.1.
- `project-scope.md` — what's in, what's out (real-estate/property = Separate Project).
- `research-methodology.md` — 13-step standard workflow + work modes.
- `source-criticism.md` — minimum fields + media-research hierarchy.
- `theoretical-framework.md` — Hegel/Marx/etc. with discipline rules.
- `research-control.md`, `ethical-and-ecological-questions.md`.
- `media-archaeology-method.md`, `historical-reconstruction.md`.
- `glossary.md`, `architecture.md`.

## research/ (the three fields)

- `music-genealogies/README.md`, `research-questions.md`, `selection-criteria.md`.
- `literature-canon/README.md`, `research-questions.md`, `selection-criteria.md`.
- `media-worlds/README.md`, `research-questions.md`, `working-notes/pilot-study.md`.
- `future-modules/` — `fragmented-consciousness.md`, `ai-and-data-centers.md`,
  `digital-memory.md`, `adult-education.md`.

## agents/

- `roles/` — 13 role definitions (one .md per role).
- `workflows/` — `research-workflow.md` (Mermaid), `media-reconstruction.md`.
- `handoffs/codex-to-researcher-hermes-2026-07-19.md` — **current pilot (WP-05/06)**.
- `handoffs/handoff-template.md` — template for new handoffs.

## backlog/ (kanban / Now-Next-Later-Archive + meta)

- `now.md`, `next.md`, `later.md`, `archive.md`.
- `roadmap.md` — **four-iteration plan** (Fundament → Ein begrenzter Medienfall → Vergleich und Vermittlung → Kuratierung und Wirkung).
- `issues.md` — open problems.

## data/

- `curated/` — claims, sources, relations (only with status + provenance + uncertainty).
- `sources/`, `entities/`, `relations/` — sub-folders per data-model layer.

## templates/

- `agent-run-log.md` — required protocol: Auftrag, Eingaben, Schritte, Dateien, Quellen, Unsicherheiten, Fehler, offene Fragen, nächste Schritte.
- `handoff-template.md` (under agents/handoffs/).
- other document + data templates as listed in `backlog/issues.md`.

## scripts/

- `scripts/validate/validate_data.py` — **quality gate**: validates YAML/JSON before commit.

## tests/

- `tests/test_validator.py` — validator unit tests; `tests/README.md` explains.
