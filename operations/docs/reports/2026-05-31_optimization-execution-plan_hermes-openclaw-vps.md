# Comprehensive Hermes + OpenClaw Optimization Execution Plan

Date: 2026-05-31

Scope: Hermes Agent, OpenClaw/Rook, Codex operator workflow, Docker/systemd/cron, VPS exposure, performance, security, observability, backup and recovery.

Primary source: `/root/hermes_openclaw_optimization_blueprint.md`

Supporting local context checked:

- `/root/.openclaw/AGENTS.md`
- `/root/.openclaw/workspace/docs/SYSTEM-MAP.md`
- `/root/.openclaw/workspace/docs/TARGET-ARCHITECTURE.md`
- `/root/.openclaw/rook-agent/README.md`
- user systemd units for `openclaw-gateway`, `openclaw-node`, `rook-dashboard`, `hermes-gateway`, `rook-dispatcher`, `rook-event-dispatcher`, and `rook-runtime-backup.timer`

## 1. Executive Summary

### Top goals

1. Reduce public exposure immediately, especially Docker-published internal services and direct dashboard access.
2. Improve single-VPS reliability by adding swap, reducing always-on resource pressure, and adding memory guardrails.
3. Simplify operations by moving from root cron sprawl to named systemd services/timers with locks, logs, and status.
4. Preserve the intended Hermes/OpenClaw boundary: OpenClaw owns operational work state; Hermes integrates through an explicit bridge contract.
5. Improve AI agent efficiency with bounded context, model routing, idempotent task execution, clear stopping conditions, and observable run metadata.

### Biggest risks from the blueprint

- Critical: public Postgres/pgvector `5432`, NATS `4222`, Tika `9998`, and FastAPI services `8080-8083` bound to `0.0.0.0`/`[::]`, with confirmed Postgres authentication failures.
- High: Rook dashboard directly reachable on `3001` while also exposed through Cloudflare Tunnel, creating bypass risk.
- High: root-run automation and AI tool execution from privileged paths.
- High: no swap despite GitLab, kind/Kubernetes, Java/Tika, Hermes, OpenClaw, dashboard, and Codex workloads sharing one VPS.
- High: fragmented control plane across systemd, cron, Docker Compose, kind/Kubernetes, nginx, cloudflared, dashboard SQLite/cache, canonical JSON, and runtime archives.

### What should happen first

1. Take a pre-change exposure and service snapshot.
2. Rebind or remove public host publishing for `ki-werkstatt` internal services.
3. Confirm authenticated tunnel access to the dashboard, then remove direct public `3001` exposure and bind dashboard to localhost.
4. Add swap and verify no immediate OOM recurrence.
5. Add locks to the highest-frequency/overlap-prone cron jobs while planning systemd timer migration.

### Expected near-term outcomes

- Public attack surface shrinks to intended ingress only.
- OOM risk is reduced during transient memory spikes.
- Operators can distinguish intended public, tunnel-only, localhost-only, and container-only services.
- Cron overlap risk drops before deeper scheduler refactoring.
- Future work has a clear target: simple single-VPS architecture with explicit state ownership and observable jobs.

## 2. Blueprint-Derived Priorities

### Must-do

- Close public Docker-published internal ports: `5432`, `4222`, `9998`, `8080-8083`.
- Remove direct dashboard/API exposure on `3001`; use tunnel-only/admin access after validation.
- Add swap and memory guardrails.
- Snapshot and validate exposure before and after network changes.
- Create a single ingress policy document.
- Protect admin hostnames with Cloudflare Access or equivalent identity policy.

### Should-do

- Convert root cron jobs to systemd services/timers.
- Add `flock` to remaining cron jobs until migrated.
- Install and configure fail2ban or equivalent.
- Review secrets sprawl, fix unsafe file permissions, and rotate exposed credentials where needed.
- Run OpenClaw, Hermes, dashboard, and backup jobs under dedicated unprivileged users.
- Establish canonical OpenClaw task JSON as the only durable operational state and dashboard SQLite as rebuildable projection.
- Add lightweight task leases/idempotency for agent work.
- Build operational status snapshots from systemd, backups, task leases, health, and exposure scans.
- Define model-routing and context-budget policies.
- Make kind/Kubernetes on-demand unless continuously required.

### Nice-to-have

- Dashboard page for timer status, backup manifests, queue state, and model usage.
- Separate GitLab or Kubernetes onto another host only if resource metrics still justify it after single-VPS cleanup.
- Broader strategic redesign from polling/cron reactions to event/task queue semantics.

## 3. Phase 0: Preconditions and Safety Checks

### Objective

Establish a trustworthy baseline before changing firewall, Docker, systemd, storage, or AI workflow behavior.

### Why it matters

The blueprint shows multiple sources of truth and multiple ingress paths. Baseline snapshots prevent false confidence and provide rollback evidence.

### Exact tasks

1. Record git state for primary repos:
   - `git -C /root/.openclaw/workspace status --short`
   - `git -C /root/.openclaw/rook-agent status --short`
   - `git -C /root/.openclaw/workspace/engineering/rook-dashboard status --short`
   - `git -C /root/.openclaw/workspace/engineering/ki-werkstatt status --short`
