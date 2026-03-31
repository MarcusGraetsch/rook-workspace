#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/root/.openclaw"
CANONICAL_WORKSPACE="${ROOT_DIR}/workspace"

link_repo_views() {
  local agent_workspace="$1"
  local sandbox_root="${agent_workspace}/workspace"

  mkdir -p "${sandbox_root}/tasks"

  ln -sfn "${CANONICAL_WORKSPACE}" "${sandbox_root}/rook-workspace"
  ln -sfn "${CANONICAL_WORKSPACE}/operations" "${sandbox_root}/operations"
  ln -sfn "${CANONICAL_WORKSPACE}/engineering/rook-dashboard" "${sandbox_root}/rook-dashboard"
  ln -sfn "${CANONICAL_WORKSPACE}/engineering/metrics-collector" "${sandbox_root}/metrics-collector"
  ln -sfn "${CANONICAL_WORKSPACE}/projects/digital-research" "${sandbox_root}/digital-research"
  ln -sfn "${CANONICAL_WORKSPACE}/projects/critical-theory-digital" "${sandbox_root}/critical-theory-digital"
  ln -sfn "${CANONICAL_WORKSPACE}/projects/working-notes" "${sandbox_root}/working-notes"
}

link_repo_views "${ROOT_DIR}/workspace-engineer"
link_repo_views "${ROOT_DIR}/workspace-researcher"
