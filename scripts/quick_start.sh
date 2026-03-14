#!/bin/bash
# Quick start script for AgentBranch v3
# Usage: ./scripts/quick_start.sh
# Optional env vars:
#   API_URL (default http://localhost:3001)
#   FRONTEND_PORT (default 3000)
#   SKIP_TESTS=1 to skip tests
#   SKIP_CONTRACTS=1 to skip Foundry build/test

set -e

API_URL="${API_URL:-http://localhost:3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[quick-start]${NC} $1"; }
warn() { echo -e "${YELLOW}[quick-start]${NC} $1"; }
err() { echo -e "${RED}[quick-start]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

log "Root: $ROOT_DIR"
log "API_URL: $API_URL"
log "Frontend port: $FRONTEND_PORT"

if [ ! -f .env ]; then
  warn ".env not found. Copying from .env.example"
  cp .env.example .env || warn "No .env.example at root; ensure backend/.env is configured."
fi

if [ ! -f backend/.env ]; then
  warn "backend/.env not found. If needed, copy backend/.env.example to backend/.env"
fi

log "Installing workspace deps (npm workspaces)"
npm install

log "Running DB migrations (v2 + v3 + v4)"
npm run migrate:v2
npm run migrate:v3
npm run migrate:v4

if [ -z "$SKIP_TESTS" ]; then
  log "Running backend tests"
  npm run test:backend

  log "Running frontend tests"
  npm run test:frontend
else
  warn "Skipping tests (SKIP_TESTS=1)"
fi

if [ -z "$SKIP_CONTRACTS" ]; then
  if command -v forge >/dev/null 2>&1; then
    log "Running Foundry tests"
    npm run forge:test
  else
    warn "Foundry (forge) not installed; skipping contract tests"
  fi
else
  warn "Skipping contracts (SKIP_CONTRACTS=1)"
fi

log "Starting backend dev server (port 3001)"
npm run dev:backend >/tmp/agentbranch_backend.log 2>&1 &
BACK_PID=$!
sleep 2

log "Starting frontend dev server (port $FRONTEND_PORT, API $API_URL)"
cd frontend
export NEXT_PUBLIC_API_URL="$API_URL"
npm run dev -- --port "$FRONTEND_PORT" >/tmp/agentbranch_frontend.log 2>&1 &
FRONT_PID=$!
cd ..

log "Backend log: tail -f /tmp/agentbranch_backend.log"
log "Frontend log: tail -f /tmp/agentbranch_frontend.log"
log "Frontend: http://localhost:$FRONTEND_PORT"

cleanup() {
  warn "Shutting down dev servers"
  [ -n "$BACK_PID" ] && kill "$BACK_PID" 2>/dev/null || true
  [ -n "$FRONT_PID" ] && kill "$FRONT_PID" 2>/dev/null || true
}

trap cleanup EXIT

log "Quick start is running. Press Ctrl+C to stop."
wait