2. Save exposure baseline:
   - `ss -tulpn`
   - `docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'`
   - `iptables -S`
   - `ufw status verbose`
   - external scan, if allowed: `nmap -Pn -p 80,6262,3001,4222,5432,8080-8083,9998 <public-ip>`
3. Save resource baseline:
   - `free -h`
   - `docker stats --no-stream`
   - `ps aux --sort=-%mem | head -30`
   - `journalctl -k --since '7 days ago' | rg -i 'oom|killed process|out of memory'`
4. Save operations baseline:
   - `systemctl --user list-units --type=service --state=running`
   - `systemctl --user list-timers --all`
   - root crontab inventory: `crontab -l`
5. Identify and back up the exact files to edit before editing:
   - `ki-werkstatt` compose file from the blueprint.
   - `rook-dashboard.service` and dashboard start script.
   - firewall persistence location.
   - root crontab or cron files.

### Dependencies

- Root shell access.
- External scan depends on permission and public IP/domain availability.
- Must know whether any public client depends on the exposed `ki-werkstatt` ports.

### Rollback concerns

- Baseline commands are read-only.
- Do not overwrite existing uncommitted work; create separate report/snapshot files.

### Validation checks

- Baseline files exist and include timestamp.
- Public exposure, Docker ports, service status, resource state, cron, and systemd timers are captured.

### Success criteria

- Engineer can prove what changed after each phase.
- Unknowns are explicit before risky changes.

## 4. Phase 1: Critical Same-Day Fixes

### Objective

Close the highest-risk public surfaces and reduce immediate OOM fragility without changing the core architecture.

### Why it matters

The blueprint marks public Docker services and direct dashboard exposure as the highest-priority risks, and confirms no swap plus OOM history.

### Exact tasks

1. Rebind `ki-werkstatt` ports to localhost or remove host `ports` where only sibling containers need access.
   - Affected: `/root/.openclaw/workspace/engineering/ki-werkstatt/infra-live/compose/docker-compose.yml`
   - Safe default: `127.0.0.1:<port>:<port>`
   - Better default for container-only dependencies: remove `ports` and rely on Compose service DNS.
2. Apply compose change:
   - `docker compose -f /root/.openclaw/workspace/engineering/ki-werkstatt/infra-live/compose/docker-compose.yml up -d`
3. Validate `5432`, `4222`, `9998`, `8080-8083` no longer bind to `0.0.0.0` or `[::]`.
4. Verify Cloudflare dashboard access and authentication policy.
5. Change dashboard binding to localhost.
   - Affected: `/root/.config/systemd/user/rook-dashboard.service`
   - Current observed setting: `ROOK_DASHBOARD_HOST=0.0.0.0`
   - Target: `ROOK_DASHBOARD_HOST=127.0.0.1`
   - Current observed start path: `/root/.openclaw/workspace/operations/bin/start-dashboard.sh`
6. Reload/restart dashboard:
   - `systemctl --user daemon-reload`
   - `systemctl --user restart rook-dashboard.service`
7. Remove direct public `3001` firewall rule only after local/tunnel validation:
   - `iptables -D INPUT -p tcp --dport 3001 -j ACCEPT`
   - Persist through the current netfilter persistence mechanism after confirming.
8. Add swap:
   - `fallocate -l 12G /swapfile`
   - `chmod 600 /swapfile`
   - `mkswap /swapfile`
   - `swapon /swapfile`
   - append `/swapfile none swap sw 0 0` to `/etc/fstab`
   - write `vm.swappiness=10` to `/etc/sysctl.d/99-local-swap.conf`
   - `sysctl --system`
9. Add `flock` wrappers to the most overlap-prone cron jobs if they remain in cron today:
   - Hermes bridge every 5 minutes.
   - runtime-to-drive backup.
   - GitHub issue sync.
   - Rook sync.
   - health checks and research pipelines.

### Dependencies

- Confirmation that no external clients require public `ki-werkstatt` ports.
- Confirmation that Cloudflare Tunnel and auth work for dashboard.
- Need firewall persistence location before making rule removal durable.

### Rollback concerns

- Docker port rollback: restore previous compose file and `docker compose up -d`.
- Dashboard rollback: restore `ROOK_DASHBOARD_HOST=0.0.0.0`, restart service, and re-add firewall rule only if emergency access is required.
- Swap rollback: `swapoff /swapfile`, remove `/etc/fstab` entry and sysctl file, delete `/swapfile`.
- Cron lock rollback: restore crontab from pre-change snapshot.

### Validation checks

- `ss -tulpn` shows no public bind for internal ports.
- `docker ps` shows `127.0.0.1` or no host binding for `ki-werkstatt`.
- External scan no longer sees `5432`, `4222`, `9998`, `8080-8083`, or `3001`.
- `curl http://127.0.0.1:3001` works locally.
- Cloudflare dashboard URL works with intended access policy.
- `free -h` shows swap.
- `journalctl -k --since today | rg -i 'oom|killed process|out of memory'` shows no new OOM after changes.

