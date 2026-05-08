# Secret Register

> Status: Baseline secret and credential inventory
> Last updated: 2026-05-08
> Scope: location metadata, risk context, ownership hints, and remediation priorities

This file intentionally does not contain secret values.

## Goal

Track where sensitive material lives today so the system can:

- reduce secret sprawl
- separate runtime credentials from tracked docs
- assign ownership
- rotate or relocate high-risk items
- support disaster recovery without normalizing secret leakage

## Classification

Use these classes:

- `runtime-secret`
  - required by a running service or automation path
- `user-auth-material`
  - OAuth files, tokens, or human-scoped auth state
- `integration-secret`
  - bot tokens, webhook auth, third-party connectors
- `recovery-sensitive`
  - files that are not secrets in the narrow sense, but contain enough state to become highly sensitive
- `doc-risk`
  - markdown or config examples that document weak or live credentials

## Current Register

| Path / Scope | Class | System | Risk | Notes |
|---|---|---|---|---|
| `/root/.openclaw/.env.d/` | runtime-secret | OpenClaw / Rook | high | Primary runtime environment files for gateway and dispatcher |
| `/root/.openclaw/rook-agent/.moltbook_credentials.json` | user-auth-material | OpenClaw / Rook | high | Local credential artifact outside central registry |
| `/root/.hermes/.env` | runtime-secret | Hermes / Phoenix | critical | Core Hermes runtime configuration and provider auth surface |
| `/root/.hermes/.discord_token` | integration-secret | Hermes / Phoenix | critical | Bot-grade credential in local flat file |
| `/root/.hermes/auth.json` | user-auth-material | Hermes / Phoenix | critical | Auth state file; likely broad compromise surface |
| `/root/.hermes/google_client_secret.json` | integration-secret | Hermes / Phoenix | critical | Google OAuth client material |
| `/root/.hermes/google_oauth_pending.json` | user-auth-material | Hermes / Phoenix | high | OAuth flow residue; should not drift across snapshots unchecked |
| `/root/.hermes/state-snapshots/**` | recovery-sensitive | Hermes / Phoenix | high | Snapshots can duplicate auth-bearing files and widen secret footprint |
| `/root/.hermes/migration/**/backups/**` | recovery-sensitive | Hermes / Phoenix | high | Migration backups may retain stale credential copies |
| `/root/.openclaw/workspace/projects/working-notes/.env` | runtime-secret | Website | high | Site-local environment file outside centralized secret handling |
| `/root/.openclaw/workspace/engineering/idp-customer-onboarding/infra/n8n/.env` | runtime-secret | n8n / IDP | high | Compose-managed runtime secret path |
| Kubernetes `Secret` objects across `argocd`, `flux-system`, `monitoring`, `platform-dev`, `trivy-system` | runtime-secret | Kubernetes Lab | high | Secret objects exist, but lifecycle and rotation are not centrally documented |
| `cloudflared` tunnel credential references under `/etc/cloudflared/` | integration-secret | Web exposure | high | Public exposure dependency with strong blast radius |

## Documented Secret Hygiene Risks

The following are not acceptable long-term even when they are “dev only”:

- tracked documentation that includes literal passwords
- example credentials that are identical to live credentials
- copied auth files in backups, snapshots, or migration folders without retention rules
- mixed private and operational credentials in the same runtime tree

Current `doc-risk` examples observed during audit:

- IDP platform documentation with literal development credentials
- Kubernetes lab documentation that uses known default admin credentials

These should be normalized to placeholders plus retrieval instructions.

## Ownership Model

Recommended owners:

- `OpenClaw runtime secrets`
  - owner: Rook platform operations
- `Hermes runtime and personal auth material`
  - owner: Hermes private runtime owner
- `Website deploy credentials`
  - owner: publishing / website operations
- `Kubernetes lab secrets`
  - owner: platform lab operations

No secret should remain without a named owner and rotation path.

## Remediation Priorities

### Priority 0

- Remove or rewrite documented literal credentials in tracked markdown.
- Freeze ad-hoc copying of auth files into snapshots unless explicitly justified.

### Priority 1

- Consolidate OpenClaw runtime secrets into a documented, minimal host secret layout.
- Consolidate Hermes runtime secrets and define which files must never be copied into broad backups.
- Add a retention and review rule for `.hermes/state-snapshots/` and migration backup folders.

### Priority 2

- Introduce a machine-readable secret inventory with fields:
  - `path`
  - `class`
  - `owner`
  - `rotation_required`
  - `backup_allowed`
  - `notes`

### Priority 3

- Move Kubernetes lab secret management to one explicit operating pattern.
- Add rotation cadence and last-reviewed dates.

## Immediate Operator Rules

1. Do not paste secret values into task JSON, memory files, or markdown reports.
2. Do not treat snapshots as harmless archives.
3. Do not let “dev defaults” survive past bootstrap.
4. Do not back up personal auth state and technical control-plane secrets with the same policy by default.
