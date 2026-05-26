#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_ROOT="/root/.openclaw"
WORKSPACE_ROOT="$OPENCLAW_ROOT/workspace"
OPS_ROOT="$WORKSPACE_ROOT/operations"
REPORT_DIR="$OPS_ROOT/docs/reports"
STAMP="$(date '+%Y-%m-%d_%H-%M-%S')"
REPORT_FILE="$REPORT_DIR/${STAMP}_vm-ops-baseline.md"

mkdir -p "$REPORT_DIR"

append() {
  printf '%s\n' "$1" >> "$REPORT_FILE"
}

run_capture() {
  local title="$1"
  shift
  append "### $title"
  append '```text'
  if "$@" >> "$REPORT_FILE" 2>&1; then
    :
  else
    printf 'command failed (exit %s): %s\n' "$?" "$*" >> "$REPORT_FILE"
  fi
  append '```'
  append ""
}

repo_block() {
  local repo="$1"
  append "### Repo: $repo"
  append '```text'
  if [ -d "$repo/.git" ]; then
    git -C "$repo" status --short --branch >> "$REPORT_FILE" 2>&1 || true
    git -C "$repo" remote -v >> "$REPORT_FILE" 2>&1 || true
  else
    printf 'missing git repo: %s\n' "$repo" >> "$REPORT_FILE"
  fi
  append '```'
  append ""
}

append "# VM Ops Baseline"
append ""
append "- timestamp: $(date --iso-8601=seconds)"
append "- hostname: $(hostname)"
append "- generated_by: operations/bin/vm-ops-baseline.sh"
append ""

append "## Host"
run_capture "Disk" df -h
run_capture "Top Memory Directories (/root)" bash -lc "du -sh /root/.openclaw /root/.hermes /root/rook-phoenix-comm 2>/dev/null || true"
run_capture "Crontab" crontab -l

append "## Git Posture"
repo_block "/root/.openclaw/rook-agent"
repo_block "/root/.openclaw/workspace"
repo_block "/root/.openclaw/workspace-main"
repo_block "/root/.hermes"
repo_block "/root/rook-phoenix-comm"
repo_block "/root/sync-bridge"

append "## OpenClaw Control Plane Checks"
run_capture "Runtime Posture JSON" node "$OPS_ROOT/bin/check-runtime-posture.mjs"
run_capture "Control Plane JSON" node "$OPS_ROOT/bin/check-runtime-control-plane.mjs"
run_capture "Canonical Task Integrity JSON" node "$OPS_ROOT/bin/check-canonical-task-integrity.mjs"

append "## Rook-Phoenix Bridge Signals"
run_capture "Bridge Tree Summary" find /root/rook-phoenix-comm -maxdepth 2 -type d
run_capture "Bridge Message Counts" bash -lc "printf 'inbox=%s\noutbox=%s\ndiscussions=%s\nresponses=%s\narchive=%s\n' \"\$(find /root/rook-phoenix-comm/inbox -type f | wc -l)\" \"\$(find /root/rook-phoenix-comm/outbox -type f | wc -l)\" \"\$(find /root/rook-phoenix-comm/discussions -type f | wc -l)\" \"\$(find /root/rook-phoenix-comm/responses -type f | wc -l)\" \"\$(find /root/rook-phoenix-comm/archive -type f | wc -l)\""

append "## Next Actions Template"
append "- Review repos with dirty state and decide what must be committed, archived, or ignored."
append "- If runtime posture checks degrade, inspect corresponding scripts/logs before restart actions."
append "- Keep this report in git history as operational memory."
append ""

printf 'Baseline report written: %s\n' "$REPORT_FILE"