### Success criteria

- Only intended public surfaces remain.
- Dashboard direct bypass is closed.
- Swap is active and persistent.
- High-frequency jobs cannot overlap.

## 5. Phase 2: Stabilization This Week

### Objective

Make the system safer to operate day to day by documenting ingress, hardening SSH/secrets, reducing resource pressure, and replacing invisible cron behavior with visible service status.

### Why it matters

The blueprint identifies operational fragility from undocumented exposure, root-run automation, scattered logs, unknown restore status, and kind/GitLab resource pressure.

### Exact tasks

1. Create an ingress policy document.
   - Suggested path: `/root/.openclaw/workspace/operations/docs/ingress-policy.md`
   - Classify each service as public, tunnel-only, localhost-only, or container-only.
2. Add Cloudflare Access or equivalent policy to:
   - dashboard
   - n8n
   - GitLab
   - Kubernetes admin hostnames
3. Install/configure fail2ban for SSH and optionally nginx.
4. SSH hardening:
   - Current blueprint fact: `PermitRootLogin yes`, key-only auth, `X11Forwarding yes`.
   - Target: named sudo-capable admin user, then `PermitRootLogin no`.
   - Set `X11Forwarding no` unless required.
5. Secrets and permissions:
   - Fix the blueprint-cited Hermes backup `.env` mode from `0644` to `0600` or remove/reencrypt if obsolete.
   - Inventory `.env` files under `/root/.hermes`, `/root/.openclaw`, n8n, workspaces, and backups.
   - Rotate secrets only after mapping dependents.
6. Convert the highest-value cron jobs to systemd timers one at a time:
   - Hermes bridge.
   - runtime backup.
   - health refresh.
   - GitHub issue sync.
   - research pipelines.
7. Add job status files:
   - Suggested runtime path: `/root/.openclaw/runtime/operations/jobs`
   - Include `job_id`, `started_at`, `finished_at`, `exit_code`, `duration_ms`, `last_success_at`, `log_ref`.
8. Resource pressure decisions:
   - Decide whether kind/Kubernetes must run continuously.
   - If not continuous, document `start-lab`/`stop-lab` and stop by default.
   - Add memory/CPU limits for Tika and `ki-werkstatt` APIs.
9. Backup restore matrix:
   - GitLab
   - n8n
   - OpenClaw runtime
   - Hermes
   - pgvector
   - Chroma
   - kind etcd

### Dependencies

- Cloudflare account access.
- Package install permission for fail2ban.
- Owner decision on root SSH policy and kind availability.
- Restore media and credentials.

### Rollback concerns

- Cloudflare Access misconfiguration can lock out admin; keep SSH fallback.
- SSH root disablement requires tested named admin sudo login first.
- Timer migration can skip jobs; keep cron disabled only after timer proves last-success.
- Stopping kind can break Kubernetes lab hostnames.

### Validation checks

- `fail2ban-client status sshd` works after installation.
- SSH login with named admin works before disabling root login.
- `systemctl --user list-timers --all` shows migrated jobs.
- Job status files update on each run.
- `docker stats --no-stream` shows resource limits taking effect.
- Restore matrix has at least one tested restore path or explicit untested flag per data store.

### Success criteria

- Ingress policy matches actual `ss`, Docker, Cloudflare, nginx, and firewall state.
- Cron is no longer the only visibility path for critical jobs.
- Resource-heavy services have documented ownership and limits.
- Backup recoverability is visible, not assumed.

## 6. Phase 3: Structural Improvements This Month

### Objective

Reduce state divergence, root-run risk, retry storms, and AI workflow cost while preserving the simple single-VPS operating model.

### Why it matters

The target architecture already says canonical task JSON is durable state and dashboard SQLite is projection. The blueprint’s medium-term items focus on making this true in code and operations.

### Exact tasks

1. Dedicated service users:
   - `openclaw` for OpenClaw gateway/node where feasible.
   - `rook-dashboard` for dashboard.
   - `hermes` for Hermes runtime and bridge.
   - `rook-backup` for backup jobs.
2. File permission migration:
   - Grant each service user only required paths.
   - Keep secrets readable only by owning service.
   - Avoid broad `/root` access for long-running services.
3. Canonical task state enforcement:
   - Durable source: `/root/.openclaw/workspace/operations/tasks`
   - Runtime overlays: `/root/.openclaw/runtime/operations/task-state`
   - Archive: prefer `/root/.openclaw/runtime/operations/archive/tasks` for mutable runtime archive and Git-backed archive for reviewed history.
   - Dashboard SQLite: cache/projection only, rebuildable from canonical files.
4. Add task lease/idempotency model:
   - `lease_owner`
   - `lease_until`
   - `attempt`
   - `idempotency_key`
   - `previous_status`
   - `next_status`
   - `actor`
   - `reason`
5. Add capped retry/backoff policy:
   - Max attempts per task.
   - Max tool iterations per run.
   - Timeout per job type.
   - Explicit blocked/failure state after exhaustion.
