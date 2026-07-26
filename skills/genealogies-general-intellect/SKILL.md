---
name: "genealogies-general-intellect"
description: "Routes OpenClaw/Hermes work into the private genealogies-general-intellect research repo's 13-role + 4-iteration skeleton. No fabrication."
---

# Genealogies of the General Intellect — Project Skill

## Purpose

Persistent project skill for the open-ended, private research project **"Genealogies of the General Intellect"** (`MarcusGraetsch/genealogies-general-intellect`).
Enables OpenClaw agents (`researcher`, `rook`, `engineer`) and Hermes to continue the project with consistent methodology, evidence rules, role boundaries, automated pre-commit review, and git-safety guarantees.

This skill references the existing repo (do **not** re-build files that already exist in the repo). Use this skill whenever a user request touches the project — explicit ("continue the Bremen/Berlin pilot", "extract Nurse with Wound evidence") or implicit (any genealogy/media-world/literature question that maps to this project's scope).

## Project Location

- **Local path:** `/root/.openclaw/genealogies-general-intellect/`
- **Remote:** `git@github.com:MarcusGraetsch/genealogies-general-intellect.git` (**private**, default branch `master`)
- **NOT** a submodule of any workspace project. **NOT** to be moved, renamed, or auto-pushed (push **does** happen automatically once the Pre-Commit-Pipeline is green — see below).
- Per the repo's `AGENTS.md`: this is a transparent research infrastructure, **not** an automatic canon- or Zeitgeist-generator. Small, source-bound, reproducible.

## Project Goal

How social knowledge, skill, consciousness, and cultural experience are **produced, objectified, mediated, appropriated, controlled, forgotten, and changed** — across three fields tied by a critical theoretical frame (Hegel, Marx, Critical Theory, Cultural Studies, media archaeology, feminist + postcolonial critique).

## Three Research Fields

1. **Music Genealogies & Counterculture** — incl. **Nurse with Wound List as historical/curatorial document** (never as canon). French prog/underground, Diedrichsen, *Spex*, scenes/labels/clubs/studios, gatekeepers, reissues, subculture → mass culture transitions, forgotten actors. Beziehungen distinguished as *Einfluss*, *Kooperation*, *Ähnlichkeit*, *Rezeption*, *zeitliche Nachfolge* and belegt.
2. **Literature as Experience & Knowledge Form** — personal-paths approach. Each curation must hold three layers apart: **orientation knowledge** (what is the work + why relevant), **reading decision** (why now), **primary experience** (what must be read or heard and may not be replaced by a summary). The KI must not "complete" literature through plot summaries.
3. **Film, Series, Radio, TV, Media Worlds** — concrete local historical reconstructions (first: Bremen + Berlin 1960–2026). Pilot frame: **August 7–20, 1961** (Berlin + Bremen). Topics: actual broadcast schedules, charts, DJs, newsrooms, cinema, video stores, press, ads, political live broadcasts, devices, family/school/café use, fan practices, tape/copy cultures, censorship, regional/class/gender/generational differences, contemporary reception, later memory.

## Theoretical Framework (with discipline)

Hegel, Marx (**General Intellect**), Critical Theory, Cultural Studies, media archaeology, knowledge history, philosophy of technology, feminist + postcolonial critique, KI/plattform power + ecological infrastructure, democratic knowledge appropriation + human autonomy. Theoretical terms are never decorative. Text evidence, empirical observation, interpretation, hypothesis, and speculation must remain labelled and separated. "Zeitgeist", "Volk", "die Menschen", "Einfluss" are not used without group, place, time, evidence.

## Three Work Modes

- **Explore** — up to five good leads, no completeness claim.
- **Deep Dive** — bounded question + bounded corpus + source cross-check.
- **Integrate** — update existing statements; preserve contradictions.

For every new idea: classify into `backlog/now.md` (current path), `backlog/next.md` (own future path), `backlog/later.md` (interesting, deferred), `backlog/archive.md`, `backlog/issues.md`, or **Separate Project** (e.g. real-estate/property topics are explicitly OUT of scope here per `docs/project-scope.md`).

## Standard Workflow (per `docs/research-methodology.md`, 13 steps)

1. Capture research question.
2. Limit place, time, group, scope.
3. Clarify terms; consult existing notes.
4. Build source landscape; separate primary vs secondary.
5. Run source criticism.
6. Extract entities and claims.
7. **Only create relationships with provenance.**
8. Distinguish availability / popularity / reach / actual reception.
9. Document interpretation separately from evidence.
10. Capture counter-arguments and uncertainties.
11. Synthesis with human review.
12. Version decisions; derive next question.
13. Verify that insight is worth the effort.

Repo-Mermaid (per `agents/workflows/research-workflow.md`):

`Frage begrenzen → Quellen suchen → Quellen kritisieren → Entitäten/Claims extrahieren → Beziehungen mit Provenienz → Interpretieren/rekonstruieren → Skeptisches Review → Menschliche Freigabe`.

Every agent run logs: **Auftrag, Eingaben, Schritte, erzeugte Dateien, Quellen, Unsicherheiten, Fehler, offene Fragen, nächste Schritte**.

## Roles (≥15 in `agents/roles/`)

`research-coordinator`, `source-scout`, `source-critic`, `genealogy-mapper`, `theoretical-interpreter`, `literature-curator`, `music-researcher`, `film-television-researcher`, `radio-broadcast-archaeologist`, `media-world-reconstructor`, `reception-researcher`, `synthesis-editor`, `skeptical-reviewer`, `life-impact-evaluator`, `documentation-maintainer`.

Each role has clear scope, input, output, hand-off points, and acceptance criteria.

When run under OpenClaw, map roles to agents:
- OpenClaw `researcher` agent covers: source-scout, source-critic, genealogy-mapper, music-researcher, film-television-researcher, radio-broadcast-archaeologist, media-world-reconstructor, reception-researcher, documentation-maintainer.
- **Human-approval-gated roles** (skeptical-reviewer, theoretical-interpreter, literature-curator, life-impact-evaluator, synthesis-editor): only run after explicit human authorisation OR via a hermes cross-check loop.

## Active Pilot — WP-05 / WP-06 (Bremen/Berlin August 1961)

Per `agents/handoffs/codex-to-researcher-hermes-2026-07-19.md`:

- **Title:** `WP-05/WP-06: Quellen und begrenzte Extraktion Bremen/Berlin August 1961`
- **Assignee:** OpenClaw `researcher` agent (and Hermes if cross-check needed)
- **Lifecycle:** `intake → ready → in_progress → review → testing → done`
- **Acceptance criteria** (from handoff):
  - At least one resilient source chain per city **or** documented reason why unreachable.
  - **No** fabricated playlists, schedules, ratings, or memories.
  - Every record carries id, source, status, uncertainty, provenance.
  - DDR Berlin / West Berlin / Bremen perspectives kept separated.
  - Agent run log with search paths, errors, open questions, next steps.
  - **Skeptical-reviewer + source-critic pass** before any synthesis (gates 2 + 3 in the Pre-Commit-Pipeline).

### Sub-tasks (from handoff)

1. Prüfe Berliner DRA- und ZEFYS-Spuren für 7.–20. August 1961.
2. Kläre Radio-Bremen-Bestände und lokale Bremer Presse.
3. Ergänze RIAS-/SFB-Quellen als West-Berliner Gegenperspektive.
4. Erfasse nur zulässige Metadaten + kurze Belege in `data/curated/`.
5. Dokumentiere Quellenstatus, Rechte, regionale Reichweite, Lücken.
6. Schreibe einen ersten Vergleichsentwurf **nur** mit belegten Aussagen.

## Quality Gate (under the Pre-Commit-Pipeline)

Before any commit (per the repo's `AGENTS.md` and the Pre-Commit-Pipeline — see `assets/pre-commit-pipeline.md`):

- `python3 scripts/validate/validate_data.py` over changed YAML/JSON.
- `git diff`, `git diff --check`.
- Targeted tests where applicable.
- New entities have stable local IDs and a clear purpose.
- Reconstructions carry an explicit uncertainty statement.
- **No** fabricated sources, quotes, programmes, playlists, ratings, memories.

Watched quality issues: broken internal links; missing source attribution; duplicate ids; invalid YAML/JSON; claims without status tag; relationships without provenance; reconstructions without uncertainty marker; unproven playlists or schedules; mixing national vs regional data; mixing contemporary reception with later memory; unmarked agent-generated text; outdated documentation; redundant or unnecessarily large datasets.

## Roles Split — Codex vs OpenClaw/Hermes (hard rule)

**Codex** — only on explicit request, never automatically re-engaged:
- research design, architecture/methodology, theoretical sparring partner, reviewer, synthesis advisor.

**OpenClaw / Hermes** — default ownership:
- operational research, sourcing, agent coordination, data curation, agent runs, validation, backlog/kanban, documentation.

**Hard rule:** Do **not** trigger further Codex operational research for tasks this skill can handle autonomously.

## Git & Safety Rules + Pre-Commit-Pipeline

### Safety (always on)

- Repository **stays private** until Marcus explicitly says otherwise.
- **No auto-publish** to GitHub.
- **No** credentials, tokens, private conversation content stored in repo.
- **No** fabricated sources, quotes, programmes, playlists, reach numbers, or memories.
- **No automated scraping infrastructure** without separate legal/tech review.
- **No** changes to foreign repos.
- The separated ownership/real-estate resource project stays **explicitly out of scope**; mention only as "Separate Project" / "out of scope".
- For handoff-style tasks run by Hermes: copy the same evidence rules, no fabrication, no schedule claims without source.

### Pre-Commit-Pipeline (instead of per-commit human gate)

Commits and pushes are governed by an **automated review pipeline** (CI/CD + Scrum/Kanban style). No per-commit human approval is required when the pipeline is green. Six sequential gates determine outcome.

| # | Gate | Owner | Trigger | Hard-stop condition |
|---|------|-------|---------|---------------------|
| 1 | Lint + Schema-Validator | `documentation-maintainer` (Python) | every commit | YAML/JSON invalid, missing IDs, broken internal links |
| 2 | Source-Critic | `source-critic` agent | every commit with new claims | claims without status tag, relations without provenance |
| 3 | Skeptical-Reviewer | `skeptical-reviewer` agent | every commit with reconstructions | reconstruction without uncertainty; reconstruction-vs-interpretation mix |
| 4 | Kanban-Guard | `research-coordinator` | every commit | diff inconsistent with `backlog/now.md` (e.g. closing already-closed tickets, opening already-open ones) |
| 5 | Changelog-Checker | `documentation-maintainer` | every commit | `AGENT_CHANGELOG.md` not updated for this run |
| 6 | Synthesis-Stop | `synthesis-editor` + `skeptical-reviewer` | before any synthesis publication | gates 2 + 3 not both green for the synthesis |

### Pipeline outcomes

- ✅ **All 5 gates green** → auto-commit + push to the private repo is allowed.
- ⛔ **Gate 1 or 2 red** → **stop, no commit**, fix required before retry.
- 🟡 **Gate 3 / 4 / 5 yellow** → commit is allowed, but the `AGENT_CHANGELOG.md` entry must carry `"human-review-recommended": true`.
- 🚦 **Synthesis publication** (sync to a public surface, public notes, blogpost, working-notes integration) requires gates 2 + 3 both green and Marcus's explicit approval.
- 🚧 **Override** via `git commit --no-verify` is reserved for emergencies and must be recorded in `AGENT_CHANGELOG.md` with an explicit reason.

See `assets/pre-commit-pipeline.md` for the gate-level spec, error catalogue, and override protocol.

## First Steps (post-skill-creation)

1. Verify current repo state at `/root/.openclaw/genealogies-general-intellect/` (done 2026-07-19 by Rook).
2. Read `AGENTS.md`, `agents/handoffs/`, `backlog/`, `docs/research-control.md`, `AGENT_CHANGELOG.md` before any new task.
3. Confirm project is routed in OpenClaw → `researcher` agent registration (workspace `/root/.openclaw/workspace-researcher`). Optional: add a project-symlink or per-project skills entry to the OpenClaw routing for this skill.
4. Maintain a project-wide backlog across music, literature, media worlds, and theory (use the repo's `backlog/` files).
5. File the Bremen/Berlin 1961 work package as a bounded researcher task linked to the handoff + iteration 2 (`backlog/roadmap.md`).
6. Document responsibilities OpenClaw ↔ Hermes ↔ Researcher ↔ Codex (see `assets/responsibilities.md`).
7. Produce/keep a transparent four-iteration plan referencing `backlog/roadmap.md` (see `assets/four-iteration-plan.md`).
8. **Do NOT trigger further Codex operational research.**
9. After the skill is applied, configure the Pre-Commit-Pipeline as a real hook (see `assets/pre-commit-pipeline.md` §"Implementation").

## Repo Quick-Reference

See `assets/repo-map.md` for the full map of `AGENTS.md`, `docs/`, `research/`, `agents/{roles,workflows,handoffs}/`, `backlog/`, `data/`, `templates/`, `scripts/validate/validate_data.py`, `tests/`.

## Caller Recipe (for OpenClaw / Hermes)

When asked to "continue the project" / "work on the Bremen-Berlin 1961 pilot" / "extract Nurse with Wound evidence" / etc.:

1. Open this skill; locate the repo at `/root/.openclaw/genealogies-general-intellect/`.
2. Read the repo's `AGENTS.md`, current `backlog/now.md`, relevant `agents/roles/*.md` + `agents/workflows/*.md`, and (if applicable) the handoff file.
3. Choose one role + one work mode. State them in the run log.
4. Produce only what the role's acceptance criteria require.
5. Run validator + targeted tests before any commit proposal.
6. Update `backlog/`, `AGENT_CHANGELOG.md`, and `templates/agent-run-log.md`.
7. **Commits go through the Pre-Commit-Pipeline** (see `assets/pre-commit-pipeline.md`). Push to the private repo is automatic when the pipeline is green; public releases always need explicit human approval.
