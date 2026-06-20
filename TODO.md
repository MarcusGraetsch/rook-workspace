# Zentrale TODO — Rook Workspace

> Single source of truth für offene Aufgaben, Entscheidungen und Follow-ups.
> Review-Rhythmus: täglich bei aktiver Arbeit, sonst mindestens wöchentlich (Sonntag).

## Prozess

1. **Neuer Eintrag:** Sobald ein Task entsteht, hier rein — mit Quelle und Kontext.
2. **Status-Update:** `[ ]` offen → `[/]` in Arbeit → `[x]` erledigt.
3. **Wöchentliches Review (Sonntag):**
   - Offene Punkte durchgehen, Prioritäten prüfen
   - Veraltetes archivieren oder löschen
   - Neue Einträge aus Session-Reviews, Heartbeats, Gesprächen hinzufügen
4. **Archiv:** Erledigtes wird nach `memory/YYYY-MM-DD.md` oder `archive/todo/` verschoben, nicht einfach gelöscht.
5. **Governance:** Änderungen an diesem File sind normale Workspace-Änderungen — kein separater Approval nötig, aber bei großen Umstrukturierungen Bescheid sagen.

---

## 🔴 Kritisch / Blocker

| # | Task | Quelle | Status | Notizen |
|---|------|--------|--------|---------|
| 1 | Flux GitHub Token konfigurieren (Repo ist private) | IDP K8s Lab | `[ ]` | Blockt GitOps-Sync |
| 2 | ArgoCD Keycloak SSO fertigstellen | IDP K8s Lab | `[ ]` | |
| 3 | Voice-Call Real-Setup abschließen (Telnyx API Key, Connection ID, Public Key, fromNumber, public Webhook-URL) | Session-Review 2026-06-12 / Telnyx-Wartezustand | `[ ]` | Blockiert bis die externen API- und Webhook-Daten vorliegen |

## 🟡 In Arbeit

| # | Task | Quelle | Status | Notizen |
|---|------|--------|--------|---------|
| 3 | Bridge/DR Governance-Doku ins Wiki überführen | Session-Review 2026-05-08 | `[x]` | Topic `rook-hermes-bridge` angelegt, Cross-Refs gesetzt |
| 4 | Health Agent: Coaching Workflow fertigbauen | TODO-2026-04-10 | `[ ]` | CLI existiert, kein strukturierter Workflow |
| 5 | Kanban startup hardening (DB restore handling) | TODO-2026-04-02 | `[x]` | `dashboard-startup-guard.sh` + Startup Guard in `start-dashboard.sh` |

## 🟢 Offen / Backlog

| # | Task | Quelle | Status | Notizen |
|---|------|--------|--------|---------|
| 6 | OpenAI API Key beschaffen + als Fallback konfigurieren | TODO-2026-04-10 | `[ ]` | Kimi Rate Limits |
| 7 | Community Monitoring (Discord, X/Twitter) | TODO-2026-04-10 | `[ ]` | Push oder Pull? |
| 8 | Eigene Skills bauen (nach Aaron's Tipp) | TODO-2026-03-27 | `[ ]` | ClawHub durchsuchen, Vorlage nehmen |
| 9 | Health: Schlaf-Tracking integrieren | TODO-2026-04-10 | `[ ]` | |
| 10 | Wiki: Ingest-Workflow bei Bedarf | TODO-2026-04-10 | `[ ]` | Neue Quellen (Podcasts, Artikel) |
| 11 | Wiki: `log.md` pro Topic bei first Ingest | TODO-2026-04-10 | `[ ]` | |
| 12 | IDP Customer Onboarding: Kundenspezifische Doku | idp-customer-onboarding | `[ ]` | |
| 13 | IDP Customer Onboarding: Dashboard Widgets (Vulnerabilities) | idp-customer-onboarding | `[ ]` | |

## ✅ Kürzlich Erledigt

| # | Task | Quelle | Erledigt | Notizen |
|---|------|--------|----------|---------|
| | ChatGPT Export analysieren + in Wiki integriert | TODO-2026-03-27 | 2026-04 | |
| | Wiki-System etabliert (28 Topics, Schema, Cron) | TODO-2026-04-10 | 2026-04 | |
| | IDP K8s Lab gebaut (8h Session) | MEMORY.md | 2026-04-21 | 23 Doku-Stücke |
| | Bridge Governance: Reviewer Allowlist + Archive Gate | Session-Review 2026-05-08 | 2026-05-08 | |
| | Hermes DR: Backup, Restore, Rehearsal | Session-Review 2026-05-08 | 2026-05-08 | |
| | Reviewed Archive Promotion → mandatory | Marcus Entscheidung | 2026-05-10 | Policy aktualisiert |
| | Reviewer-Allowlist → human-marcus Approval | Marcus Entscheidung | 2026-05-10 | Prozess dokumentiert |
| | Live-Delivery → out of scope | Marcus Entscheidung | 2026-05-10 | |

---

## Offene Entscheidungen / Fragen

> Hier landen alle "noch unklar"-Punkte, bis sie entschieden sind. Dann → ✅ oder in Tasks.

| # | Frage | Kontext | Status |
|---|-------|---------|--------|
| 1 | Community Monitoring: Push oder Pull? | Discord/X/Twitter | `[ ]` |
| 2 | Health: CLI oder Chat-basiert? | Health Agent Workflow | `[ ]` |
| 3 | Skills: Welcher als erstes nachbauen? | ClawHub Skills | `[ ]` |

---

*Letztes Review: 2026-05-10*
*Nächstes Review: 2026-05-17 (Sonntag)*