6. Build operational status snapshot:
   - service state
   - timer state
   - backup freshness
   - exposure snapshot
   - disk/memory/swap
   - task queue counts
   - failed task count
   - model usage summary
7. AI workflow efficiency:
   - Model routing by task risk.
   - No LLM for deterministic checks.
   - Context budgets and retrieval caps.
   - Structured outputs for task updates and handoffs.
8. Upstream compatibility guardrails:
   - Document local OpenClaw customizations.
   - Add diff/check scripts or upgrade notes before pulling upstream changes.

### Dependencies

- Code changes in dashboard/dispatcher/task handling.
- Tests or integrity checkers for task projection rebuild.
- Careful permission audit before service user migration.

### Rollback concerns

- Service user migration can break file access; rollback by restoring original unit files and permissions.
- Task-state migration can hide tasks if projection/rebuild has bugs; keep pre-migration task snapshot.
- Lease logic can deadlock tasks if expiry/recovery is wrong; include lease expiry and manual unlock command.

### Validation checks

- Dashboard rebuilds from canonical JSON after deleting a test projection DB copy.
- Two workers cannot claim the same task lease.
- Expired lease can be reclaimed.
- Failed task reaches blocked/failure state after max attempts.
- Status snapshot can be generated without LLM calls.
- Services start under dedicated users and cannot read unrelated secrets.

### Success criteria

- One clear durable task source of truth exists.
- Agent execution is idempotent and lease-bound.
- Root is no longer the default runtime identity for long-running services.
- Operators get a single daily status artifact.

## 7. Phase 4: Optional Strategic Redesign

### Objective

Only after the single-VPS design is clean, decide whether deeper redesign is justified.

### Why it matters

The blueprint explicitly recommends not splitting to multiple VPSs until exposure, state, and recovery are clean.

### Exact tasks

1. Replace ad hoc polling/cron reactions with event/task queue semantics where the lease model proves useful.
2. Keep OpenClaw as operational brain and Hermes as private reflection/care system behind narrow bridge API.
3. Move kind/Kubernetes or GitLab to a separate VPS only if measured resource pressure remains high after swap, limits, and on-demand lab mode.
4. Consider a plugin/adaptor boundary for external/community additions instead of direct integration.
5. Expand dashboard observability only after data model and collection paths are stable.

### Dependencies

- Phase 1-3 metrics.
- Restore confidence.
- Clear owner decision on cost and complexity.

### Rollback concerns

- Distributed infrastructure increases failure modes.
- Queue redesign can complicate recovery if the durable state model is not already clean.

### Validation checks

- Compare one month of resource and incident data before/after.
- Demonstrate restore drills.
- Confirm no state divergence in task model.

### Success criteria

- Any new infrastructure solves a measured problem, not a guessed one.
- Operational complexity does not increase without clear reliability/security benefit.

## 8. Recommendation-by-Recommendation Action Table

