# 2026-06-16 — Lazy Skills Shipped

## Was passiert ist

- `lazy-default/SKILL.md` (gestern 17:33 geschrieben) + `lazy-review/SKILL.md` (heute 09:40 geschrieben) manuell nach `~/.openclaw/workspace/.agents/skills/` angelegt — analog zu `auto-save-research` und `dispatch_canonical_task`.
- Format-Anpassungen ggü. Proposal: YAML-Frontmatter mit `name`/`description`/`user-invocable`/`disable-model-invocation`, Description auf ≤160 chars gekürzt, `→` → `->` für ASCII-clean, Proposal-Metadata raus.
- Commit `c4a808c` "Add lazy-default + lazy-review skills (ponytail port)" auf `main` gepusht zu `rook-workspace`.
- Skill-Workshop-Proposals bleiben `pending` (History) — das System hat keine echte `apply`-Route, die Anwendung passiert über's Filesystem. Per Design.

## Lesson

**`auto-save-research` watchlist umfasst NICHT `.agents/skills/`.** Nur `research/`, `projects/digital-research/`, `wiki/`, `memory/` werden getriggert. Skill-Files müssen manuell committed werden, sonst sammeln sich untracked Files an.

## Decision (09:54)

**B: Skills bleiben "manual commit only".** Watchlist wird NICHT erweitert.

Begründung:
- Skills sind curated Meta-Config, kein Daten-Churn -> verdienen Review + Commit-Message-Qualität
- Auto-Commit macht `git log` kaputt bei Skill-Iterationen (Initial -> Review -> Final)
- Pattern-Konsistenz: HEARTBEAT.md, MEMORY.md, briefings/ werden auch nicht auto-committet, aus den gleichen Gründen

**Visibility-Hilfe:** erst beim nächsten Sonntags-Heartbeat (20.06.) testen — schauen ob überhaupt nötig. Wenn ja, später einbauen. YAGNI bis Realität's Gegenteil beweist.

## Status

- `lazy-default` + `lazy-review` -> **live & nutzbar** ab jetzt in dieser Session.
- `apply`-Action im Skill-Workshop -> weiterhin nicht funktional hier. Vorschlag von gestern gilt: Pending als History, Files als Source of Truth.
- Commit-Boundary-Konvention -> in MEMORY.md festgehalten.
