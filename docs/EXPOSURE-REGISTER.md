# Exposure Register

> Status: Baseline public and semi-public service exposure map
> Last updated: 2026-05-08

## Goal

Document which services are reachable beyond their local process boundary and whether that exposure is intentional, necessary, and protected.

## Exposure Classes

- `public-hostname`
  - externally reachable through DNS/tunnel/proxy
- `host-open-port`
  - listening on host interfaces
- `local-only`
  - loopback or bridge scoped only
- `lab-only`
  - intended for platform experiments, not durable production use

## Current Hostname Exposure

| Hostname | Backend | Exposure Class | Purpose | Risk | Recommended State |
|---|---|---|---|---|---|
| `dashboard.working-notes.org` | `http://localhost:3001` | public-hostname | Rook dashboard UI | high | keep only if operator access is required and auth posture is verified |
| `gitlab.working-notes.org` | `http://localhost:8090` | public-hostname | GitLab UI | high | keep only if actively used and strongly protected |
| `n8n.working-notes.org` | `http://localhost:5678` | public-hostname | Automation UI/API | critical | review immediately; n8n is high blast-radius infrastructure |
| `k8portal.working-notes.org` | `http://172.18.0.2:31439` | public-hostname | Portal ingress via lab cluster | high | lab-only unless upgraded to stable production basis |
| `argocd.working-notes.org` | `http://172.18.0.2:30080` | public-hostname | ArgoCD UI | critical | lab-only and heavily restricted if retained |
| `keycloak.working-notes.org` | `http://172.18.0.2:30081` | public-hostname | Keycloak UI | critical | avoid broad exposure unless required for explicit auth flows |
| `polaris.working-notes.org` | `http://172.18.0.2:31439` | public-hostname | Polaris dashboard path | medium | lab-only |

## Current Host Port Exposure

| Port | Service | Exposure Class | Notes |
|---|---|---|---|
| `80/tcp` | nginx | host-open-port | Reverse proxy entrypoint |
| `6262/tcp` | sshd | host-open-port | Administrative access; intentionally exposed |
| `5000/tcp` | registry | host-open-port | Container registry; should be treated as privileged infra |
| `8022/tcp` | GitLab SSH | host-open-port | Public repo/admin surface |
| `8090/tcp` | GitLab HTTP | host-open-port | Web UI behind host port |
| `8443/tcp` | GitLab HTTPS | host-open-port | Web UI behind host port |
| `127.0.0.1:5678` | n8n | local-only | Also published via cloudflared |
| `127.0.0.1:18789` | OpenClaw gateway | local-only | Control-plane internal API |
| `127.0.0.1:3001` | Rook dashboard | local-only | Also published via cloudflared |

## Internal Reverse Proxies

Observed nginx reverse proxy use:

- `n8n.working-notes.org` -> local `n8n`
- `api.platform-dev.idp.local` -> local platform API path
- `argocd.platform-dev.idp.local` -> local forward target
- `keycloak.platform-dev.idp.local` -> local forward target
- `polaris.platform-dev.idp.local` -> local forward target
- `grafana.platform-dev.idp.local` -> local forward target
- `platform-ui.platform-dev.idp.local` -> local forward target

## Exposure Governance Gaps

Missing or under-documented today:

- explicit owner per exposed hostname
- explicit allowed audience per hostname
- explicit authentication expectation per hostname
- documented disablement rule for unused endpoints
- monthly or release-based exposure review

## Required Review Matrix

Every exposed endpoint should answer:

1. Who owns it?
2. Who is allowed to use it?
3. Is it private, operator-only, collaborator-only, or public?
4. What auth path protects it?
5. What breaks if it is disabled?
6. Is it lab, staging, or production?

## Immediate Actions

1. Review `n8n`, `ArgoCD`, `Keycloak`, and `GitLab` exposure first.
2. Mark each hostname as:
   - `retain`
   - `retain but harden`
   - `disable`
3. Separate lab hostnames from publication hostnames in documentation and operations.

Machine-readable artifact:

- `docs/data/exposure-inventory.v1.json`