| Priority | Goal | Exact implementation action | Affected components | Expected benefit | Risk | Rollback | Validation |
|---|---|---|---|---|---|---|---|
| must-do | Close public internal ports | Rebind `ki-werkstatt` ports to `127.0.0.1` or remove host `ports` | `ki-werkstatt` compose, Docker | Removes critical DB/queue/parser/API exposure | Medium | Restore compose and `docker compose up -d` | `ss`, `docker ps`, external `nmap` |
| must-do | Remove dashboard bypass | Bind dashboard to `127.0.0.1:3001`; remove iptables `3001 ACCEPT` after tunnel validation | `rook-dashboard.service`, start script, iptables | Single admin ingress path | Medium | Revert host bind and firewall rule | local curl, tunnel test, external scan |
| must-do | Reduce OOM fragility | Add 12 GiB swap and `vm.swappiness=10` | host kernel, `/etc/fstab`, sysctl | Avoid abrupt OOM on spikes | Low | `swapoff`, remove fstab/sysctl/swapfile | `free -h`, kernel logs |
| must-do | Prove exposure state | Capture before/after `ss`, Docker ports, iptables, UFW, external scan | host/network | Prevents false confidence | Low | read-only | saved snapshots |
| must-do | Define ingress policy | Create `operations/docs/ingress-policy.md` | ops docs | Prevents accidental re-exposure | Low | edit doc | matches actual scans |
| must-do | Protect admin hostnames | Add Cloudflare Access/equivalent | Cloudflare, dashboard, n8n, GitLab, k8s hostnames | Auth/audit for admin UIs | Medium | remove/revert policy | browser/login tests |
| should-do | Prevent cron overlap | Add `flock` to remaining cron entries | crontab/scripts | Reduces duplicate work | Low | restore crontab | concurrent run test |
| should-do | Make jobs visible | Migrate cron jobs to systemd timers | systemd user units | Last-success/failure visibility | Medium | re-enable cron snapshot | `systemctl --user list-timers`, journal |
| should-do | Reduce SSH noise | Install fail2ban for SSH | host packages, fail2ban config | Brute-force dampening | Low | stop/disable fail2ban | `fail2ban-client status sshd` |
| should-do | Reduce SSH blast radius | Create named admin, disable root SSH, disable X11 if unused | sshd config | Less direct root compromise risk | Medium | restore sshd config via console/active session | new login and sudo test |
| should-do | Fix secrets sprawl | Inventory env files; chmod unsafe backups; rotate mapped secrets | `/root/.hermes`, `/root/.openclaw`, backups, n8n | Lower leak blast radius | Medium | restore secret values from secure backup | permission scan, service tests |
| should-do | Lower baseline load | Make kind on-demand if not required | Docker/kind, Cloudflare k8s routes | Frees RAM/CPU | Medium | restart kind workflow | `docker stats`, route tests |
| should-do | Bound service memory | Add Docker memory/CPU limits for Tika/APIs | compose files | Limits parser/API spikes | Low-Medium | remove limits and recreate | load smoke test, `docker stats` |
| should-do | Make backups recoverable | Build restore matrix and run drills | GitLab, n8n, OpenClaw, Hermes, pgvector, Chroma, kind etcd | Recovery confidence | Low-Medium | docs-only unless drills change staging | restore evidence |
| should-do | Reduce root-run risk | Move services to dedicated users | systemd units, file ownership | Containment | Medium-High | restore original units/ownership | services start and access is constrained |
| should-do | Enforce task truth | Make canonical JSON durable, SQLite projection only | operations tasks, dashboard | Removes state conflict | Medium | restore DB/task snapshot | projection rebuild test |
| should-do | Prevent duplicate agent execution | Add lease/idempotency metadata | dispatcher/task-state/dashboard API | Fewer duplicate actions | Medium | disable lease claim path | concurrent claim test |
| should-do | Reduce model cost/loops | Add model routing, context budgets, stopping conditions | agent prompts/configs/workflows | Lower token usage and drift | Medium | revert config | run metadata and token summaries |
| nice-to-have | Improve operator UX | Dashboard page for services/jobs/backups/model usage | rook-dashboard | Faster triage | Low-Medium | hide/revert page | UI/API smoke tests |
| nice-to-have | Increase isolation | Move GitLab/kind to another host only if metrics justify | infrastructure | Better isolation | High | DNS/service rollback plan | measured month-over-month resource data |

## 9. Security Hardening Plan

### Public port reduction

- Treat only SSH `6262` and HTTP/HTTPS ingress as public unless explicitly approved.
- Remove public Docker publishing for Postgres/pgvector, NATS, Tika, and internal FastAPI services.
- Validate with both local and external scans because UFW can be bypassed by Docker iptables forwarding.

### Localhost-only bindings

- Bind dashboard to `127.0.0.1:3001` when Cloudflare Tunnel terminates locally.
- Keep OpenClaw gateway, Hermes bridge endpoints, and dashboard backend local unless a documented authenticated ingress exists.
- Bind `ki-werkstatt` host-published ports to localhost only if host access is needed.

### Tunnel-only/admin access

- Use Cloudflare Tunnel as the preferred admin path for dashboard, n8n, GitLab, and Kubernetes admin surfaces.
- Add Cloudflare Access or equivalent identity policy.
- Keep SSH as emergency fallback.

### Firewall cleanup

- Remove direct `3001 ACCEPT` rule after tunnel validation.
- Persist firewall changes through the current host persistence mechanism.
- Add recurring exposure checks to detect drift.

### SSH hardening

- Keep key-only authentication.
- Create/test named sudo admin before disabling root login.
- Target `PermitRootLogin no`.
- Set `X11Forwarding no` unless explicitly required.
- Keep `MaxAuthTries 3`.

### fail2ban

- Install fail2ban or equivalent.
- Start with SSH jail.
- Consider nginx jail if logs and routes support useful matching.

### Root-run service reduction

- Phase migration:
  1. Add documentation and file access map.
  2. Move dashboard to a dedicated user.
  3. Move Hermes bridge/gateway to dedicated user if file paths permit.
  4. Move OpenClaw gateway/node after config/secrets permissions are clear.
  5. Move backups to a narrow backup user.

### Secrets/file permission cleanup

- Fix the blueprint-cited Hermes backup `.env` with mode `0644`.
- Inventory `.env` and backup snapshots.
- Rotate secrets only after mapping dependents.
- Keep secret backups encrypted or permissioned `0600`.
- Redact tokens from logs and reports.

### Safer shell/tool execution boundaries

- Require human approval for destructive shell, firewall, DNS, secret, backup deletion, and production restart actions.
- Audit shell/tool actions with actor, command class, reason, and result.
- Avoid turning Codex into a background scheduler.

### Audit logging improvements

- Preserve journald logs for systemd services.
- Add structured job status files.
- Log task transitions with actor, previous state, next state, reason, and idempotency key.

## 10. Performance and Reliability Plan

### Swap and memory guardrails

- Add 12 GiB swap now.
- Monitor swap usage; swap is a safety net, not a capacity plan.
- Add memory pressure indicators to daily status snapshots.

### Resource-heavy services

