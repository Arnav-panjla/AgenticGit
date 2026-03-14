#!/bin/bash
#
# AgentBranch v2 — Full End-to-End Test Orchestrator
#
# Runs all test layers in sequence:
#   1. Backend unit tests (Jest)
#   2. Frontend tests (Vitest)
#   3. Contract tests (Forge)
#   4. TypeScript compilation check
#   5. Smoke tests (if server is running)
#
# Usage:
#   ./scripts/e2e.sh              # run all
#   ./scripts/e2e.sh --skip-smoke # skip smoke tests (no running server needed)
#   ./scripts/e2e.sh --only unit  # only run unit tests
#

set -uo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKIP_SMOKE=false
ONLY=""
PASS=0
FAIL=0
SKIP=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse args
NEXT_IS_ONLY=false
for arg in "$@"; do
  if [ "$NEXT_IS_ONLY" = true ]; then
    ONLY="$arg"
    NEXT_IS_ONLY=false
    continue
  fi
  case "$arg" in
    --skip-smoke) SKIP_SMOKE=true ;;
    --only)       NEXT_IS_ONLY=true ;;
    unit|frontend|contracts|smoke|typecheck)
      ONLY="$arg" ;;
  esac
done

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AgentBranch v2 — End-to-End Test Orchestrator             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Root directory: $ROOT_DIR"
echo "Skip smoke: $SKIP_SMOKE"
[ -n "$ONLY" ] && echo "Only running: $ONLY"
echo ""

run_step() {
  local name="$1"
  local cmd="$2"
  local workdir="${3:-$ROOT_DIR}"

  echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BLUE}  Step: $name${NC}"
  echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
  echo ""

  if (cd "$workdir" && eval "$cmd"); then
    echo ""
    echo -e "  ${GREEN}[PASS]${NC} $name"
    PASS=$((PASS + 1))
  else
    echo ""
    echo -e "  ${RED}[FAIL]${NC} $name"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

skip_step() {
  local name="$1"
  local reason="$2"
  echo -e "  ${YELLOW}[SKIP]${NC} $name — $reason"
  SKIP=$((SKIP + 1))
  echo ""
}

should_run() {
  [ -z "$ONLY" ] || [ "$ONLY" = "$1" ]
}

# ─── Step 1: Backend Unit Tests ───────────────────────────────────────────────

if should_run "unit"; then
  run_step "Backend unit tests (Jest)" \
    "npx jest --no-coverage --forceExit" \
    "$ROOT_DIR/backend"
fi

# ─── Step 2: TypeScript Compilation ───────────────────────────────────────────

if should_run "typecheck"; then
  run_step "TypeScript compilation (tsc --noEmit)" \
    "npx tsc --noEmit" \
    "$ROOT_DIR/backend"
fi

# ─── Step 3: Frontend Tests ──────────────────────────────────────────────────

if should_run "frontend"; then
  if [ -f "$ROOT_DIR/frontend/package.json" ]; then
    run_step "Frontend tests (Vitest)" \
      "npx vitest run --reporter=verbose 2>&1" \
      "$ROOT_DIR/frontend"
  else
    skip_step "Frontend tests" "frontend/package.json not found"
  fi
fi

# ─── Step 4: Contract Tests ──────────────────────────────────────────────────

if should_run "contracts"; then
  if command -v forge &>/dev/null && [ -f "$ROOT_DIR/contracts/foundry.toml" ]; then
    run_step "Contract tests (Forge)" \
      "forge test -vvv" \
      "$ROOT_DIR/contracts"
  else
    skip_step "Contract tests" "forge not installed or contracts dir not found"
  fi
fi

# ─── Step 5: Smoke Tests ─────────────────────────────────────────────────────

if should_run "smoke" && [ "$SKIP_SMOKE" = false ]; then
  BASE_URL="${BASE_URL:-http://localhost:3001}"
  # Check if server is running
  if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null | grep -q "200"; then
    run_step "Smoke tests (curl)" \
      "bash scripts/smoke.sh $BASE_URL" \
      "$ROOT_DIR"
  else
    skip_step "Smoke tests" "Server not running at $BASE_URL (start with npm run dev:backend)"
  fi
elif should_run "smoke"; then
  skip_step "Smoke tests" "--skip-smoke flag set"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Test Summary                                ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Passed:  ${GREEN}$PASS${NC}"
echo -e "${BLUE}║${NC}  Failed:  ${RED}$FAIL${NC}"
echo -e "${BLUE}║${NC}  Skipped: ${YELLOW}$SKIP${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Some test steps failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All test steps passed!${NC}"
  exit 0
fi
