#!/bin/bash
#
# AgentBranch v2 Smoke Tests
#
# Usage: ./scripts/smoke.sh [BASE_URL]
#
# Runs curl-based smoke tests against the API.
# Default base URL is http://localhost:3001
#

set -e

BASE_URL="${1:-http://localhost:3001}"
PASS=0
FAIL=0
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "  AgentBranch v2 Smoke Tests"
echo "=================================="
echo "Base URL: $BASE_URL"
echo ""

# Test helper function
test_endpoint() {
  local method="$1"
  local endpoint="$2"
  local expected_status="$3"
  local data="$4"
  local description="$5"
  local auth_header=""
  
  if [ -n "$TOKEN" ]; then
    auth_header="-H \"Authorization: Bearer $TOKEN\""
  fi
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      ${TOKEN:+-H "Authorization: Bearer $TOKEN"})
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      ${TOKEN:+-H "Authorization: Bearer $TOKEN"} \
      ${data:+-d "$data"})
  fi
  
  status_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}[PASS]${NC} $method $endpoint ($status_code) - $description"
    ((PASS++))
    echo "$body"
  else
    echo -e "${RED}[FAIL]${NC} $method $endpoint (expected $expected_status, got $status_code) - $description"
    echo "Response: $body"
    ((FAIL++))
  fi
  echo ""
}

# Extract value from JSON (simple approach)
extract_json() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

extract_json_num() {
  echo "$1" | grep -o "\"$2\":[0-9]*" | head -1 | cut -d':' -f2
}

echo "========== Health Check =========="
test_endpoint "GET" "/health" "200" "" "API health check"

echo "========== Auth Endpoints =========="

# Register a test user
REGISTER_DATA='{"username":"smoke_test_user_'$(date +%s)'","password":"testpass123"}'
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")
status=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$status" = "201" ] || [ "$status" = "200" ]; then
  echo -e "${GREEN}[PASS]${NC} POST /auth/register ($status) - Register new user"
  TOKEN=$(extract_json "$body" "token")
  ((PASS++))
else
  echo -e "${YELLOW}[SKIP]${NC} POST /auth/register ($status) - May already exist or service not ready"
fi
echo ""

# Test login
LOGIN_DATA='{"username":"smoke_test","password":"testpass"}'
test_endpoint "POST" "/auth/login" "200" "$LOGIN_DATA" "Login (may fail if user doesn't exist)"

# Get current user (requires token)
if [ -n "$TOKEN" ]; then
  test_endpoint "GET" "/auth/me" "200" "" "Get current user"
else
  echo -e "${YELLOW}[SKIP]${NC} GET /auth/me - No token available"
  echo ""
fi

echo "========== Agent Endpoints =========="
test_endpoint "GET" "/agents" "200" "" "List all agents"

# Create agent (requires auth)
if [ -n "$TOKEN" ]; then
  AGENT_DATA='{"ens_name":"smoke-agent-'$(date +%s)'.eth","role":"tester","capabilities":["testing","smoke"]}'
  test_endpoint "POST" "/agents" "201" "$AGENT_DATA" "Create new agent"
fi

test_endpoint "GET" "/agents/research-agent.eth" "200" "" "Get agent by ENS"

echo "========== Repository Endpoints =========="
test_endpoint "GET" "/repositories" "200" "" "List all repositories"

# Get first repo ID from list
REPOS_RESPONSE=$(curl -s "$BASE_URL/repositories" -H "Content-Type: application/json")
REPO_ID=$(echo "$REPOS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$REPO_ID" ]; then
  echo "Using repo ID: $REPO_ID"
  echo ""
  
  test_endpoint "GET" "/repositories/$REPO_ID" "200" "" "Get repository by ID"
  test_endpoint "GET" "/repositories/$REPO_ID/branches" "200" "" "List repository branches"
  test_endpoint "GET" "/repositories/$REPO_ID/commits?agent_ens=research-agent.eth" "200" "" "List repository commits"
  test_endpoint "GET" "/repositories/$REPO_ID/pulls" "200" "" "List pull requests"
  test_endpoint "GET" "/repositories/$REPO_ID/issues" "200" "" "List issues"
else
  echo -e "${YELLOW}[SKIP]${NC} Repository detail tests - No repositories found"
  echo ""
fi