- GitLab and kind are confirmed major consumers.
- Hermes gateway is also observed locally using significant memory.
- Measure before moving anything off-host.

### kind/Kubernetes decisions

- If not required continuously, stop kind by default and document start/stop.
- If required continuously, add resource budgets and explicit ownership.
- Keep Kubernetes as a lab, not a second production orchestrator on this VPS, unless the platform intentionally migrates there.

### Docker memory/cpu limits

- GitLab already has a memory limit per blueprint.
- Add limits to Tika and `ki-werkstatt` API services.
- Keep limits conservative enough to avoid breaking expected workloads.

### Queue/lease design

- Use a lightweight local queue first.
- Canonical task JSON remains durable source.
- Runtime lease overlay tracks claim/attempt state.
- Every worker claim must be idempotent and expire.

### Cron-to-systemd migration

- Add `flock` first.
- Convert one job at a time.
- Use `WorkingDirectory`, `EnvironmentFile`, `Restart`, timeout, and journald logging.
- Disable cron only after timer produces expected last-success status.

### Duplicate work prevention

- Add task leases.
- Add idempotency keys to task mutations.
- Add max attempts and blocked state.
- Avoid independent systems reacting to the same task without a clear owner.

### Timeout/retry policy improvements

- Define timeout per job class.
- Use capped exponential backoff.
- Stop after max attempts.
- Escalate to human review with reason and logs.

### Health checks and restart strategy

- Keep systemd `Restart` for long-running services.
- Add health snapshots that include service state, last run, last success, memory, swap, and queue depth.
- Prefer explicit failure over silent retry loops.

## 11. Hermes/OpenClaw Architecture Improvement Plan

### System boundaries

- OpenClaw/Rook: operational orchestration, execution, delivery, task lifecycle, dashboard.
- Hermes/Phoenix: private reflective/care/creative system.
- Codex: interactive privileged maintainer/operator tool.
- n8n: automation client.
- `ki-werkstatt`: internal AI/document stack.
- GitLab: source/build service.
- kind/Kubernetes: lab environment.

### Source of truth for task state

- Durable operational truth: `/root/.openclaw/workspace/operations/tasks`.
- Runtime overlays: `/root/.openclaw/runtime/operations/task-state`.
- Archives: runtime archive for mutable operational archive; Git-backed archive for reviewed history.

### Dashboard/database vs canonical JSON state

- Dashboard SQLite is a cache/projection.
- Dashboard must be rebuildable from canonical JSON.
- Mutations should write canonical task JSON or go through an API that does.

### Hermes bridge role

- Hermes may submit structured events/tasks to OpenClaw.
- Hermes should not silently share private memory/state.
- Bridge contract should define allowed payloads, classification, auth, and mutation scope.

### Agent execution model

- Preferred workflow where applicable: `research -> engineer -> test -> review -> done`.
- Rook is orchestrator and intake owner.
- Specialists execute bounded work against explicit tasks.
- Execution claims must be lease-bound and idempotent.

### Planner/executor pattern

- Planner creates or refines tasks, dependencies, acceptance criteria, and risk labels.
- Executor acts only on claimed task scope.
- Reviewer/test role verifies before done/merge.

### Event/task queue direction

- Start with JSON task leases and runtime overlays.
- Move to a stronger queue only if local lease model proves insufficient.
- Avoid adding NATS/Postgres as a new control-plane dependency until exposure and state are clean.

### Long-term state simplification

- One durable task source.
- One runtime overlay model.
- One dashboard projection.
- One bridge contract.
- Fewer ad hoc archives and duplicate workspaces used for active state.

## 12. AI Agent / Aigen Optimization Plan

### Prompt design

- Separate role, task, constraints, available state, and required output.
- Keep system boundaries explicit: Hermes private, OpenClaw operational.
- Use structured handoffs.

### Context size discipline

- Retrieval by task scope, not full workspace context.
- Cap retrieved documents.
- Summarize long histories into task-local state.
- Avoid 20k+ token recurring cron prompts where deterministic checks would suffice.

### Model routing policy

- No LLM: health checks, exposure scans, backup freshness, schema validation, git status, deterministic summaries.
- Small/cheap model: triage, classification, title cleanup, checklist expansion.
- Mid model: ordinary implementation planning and straightforward code edits.
- Strong model: architecture, security-sensitive changes, migrations, incident analysis, shell/tool policy.

### Tool usage discipline

- Prefer deterministic tools for filesystem, git, systemd, Docker, and logs.
- Record tool actions in run metadata.
- Avoid repeating expensive inspections when a fresh snapshot exists.

### Retries/stopping conditions

- Max retries per provider.
- Max tool iterations per task.
- Max runtime per job type.
- Stop on repeated identical failure and mark blocked.

### Structured outputs

- Task updates should include status, actor, evidence, next action, and artifacts.
- Reports should include findings, actions, validation, open risks, and next steps.

### Idempotency

- Every state mutation should include an idempotency key.
- Re-running a bridge/timer must not duplicate task creation or delivery.

### Human approval gates

