# Responsibilities — OpenClaw / Hermes / Researcher / Codex

Source skill: `genealogies-general-intellect`. Source repo: `/root/.openclaw/genealogies-general-intellect/`.

## Codex — Design, Architecture, Methodology, Review, Synthesis advice

Only on **explicit human request** from Marcus. Never automatically re-engaged for tasks the project skill can handle itself. Tasks:

- Research design.
- Architecture and methodology questions.
- Theoretical sparring partner.
- Reviewer of syntheses.
- Synthesis advisor.

## OpenClaw `researcher` agent — Operational research, sourcing, data curation

Default home for media-world/literature/music operational research.

- Workspace: `/root/.openclaw/workspace-researcher`.
- Tools: GitHub CLI, web-search (per `openclaw.json`).
- Owns: WP-05/06 Bremen-Berlin-1961 pilot (currently).
- Covers roles: source-scout, source-critic, genealogy-mapper,
  music-researcher, film-television-researcher, radio-broadcast-archaeologist,
  media-world-reconstructor, reception-researcher, documentation-maintainer.
- Must run `python3 scripts/validate/validate_data.py` before any commit proposal.
- Reports into the project repo's `backlog/` + `templates/agent-run-log.md`.

## Hermes (separate framework) — Cross-check, long-running memory, persona tasks

- Lives outside OpenClaw in `/root/.hermes/` (Hermes agent framework).
- Can run cross-check passes for the gated roles:
  skeptical-reviewer, theoretical-interpreter, literature-curator,
  life-impact-evaluator, synthesis-editor.
- Receives handoffs via `agents/handoffs/codex-to-researcher-hermes-*.md` files.
- Mirrors the same evidence rules — **no fabrication, status tags required**.

## OpenClaw `rook` agent (this agent) — Coordination, kanban, status, summaries

- Workspace: `/root/.openclaw/workspace`.
- Owns: backlog maintenance, kanban updates, status reporting, drafts of
  responsibilities/ownership docs.
- Routes research questions to `researcher` agent; routes design questions to
  Codex only on explicit request.
- **Does not** autonomously push to the project repo; follows the Pre-Commit-Pipeline (see `assets/pre-commit-pipeline.md`).

## Human (Marcus)

- Sets scope, approves synthesis, owns theoretical/historical/curatorial decisions.
- Authorises any **public** release (working-notes integration, blogpost, etc.).
- Decides when a Codex review is needed.
- Sets/resets the four-iteration roadmap.

## Hand-offs

- Codex → OpenClaw: write to `agents/handoffs/codex-to-*.md`, update `backlog/issues.md` + `AGENT_CHANGELOG.md`.
- OpenClaw → Hermes: write to `agents/handoffs/openclaw-to-hermes-*.md`, update log.
- OpenClaw `researcher` → human: stand back, await human review before synthesis publication.

## Hard Rules (recap)

1. No fabrication, no auto-publishing to public surfaces.
2. Every claim: source + status + provenance + (if reconstructed) uncertainty.
3. Skeptical-reviewer + source-critic pass **before** any synthesis (Pre-Commit-Pipeline gates 2 + 3).
4. Per handoff: separate DDR Berlin / West Berlin / Bremen perspectives.
5. Per scope: real-estate and ownership matters stay in Separate Project; do not mix into this repo's data.
6. Commits and pushes go through the **Pre-Commit-Pipeline** — no per-commit human gate, but hard-stops are enforced automatically.
