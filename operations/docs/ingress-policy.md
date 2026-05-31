# Ingress Policy

Date: 2026-05-31

Scope: Hermes + OpenClaw VPS ingress classification and operator guardrails.

Source of truth:

- `/root/hermes_openclaw_optimization_blueprint.md`
- `/root/.openclaw/workspace/docs/TARGET-ARCHITECTURE.md`
- `/root/.cloudflared/config.yml`
- live `ss`, `docker ps`, and firewall inspection on the VPS

## Policy

### Public

Only these ingress surfaces are intentionally public unless a documented exception exists:

- SSH on `6262`
- HTTP/HTTPS ingress used by nginx or a tunnel terminator

### Tunnel-only

These services are intended to be reached through Cloudflare Tunnel or equivalent authenticated admin ingress, not direct public host bindings:

- `dashboard.working-notes.org` -> `http://localhost:3001`
- `gitlab.working-notes.org` -> `http://localhost:8090`
- `n8n.working-notes.org` -> `http://localhost:5678`
- `k8portal.working-notes.org`
- `argocd.working-notes.org`
- `keycloak.working-notes.org`
- `polaris.working-notes.org`

Tunnel-only services must have:

- identity policy or equivalent access control
- no direct public host bind unless explicitly approved
- logging for access and denial events where available

### Localhost-only

These services must bind to `127.0.0.1` or equivalent loopback-only interfaces on the host:

- Rook dashboard app server on `3001`
- OpenClaw gateway endpoints that are only meant for local clients
- Hermes bridge endpoints
- GitLab local host mappings already exposed through localhost only
- Docker-published internal services from `ki-werkstatt`:
  - `5432`
  - `4222`
  - `9998`
  - `8080`
  - `8081`
  - `8082`
  - `8083`

### Container-only

These services should not be published to the host unless a documented reason exists:

- PostgreSQL/pgvector
- NATS
- Tika
- internal FastAPI / MCP-style APIs
- worker containers

## Operational Rules

1. Any new public port requires a written exception in this file or a higher-level ops document.
2. Any admin UI exposed through tunnel must keep direct public host bindings disabled.
3. Any Docker compose file exposing internal services must use localhost-only bindings or no host publishing at all.
4. Every recurring job that touches public ingress, secrets, or backup deletion must use a lock or equivalent lease.
5. Changes to ingress must be verified with both local socket checks and an external scan when possible.

## Validation Checklist

- `ss -tulpn` shows only the intended public and localhost listeners.
- `docker ps` shows no `0.0.0.0` host publishes for internal services.
- `iptables -S` and UFW rules match the documented policy.
- Cloudflare Tunnel mappings match the intended tunnel-only services.

## Open Questions

- Whether any service besides SSH and HTTP/HTTPS ingress should ever be public.
- Whether Kubernetes admin hostnames should remain tunnel-only permanently or move off-host.
- Whether `ki-werkstatt` should stay on this VPS at all once usage is measured after hardening.