- Require approval for firewall, DNS, public exposure, secret rotation, destructive file operations, production restarts, and backup deletion.

### Memory strategy

- Hermes memory stays private unless explicitly released.
- OpenClaw operational memory is task/state centered.
- Do not silently import reflective context into operational tasks.

### Observability for agent runs

- Record model, input/output token counts, tool count, duration, exit status, task id, and final state.
- Include model cost visibility where provider data is available.

## 13. Observability and Operations Plan

### journald/docker log strategy

- systemd services log to journald.
- Docker services keep Docker logs with rotation.
- Critical timer jobs expose latest status files.
- Redact secrets from logs.

### Status snapshots

- Generate `/root/.openclaw/runtime/operations/status/latest.json`.
- Include services, timers, backups, exposure, resources, tasks, failed jobs, and model usage.

### Metrics/dashboard strategy

- Start with data model and collection before UI polish.
- Dashboard should show real system state, not only display task cards.
- Keep Kubernetes telemetry optional for host/agent health.

### Backup freshness checks

- Track last successful backup per data store.
- Track restore-tested date.
- Flag untested backups explicitly.

### Service health visibility

- Use `systemctl --user` for OpenClaw/Hermes/dashboard/timers.
- Use Docker status for GitLab, n8n, `ki-werkstatt`, kind.
- Use simple endpoint checks only where auth and localhost paths are clear.

### Incident response basics

- Keep runbooks for:
  - public exposure incident
  - dashboard inaccessible
  - OOM/resource pressure
  - failed backup
  - task queue stuck
  - Hermes/OpenClaw bridge loop
  - secret leak/rotation

### Operational runbooks

- Put runbooks under `/root/.openclaw/workspace/operations/docs/runbooks`.
- Each runbook should include symptoms, commands, rollback, validation, and escalation.

## 14. Validation and Rollback Plan

### Network/public exposure changes

- Validate:
  - `ss -tulpn`
  - `docker ps`
  - `iptables -S`
  - `ufw status verbose`
  - external `nmap`
- Monitor:
  - Postgres auth failures disappear.
  - No unexpected dashboard access errors.
  - Cloudflare access logs.
- Rollback:
  - Restore previous compose/service/firewall snapshots.
  - Reapply Docker/systemd.
  - Reopen only the minimum emergency path.

### Swap/resource changes

- Validate:
  - `free -h`
  - `/proc/swaps`
  - `sysctl vm.swappiness`
  - kernel OOM log check.
- Monitor:
  - sustained swap usage
  - memory pressure
  - GitLab/kind/Hermes memory trends.
- Rollback:
  - `swapoff /swapfile`
  - remove fstab/sysctl entries.

### Cron/systemd migration

- Validate:
  - timer listed and scheduled
  - service exits correctly
  - journal includes expected output
  - status file updates
- Monitor:
  - missed runs
  - duplicate runs
  - exit codes.
- Rollback:
  - disable timer
  - restore cron entry from snapshot.

### Service-user migration

- Validate:
  - services start
  - services can read required config and write required state
  - services cannot read unrelated secret paths.
- Monitor:
  - permission errors in journald
  - missing writes
  - restart loops.
- Rollback:
  - restore original unit files and ownership.

### Task state/lease changes

- Validate:
  - schema checks pass
  - projection rebuild works
  - concurrent claims fail safely
  - expired lease recovery works.
- Monitor:
  - stuck tasks
  - duplicate attempts
  - task-state corruption.
- Rollback:
  - restore task snapshot
  - disable lease enforcement path
  - rebuild dashboard projection from canonical JSON.

### AI workflow changes

- Validate:
  - run metadata records model/token/tool counts
  - retry limits trigger blocked state
  - no-LLM deterministic jobs still work.
- Monitor:
  - token volume
  - repeated failures
  - tool loop counts.
- Rollback:
  - restore previous prompts/configs
  - keep hard approval gates for dangerous actions.

## 15. Critical Unknowns

1. Which services, if any, must be reachable from the public Internet without Cloudflare Access or VPN?
2. Are there external clients depending on public `ki-werkstatt` ports `5432`, `4222`, `9998`, or `8080-8083`?
3. Is kind/Kubernetes required continuously, or can it be stopped by default and started only for lab work?
4. Which backup set has been restored end-to-end in the last 30 days?
5. What is the intended Hermes/OpenClaw contract: task creation only, status sync, memory sync, or bidirectional control?
6. Where is the active firewall persistence mechanism for the direct `3001` rule?
7. Does Cloudflare Access already protect dashboard, n8n, GitLab, and Kubernetes admin hostnames?

## 16. Final Recommended Order of Execution

1. Capture Phase 0 snapshots.
   - Reason: every later rollback depends on knowing the exact starting state.
2. Confirm whether public `ki-werkstatt` ports are intentionally used.
   - Reason: rebinding is urgent but could break unknown external clients.
3. Rebind/remove public `ki-werkstatt` ports and validate externally.
   - Reason: this is the most critical confirmed attack surface.
4. Verify Cloudflare dashboard access/auth, bind dashboard to localhost, remove direct `3001` rule, and validate externally.
   - Reason: closes the second major ingress path without losing admin access.
