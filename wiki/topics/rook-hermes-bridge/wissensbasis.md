# Rook/Hermes Bridge

> Governance, Review und Archivierung für strukturierten Austausch zwischen Rook (OpenClaw) und Hermes (Phoenix).
> Stand: 2026-05-10

## Zusammenfassung

Die Bridge ist die kontrollierte Grenze zwischen zwei Systemen:

- **Rook / OpenClaw** — technische Kontrollebene (Workspace, Ops, Git, Kubernetes)
- **Hermes / Phoenix** — separate reflektive/private Assistentenebene

Über diese Grenze fließen strukturierte Nachrichten (Bridge Messages), die geprüft, klassifiziert und archiviert werden müssen, bevor sie als verbindlicher Kontext dienen.

## Kern-Entscheidungen

| Entscheidung | Status | Datum |
|-------------|--------|-------|
| Reviewed Archive Promotion ist **verpflichtend** | ✅ mandatory | 2026-05-10 |
| Reviewer-Allowlist-Änderungen brauchen **human-marcus** Approval | ✅ human-in-the-loop | 2026-05-10 |
| Live-Delivery-Gating bleibt **außerhalb des Scopes** | ✅ out-of-scope | 2026-05-10 |

## Enforcement Level

- **Archive Promotion** → `mandatory` (hart geprüft)
- **Andere Bridge-Payloads** → `recommended` (optional via Review-Wrapper)
- **Live Delivery** → `out-of-scope` (ungated, Review passiert vorher)

## Review-Prozess

```
Payload erstellen → Schema validieren → Review (human) →
review_status=approved + reviewed_by + reviewed_at →
Allowlist-Check → Archive Gate → Kopie ins Archiv →
Manifest-Eintrag → ggf. Live Delivery
```

## Wichtige Artefakte

| Artefakt | Zweck | Ort |
|----------|-------|-----|
| Schema | Validierung der Nachrichtenstruktur | `operations/schemas/rook-hermes-bridge-message.schema.json` |
| Reviewer Allowlist | Wer darf `reviewed_by` sein? | `operations/config/rook-hermes-bridge-reviewers.json` |
| Validator | Python-Check: Schema + Secrets + Allowlist | `operations/bin/validate-rook-hermes-bridge-message.py` |
| Review Wrapper | Shell-Wrapper mit human-prompt | `operations/bin/review-rook-hermes-bridge-message.sh` |
| Archive Gate | Hard-Check vor Archivierung | `operations/bin/gate-rook-hermes-bridge-archive.sh` |
| Archive Flow | Kopie + Manifest + Deduplizierung | `operations/bin/archive-reviewed-rook-hermes-bridge-message.sh` |
| Manifest Inspector | Suche/Filter im Archiv | `operations/bin/inspect-rook-hermes-bridge-archive-manifest.py` |
| Prune Planner | Nicht-destruktiver Löschplan | `operations/bin/plan-rook-hermes-bridge-archive-prune.py` |
| Policy | Menschenlesbare Regeln | `docs/BRIDGE-REVIEW-POLICY.md` |
| Runbook | Operator-Anleitung | `docs/BRIDGE-ARCHIVE-OPERATOR-RUNBOOK.md` |
| Integration Contract | Systemgrenzen und Datenflüsse | `docs/ROOK-HERMES-INTEGRATION-CONTRACT.md` |

## Allowlist Governance

Änderungen an `operations/config/rook-hermes-bridge-reviewers.json` erfordern:

1. Separater Commit mit Begründung
2. Explizites Approval durch `human-marcus`
3. Kein Self-Approval
4. Backport zu anderen Umgebungen, die dieselbe Allowlist nutzen

## Retention Baseline

| Art | Mindestens | Maximal |
|-----|-----------|---------|
| Routine | 30 Tage | — |
| Architektur / Audit | 90 Tage | — |
| Prune | Plan-first, nie ad hoc automatisch löschen | — |

## Historie

- **2026-05-08** — Komplette Governance- und DR-Baseline etabliert (14 Commits)
- **2026-05-10** — Marcus bestätigt: Archive Promotion verpflichtend, Allowlist human-governed, Live Delivery out-of-scope

## Cross-References

→ [[cli-agent-architecture]] — Rook/OpenClaw als technische Kontrollebene  
→ [[compliance-legal]] — Governance, Review und Approval-Prozesse  
→ [[security-access]] — Secrets, Exposure Register, Identity Constraints  
→ [[knowledge-management]] — Archive, Manifest, Deduplizierung, Prune Planning  
→ [[cloud-kubernetes]] — IDP Plattform, GitOps, Hermes/Phoenix Runtime

## Quellen

- Vollständige Reports im Workspace:
  - `docs/reports/2026-05-08_session-review_governance-and-dr-consolidated-summary.md`
  - `docs/reports/2026-05-08_session-review_bridge-reviewer-allowlist-and-live-candidate.md`
  - `docs/reports/2026-05-08_session-review_final-overview.md`
- Policy: `docs/BRIDGE-REVIEW-POLICY.md`
- Runbook: `docs/BRIDGE-ARCHIVE-OPERATOR-RUNBOOK.md`
