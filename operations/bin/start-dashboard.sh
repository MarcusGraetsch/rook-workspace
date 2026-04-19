#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/root/.openclaw/workspace/engineering/rook-dashboard"
HOST="${ROOK_DASHBOARD_HOST:-127.0.0.1}"
PORT="${ROOK_DASHBOARD_PORT:-3001}"

cd "$ROOT_DIR"

log() {
  echo "start-dashboard: $*" >&2
}

if [[ ! -d node_modules ]]; then
  echo "node_modules missing in $ROOT_DIR" >&2
  exit 1
fi

build_is_complete() {
  local required_files=(
    ".next/BUILD_ID"
    ".next/build-manifest.json"
    ".next/required-server-files.json"
    ".next/routes-manifest.json"
    ".next/prerender-manifest.json"
    ".next/server/app-paths-manifest.json"
  )

  local file
  for file in "${required_files[@]}"; do
    if [[ ! -s "$file" ]]; then
      log "missing build artifact: $file"
      return 1
    fi
  done

  if [[ ! -d .next/static/css ]]; then
    log "missing build artifact directory: .next/static/css"
    return 1
  fi

  if ! find .next/static/css -maxdepth 1 -type f -name '*.css' | grep -q .; then
    log "missing built css assets under .next/static/css"
    return 1
  fi

  return 0
}

quarantine_incomplete_build() {
  local quarantine_root="$ROOT_DIR/.next-invalid"
  local timestamp
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$quarantine_root"
  mv .next "$quarantine_root/next-$timestamp"
  log "moved incomplete build to $quarantine_root/next-$timestamp"
}

if ! build_is_complete; then
  if [[ -e .next ]]; then
    quarantine_incomplete_build
  fi
  log "running npm run build"
  npm run build
fi

exec npm start -- --hostname "$HOST" --port "$PORT"