5. Add swap and check kernel logs.
   - Reason: low-risk immediate reliability improvement for a crowded single VPS.
6. Add `flock` to highest-frequency cron jobs.
   - Reason: prevents overlap while preserving current behavior.
7. Write ingress policy and compare it to actual scans.
   - Reason: prevents drift and makes future exposure decisions explicit.
8. Install fail2ban and begin SSH hardening, but disable root SSH only after a named sudo admin path is tested.
   - Reason: improves security without risking lockout.
9. Decide kind always-on vs on-demand, then apply the simplest resource reduction.
   - Reason: kind is a confirmed high resource consumer.
10. Convert critical cron jobs to systemd timers one at a time with status files.
    - Reason: improves reliability and observability while keeping rollback simple.
11. Build backup restore matrix and run one restore drill per critical data store.
    - Reason: backup existence is not recovery.
12. Implement task lease/idempotency and dashboard projection rebuild validation.
    - Reason: reduces duplicate agent work after operational basics are safe.
13. Move services from root to dedicated users.
    - Reason: valuable containment, but should follow path/secret mapping.
14. Add AI model routing, context budgets, structured run metadata, and approval gates.
    - Reason: improves cost and safety once execution state is observable.
15. Evaluate separate VPS or deeper event queue redesign only after one month of metrics.
    - Reason: the simplest architecture that solves the problem is a hardened, observable single VPS first.

## Lagebild

The current Hermes + OpenClaw VPS is a live multi-agent platform with multiple orchestration layers. OpenClaw/Rook is intended to own operational state through canonical JSON under `workspace/operations/tasks`; the dashboard is the human UI and SQLite projection; Hermes is separate and should integrate only through an explicit bridge. Public exposure and resource pressure are the immediate risks.

## Befunde

The blueprint’s highest-confidence findings are public Docker-published internal services, direct dashboard exposure on `3001`, root-run automation, no swap under high memory load, and fragmented operations. Local service inspection confirmed dashboard currently starts with `ROOK_DASHBOARD_HOST=0.0.0.0` and Hermes/OpenClaw/dashboard are user systemd services under root’s user manager.

## Arbeitsplan

Execute in strict order: baseline snapshots, close public internal ports, close dashboard bypass, add swap, lock cron jobs, document ingress, add fail2ban/SSH hardening, reduce kind pressure, migrate cron to timers, validate backups, then improve task leases and AI workflow controls.

## Umgesetzte Änderungen

Implemented during this session:

- `/root/.openclaw/workspace/operations/docs/reports/2026-05-31_optimization-execution-plan_hermes-openclaw-vps.md`
- `/root/.openclaw/workspace/engineering/ki-werkstatt/infra-live/compose/docker-compose.yml`
- `/root/.config/systemd/user/rook-dashboard.service`

- `ki-werkstatt` host-published ports were rebound from `0.0.0.0`/`[::]` to `127.0.0.1` for `5432`, `4222`, `9998`, `8080`, `8081`, `8082`, and `8083`.
- `rook-dashboard.service` was changed from `ROOK_DASHBOARD_HOST=0.0.0.0` to `ROOK_DASHBOARD_HOST=127.0.0.1`.
- The dashboard service was reloaded and restarted under the root user session so the new bind took effect.
- The direct public iptables accept rule for TCP `3001` was removed.
- A 12 GiB `/swapfile` was created, enabled, and added to `/etc/fstab`.
- `vm.swappiness=10` was written to `/etc/sysctl.d/99-local-swap.conf` and applied with `sysctl --system`.

## Validierung

Validation performed:

- `docker compose ... config` confirmed the new `127.0.0.1` host bindings in the composed model.
- `docker compose ... up -d` recreated the `ki-werkstatt` containers successfully.
- `systemctl --user status rook-dashboard.service` confirmed the live dashboard process is now started with `--hostname 127.0.0.1 --port 3001`.
- `ss -ltnp` confirmed `127.0.0.1` listeners for `3001`, `5432`, `4222`, `9998`, `8080`, `8081`, `8082`, and `8083`.
- `docker ps` confirmed the published ports are now localhost-only.
- `iptables -S` confirmed the direct `INPUT` accept rule for `3001` was removed.
- `free -h` and `swapon --show` confirmed swap is active and sized at 12 GiB.
- `sysctl --system` applied `vm.swappiness=10`; unrelated sysctl warnings appeared for pre-existing keys during the global reload, but the local swap setting did apply.
- A local `curl http://127.0.0.1:3001` attempt from this sandbox failed to connect, so loopback reachability from the sandbox is still not a clean validation signal here even though systemd and socket state show the service bound correctly.

## Nächste Schritte

Continue with Phase 1 and Phase 2:

1. Add swap and memory guardrails.
2. Create the ingress policy document.
3. Add Cloudflare Access or equivalent policy to admin hostnames.
4. Install fail2ban.
5. Add `flock` and begin cron-to-systemd migration.
6. Work through secrets and service-user cleanup.
