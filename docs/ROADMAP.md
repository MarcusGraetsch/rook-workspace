# Roadmap

> Status: Prioritized after initial task-system and health-system stabilization

## Quick Wins

### 1. Remove `/tasks` as a user-facing primary surface

Why:

- Kanban is now the real task UI
- `/tasks` duplicates concepts and creates confusion

Benefit:

- one coherent user workflow

Complexity: low
Risk: low

### 2. Add GitHub issue state directly to more Kanban interactions

Why:

- GitHub sync is now part of the normal workflow

Benefit:

- less context switching

Complexity: low
Risk: low

### 3. Add branch and commit fields to Kanban modal and task editing

Why:

- task-to-code linkage still exists mostly in canonical JSON

Benefit:

- better execution traceability

Complexity: medium
Risk: low

## Stability Fixes

### 4. Finish heartbeat decommissioning

Why:

- old `HEARTBEAT.md` assumptions and scripts still exist in the repo set

Benefit:

- less confusion and fewer false recovery paths

Complexity: medium
Risk: low

Dependencies:

- structured health snapshots already exist

### 5. Clean up remaining legacy dashboard routes

Why:

- some older routes still reflect pre-stabilization gateway assumptions

Benefit:

- fewer runtime surprises

Complexity: medium
Risk: medium

### 6. Add dashboard-side sync retry and clearer failure surfaces

Why:

- GitHub sync and health sync should degrade visibly, not silently

Benefit:

- better operational trust

Complexity: medium
Risk: low

## Structural Refactors

### 7. Normalize the role workspaces

Why:

- `workspace-engineer`, `workspace-researcher`, `workspace-coach`, and `workspace-consultant` are still awkward local-only artifacts

Benefit:

- lower drift and clearer recovery

Complexity: high
Risk: medium

Options:

- make them real tracked repos
- or convert them to generated runtime workspaces from tracked templates

### 8. Move more runtime truth into `rook-workspace/operations`

Why:

- task and health state are there now, but run and coordination history are still fragmented

Benefit:

- stronger disaster recovery

Complexity: high
Risk: medium

## Agent Improvements

### 9. Formalize `dashboard-sync`

Why:

- the sync work now exists in code but not yet as a clearly defined system role

Benefit:

- clearer ownership for projection and reconciliation

Complexity: medium
Risk: low

### 10. Treat review/test/devops as workflow modes

Why:

- permanent idle pseudo-agents add noise without delivering value

Benefit:

- leaner execution model

Complexity: low
Risk: low

## Dashboard Evolution

### 11. Add repo activity and PR visibility

Why:

- tasks now sync to issues, but branch/commit/PR visibility is still missing from the control plane

Benefit:

- better end-to-end execution visibility

Complexity: high
Risk: medium

### 12. Add task dependency and blocked-state views

Why:

- multi-agent workflows need more than flat columns

Benefit:

- better orchestration and reduced hidden blockers

Complexity: medium
Risk: low

## Discord Redesign

### 13. Document the new Discord policy in-repo

Why:

- the runtime config has been corrected, but the operating model should be explicit

Benefit:

- less future drift

Complexity: low
Risk: low

### 14. Standardize status message formats

Why:

- structured human-readable updates improve reliability

Benefit:

- clearer notifications and easier automation later

Complexity: low
Risk: low

## Security and Recovery

### 15. Move secrets out of tracked config

Why:

- the current posture is not safe enough for a growing multi-agent system

Benefit:

- lower operational risk

Complexity: medium
Risk: medium

### 16. Write full disaster recovery runbook

Why:

- the system is closer to recoverable, but the exact restore sequence is not yet documented

Benefit:

- real operational resilience

Complexity: medium
Risk: low

## Recommended Execution Order

1. Remove task-surface duplication and strengthen Kanban metadata.
2. Finish heartbeat decommissioning and legacy route cleanup.
3. Document Discord policy and dashboard-sync role.
4. Add branch/commit/PR visibility.
5. Normalize role workspaces.
6. Move secrets out of tracked config.
7. Write disaster recovery runbook.


## Kubernetes Lab (2026-04-21)

### 17. Kubernetes Lab aufbauen

Why:

- KI-Agenten als GitOps-Engine für Kubernetes erforschen
- Beratungs-Kompetenz durch praktische Erfahrung differenzieren
- Showcases für Cloud-native Kunden bauen

Benefit:

- Echte Kubernetes-GitOps-Experience mit Rook als Operator
- Forschung: "Kann ein Agent Kubernetes sicher betreiben?"
- Lokale Entwicklungsumgebung ohne Cloud-Kosten

Structure:

- `engineering/kubernetes-lab/` — kind-Cluster, Flux/ArgoCD, Sample Apps
- `skills/rook-custom/` — Custom Skills für Kubernetes-Interface
- Neues GitHub Repo `rook-k8s-lab`

Complexity: medium
Risk: low

Dependencies:

- kind, kubectl, Flux installieren
- Erste Cluster-Config und GitOps-Pipeline
- Rook kann mit kubectl sprechen

### 18. Trennung Engineering / Research / Content

Why:

- Engineering (kubernetes-lab, rook-dashboard, metrics-collector) ≠ Content (Buch, Research, Website)
- Klare Zuständigkeit für GitHub-Repos und Cron-Jobs

Benefit:

- Keine Vermischung mehr
- Eigenständige GitHub-Repos pro Bereich

Complexity: medium
Risk: low