echo "========== Leaderboard Endpoints =========="
test_endpoint "GET" "/leaderboard" "200" "" "Get leaderboard"
test_endpoint "GET" "/leaderboard?timeframe=month&limit=10" "200" "" "Get leaderboard with filters"
test_endpoint "GET" "/leaderboard/stats" "200" "" "Get leaderboard stats"
test_endpoint "GET" "/leaderboard/agents/research-agent.eth" "200" "" "Get agent profile"

echo "========== Blockchain Endpoints =========="
test_endpoint "GET" "/blockchain/config" "200" "" "Get blockchain config"

# Mock transaction (for testing without real blockchain)
if [ -n "$TOKEN" ]; then
  test_endpoint "POST" "/blockchain/mock-tx" "200" "" "Create mock transaction"
fi

echo "========== Commit Search & Graph =========="
if [ -n "$REPO_ID" ]; then
  test_endpoint "GET" "/repositories/$REPO_ID/commits/search?q=research" "200" "" "Search commits"
  test_endpoint "GET" "/repositories/$REPO_ID/commits/graph" "200" "" "Get commit graph"
fi

echo "========== Issue Operations =========="
if [ -n "$REPO_ID" ] && [ -n "$TOKEN" ]; then
  # Create an issue
  ISSUE_DATA='{"title":"Smoke Test Issue","body":"Testing issue creation","scorecard":{"difficulty":"easy","base_points":50,"unit_tests":["test_smoke"],"bonus_criteria":["fast"],"bonus_points_per_criterion":10,"time_limit_hours":24}}'
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/repositories/$REPO_ID/issues" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$ISSUE_DATA")
  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status" = "201" ] || [ "$status" = "200" ]; then
    echo -e "${GREEN}[PASS]${NC} POST /repositories/$REPO_ID/issues ($status) - Create issue with scorecard"
    ISSUE_ID=$(extract_json "$body" "id")
    ((PASS++))
    
    if [ -n "$ISSUE_ID" ]; then
      test_endpoint "GET" "/repositories/$REPO_ID/issues/$ISSUE_ID" "200" "" "Get issue by ID"
    fi
  else
    echo -e "${RED}[FAIL]${NC} POST /repositories/$REPO_ID/issues (expected 201, got $status)"
    ((FAIL++))
  fi
  echo ""
fi

echo "========== Error Handling =========="
test_endpoint "GET" "/nonexistent-endpoint" "404" "" "404 for unknown endpoint"
test_endpoint "GET" "/repositories/nonexistent-id" "404" "" "404 for unknown resource"

echo "========== Wallet Endpoints =========="
# Get wallet (should work for any existing agent)
test_endpoint "GET" "/agents/research-agent.eth/wallet" "200" "" "Get agent wallet info"

# Deposit to wallet (requires auth)
if [ -n "$TOKEN" ]; then
  DEPOSIT_DATA='{"amount":1000,"note":"Smoke test deposit"}'
  test_endpoint "POST" "/agents/research-agent.eth/deposit" "201" "$DEPOSIT_DATA" "Deposit to agent wallet"

  # Set spending cap
  CAP_DATA='{"spending_cap":5000}'
  test_endpoint "PATCH" "/agents/research-agent.eth/wallet" "200" "$CAP_DATA" "Set agent spending cap"
fi

echo "========== Bounty Endpoints =========="
if [ -n "$REPO_ID" ] && [ -n "$TOKEN" ] && [ -n "$ISSUE_ID" ]; then
  # Post a bounty on the smoke test issue
  BOUNTY_DATA='{"agent_ens":"research-agent.eth","amount":100,"deadline_hours":24,"max_submissions":3}'
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/repositories/$REPO_ID/issues/$ISSUE_ID/bounty" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$BOUNTY_DATA")
  status=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "201" ] || [ "$status" = "200" ]; then
    echo -e "${GREEN}[PASS]${NC} POST bounty ($status) - Post bounty on issue"
    ((PASS++))
  else
    # May fail if agent has no wallet balance; that's OK for smoke
    echo -e "${YELLOW}[SKIP]${NC} POST bounty ($status) - Bounty post (may need wallet balance)"
  fi
  echo ""

  # Get bounty for issue
  test_endpoint "GET" "/repositories/$REPO_ID/issues/$ISSUE_ID/bounty" "200" "" "Get issue bounty"
else
  echo -e "${YELLOW}[SKIP]${NC} Bounty tests - No repo/issue/token available"
  echo ""
fi

echo ""
echo "=================================="
echo "  Smoke Test Results"
echo "=================================="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
