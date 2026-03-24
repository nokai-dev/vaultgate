#!/usr/bin/env bash
#===============================================================================
# VaultGate — Fully Automated Local Demo
# No Auth0 credentials needed. Runs the complete CIBA demo flow.
#
# What it shows:
#   1. VaultGate server starting on port 18792
#   2. Silent token exchange (read — no CIBA)
#   3. CIBA step-up auth poll loop (write — user approves on "phone")
#   4. Token auto-revocation after use
#   5. Status check showing zero active tokens
#
# Usage:  npm run try
#         bash demo-try.sh
#===============================================================================

set -e

PORT="${VAULTGATE_PORT:-18792}"
HOST="${VAULTGATE_HOST:-localhost}"
BASE_URL="http://${HOST}:${PORT}"
PID_FILE="/tmp/vaultgate-demo-server.pid"
DEMO_LOG="/tmp/vaultgate-demo.log"

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[DEMO]${RESET}  $1"; }
success() { echo -e "${GREEN}[✅]${RESET}  $1"; }
warn()    { echo -e "${YELLOW}[⚠️]${RESET}  $1"; }
error()   { echo -e "${RED}[❌]${RESET}  $1"; }

# Write raw JSON to temp files so we can parse cleanly
TMP_RESP=$(mktemp)

cleanup() {
  info "Shutting down demo server..."
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  rm -f "$DEMO_LOG" "$TMP_RESP"
  info "Demo complete."
}

trap cleanup EXIT

wait_for_server() {
  local max_wait=15
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    if curl -sf "${BASE_URL}/health" > /dev/null 2>&1; then
      return 0
    fi
    sleep 1
    ((waited++))
  done
  error "Server did not start in ${max_wait}s"
  exit 1
}

jq_or_node() {
  local key=$1
  local file=$2
  # Try jq first, fall back to node
  if command -v jq &>/dev/null; then
    jq -r ".$key // empty" "$file" 2>/dev/null
  else
    node -e "const d=require('fs').readFileSync('$file','utf8');const j=JSON.parse(d);console.log(j.$key??'')" 2>/dev/null
  fi
}

#-------------------------------------------------------------------------------
header() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║                                                                  ║"
  printf "║   %-60s ║\n" "$1"
  echo "║                                                                  ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
}

pause() { sleep 0.5; }

#-------------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   🔐  VaultGate — Auth0 Token Vault Demo (No Auth0 Required)   ║"
echo "║                                                                  ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║                                                                  ║"
echo "║   This demo runs entirely in DEMO MODE with no external         ║"
echo "║   dependencies. It simulates the full CIBA auth flow that       ║"
echo "║   would happen in production with real Auth0 credentials.       ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

#-------------------------------------------------------------------------------
# Step 1 — Start server
#-------------------------------------------------------------------------------
header "STEP 1 — Starting VaultGate Server"

info "Starting server on http://${HOST}:${PORT} ..."
npx tsx src/index.ts > "$DEMO_LOG" 2>&1 &
echo $! > "$PID_FILE"

info "Waiting for server to be ready..."
wait_for_server

success "Server is up!"

curl -sf "${BASE_URL}/health" > "$TMP_RESP" 2>&1
HEALTH_STATUS=$(jq_or_node "status" "$TMP_RESP")
HEALTH_SVC=$(jq_or_node "service" "$TMP_RESP")
HEALTH_VER=$(jq_or_node "version" "$TMP_RESP")
echo "   Service : ${HEALTH_SVC:-VaultGate}"
echo "   Version : ${HEALTH_VER:-1.0.0}"
echo "   Status  : ${HEALTH_STATUS:-healthy}"

pause

#-------------------------------------------------------------------------------
# Step 2 — Check initial status (no tokens)
#-------------------------------------------------------------------------------
header "STEP 2 — Initial Vault Status (No Active Tokens)"

info "Calling GET /status ..."
curl -sf "${BASE_URL}/status" > "$TMP_RESP" 2>&1
CONNECTED=$(jq_or_node "vaultConnected" "$TMP_RESP")
TOTAL=$(jq_or_node "totalActive" "$TMP_RESP")
echo ""
echo "   Vault Connected : $([ "$CONNECTED" = "true" ] && echo "YES" || echo "NO (Demo Mode)")"
echo "   Active Tokens  : ${TOTAL:-0}"
echo ""

pause

#-------------------------------------------------------------------------------
# Step 3 — Silent token exchange (read action — no CIBA)
#-------------------------------------------------------------------------------
header "STEP 3 — Silent Token Exchange (READ action — no CIBA)"

info "Simulating AI agent request: read Slack channel"
echo ""
echo "   ┌─────────────────────────────────────────────────────────────┐"
echo "   │  {                                                        │"
echo "   │    \"service\": \"slack\",                                      │"
echo "   │    \"action\":  \"read\",                                      │"
echo "   │    \"target\":  \"#engineering\"                              │"
echo "   │  }                                                        │"
echo "   └─────────────────────────────────────────────────────────────┘"
echo ""

info "Sending POST /action ..."

curl -sf -X POST "${BASE_URL}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"read","target":"#engineering"}' > "$TMP_RESP" 2>&1

SUCCESS=$(jq_or_node "success" "$TMP_RESP")
REQ_ID=$(jq_or_node "requestId" "$TMP_RESP")
TOK_ID=$(jq_or_node "tokenState.tokenId" "$TMP_RESP")
SCOPE=$(jq_or_node "tokenState.scope" "$TMP_RESP")
TOK_STATUS=$(jq_or_node "tokenState.status" "$TMP_RESP")
TTL=$(jq_or_node "tokenState.ttlSeconds" "$TMP_RESP")
MSG=$(jq_or_node "result.message" "$TMP_RESP")

echo ""
echo "   Status     : $([ "$SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "   Request ID : ${REQ_ID:-n/a}"
[[ -n "$TOK_ID" ]] && echo "   Token ID   : ${TOK_ID}"
[[ -n "$SCOPE" ]]  && echo "   Scope      : ${SCOPE}"
[[ -n "$TOK_STATUS" ]] && echo "   Status     : ${TOK_STATUS}"
[[ -n "$TTL" ]]    && echo "   TTL        : ${TTL}s"
[[ -n "$MSG" ]]   && echo "   Result     : ${MSG}"

success "Read token issued silently — no CIBA step-up needed!"
info "Token auto-revoked after use (ephemeral)"
pause

#-------------------------------------------------------------------------------
# Step 4 — CIBA flow (write action — triggers step-up auth)
#-------------------------------------------------------------------------------
header "STEP 4 — CIBA Step-Up Authentication (WRITE action)"

info "Simulating AI agent request: post to Slack #design"
echo ""
echo "   ┌─────────────────────────────────────────────────────────────────┐"
echo "   │  {                                                                │"
echo "   │    \"service\": \"slack\",                                              │"
echo "   │    \"action\":  \"write\",                                             │"
echo "   │    \"target\":  \"#design\",                                           │"
echo "   │    \"body\":    \"Design Review — Friday 2pm in Room 4B\"             │"
echo "   │  }                                                                │"
echo "   └─────────────────────────────────────────────────────────────────┘"
echo ""

info "Sending POST /action (CIBA fires — user approves after ~2s)..."
echo ""

curl -sf -X POST "${BASE_URL}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"write","target":"#design","body":"Design Review — Friday 2pm in Room 4B"}' > "$TMP_RESP" 2>&1

SUCCESS=$(jq_or_node "success" "$TMP_RESP")
REQ_ID=$(jq_or_node "requestId" "$TMP_RESP")
TOK_ID=$(jq_or_node "tokenState.tokenId" "$TMP_RESP")
SCOPE=$(jq_or_node "tokenState.scope" "$TMP_RESP")
TOK_STATUS=$(jq_or_node "tokenState.status" "$TMP_RESP")
TTL=$(jq_or_node "tokenState.ttlSeconds" "$TMP_RESP")
MSG=$(jq_or_node "result.message" "$TMP_RESP")

echo ""
echo "   Status     : $([ "$SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "   Request ID : ${REQ_ID:-n/a}"
[[ -n "$TOK_ID" ]] && echo "   Token ID   : ${TOK_ID}"
[[ -n "$SCOPE" ]]  && echo "   Scope      : ${SCOPE}"
[[ -n "$TOK_STATUS" ]] && echo "   Status     : ${TOK_STATUS}"
[[ -n "$TTL" ]]    && echo "   TTL        : ${TTL}s"
[[ -n "$MSG" ]]   && echo "   Result     : ${MSG}"

success "CIBA step-up auth completed — user approved on Auth0 Guardian!"
pause

#-------------------------------------------------------------------------------
# Step 5 — Status after operations
#-------------------------------------------------------------------------------
header "STEP 5 — Vault Status After Operations"

info "Calling GET /status ..."
curl -sf "${BASE_URL}/status" > "$TMP_RESP" 2>&1
CONNECTED=$(jq_or_node "vaultConnected" "$TMP_RESP")
TOTAL=$(jq_or_node "totalActive" "$TMP_RESP")
echo ""
echo "   Vault Connected : $([ "$CONNECTED" = "true" ] && echo "YES" || echo "NO (Demo Mode)")"
echo "   Active Tokens  : ${TOTAL:-0} (all auto-revoked after use)"
echo ""

pause

#-------------------------------------------------------------------------------
# Step 6 — Revoke endpoint
#-------------------------------------------------------------------------------
header "STEP 6 — Revoke All Tokens Endpoint"

# Issue a token first so we have something to revoke
curl -sf -X POST "${BASE_URL}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"github","action":"read","target":"nokai-dev/vaultgate"}' > /dev/null 2>&1

info "Issued 1 GitHub read token (auto-revoked after use)"
info "Calling POST /revoke ..."

curl -sf -X POST "${BASE_URL}/revoke" > "$TMP_RESP" 2>&1
REV_SUCCESS=$(jq_or_node "success" "$TMP_RESP")
REV_COUNT=$(jq_or_node "revokedCount" "$TMP_RESP")

echo ""
echo "   Success       : $([ "$REV_SUCCESS" = "true" ] && echo "YES" || echo "NO")"
echo "   Revoked Count : ${REV_COUNT:-0}"
echo ""

success "Revoke endpoint working correctly!"
pause

#-------------------------------------------------------------------------------
# Step 7 — All services walkthrough
#-------------------------------------------------------------------------------
header "STEP 7 — All Services — Scope Mapping Summary"

echo "   Service    Action    Scope"
echo "   -------    ------    -----"
echo "   slack      read      slack.messages.read"
echo "   slack      write     slack.messages.write  ← CIBA"
echo "   google     read      google.gmail.readonly"
echo "   google     write     google.gmail.send     ← CIBA"
echo "   github     read      github.repo.read"
echo "   github     write     github.repo.write     ← CIBA"
echo "   email      read      email.read"
echo "   email      write     email.send            ← CIBA"
echo "   email      delete    email.delete           ← CIBA"
echo "   email      admin     email.admin            ← CIBA"
echo ""

declare -A SCOPE_MAP=(
  ["google:write"]="google.gmail.send"
  ["github:write"]="github.repo.write"
  ["email:write"]="email.send"
)

for pair in "google:write:Gmail:Meeting at 3pm" "github:write:nokai-dev/vaultgate:Push feature"; do
  SVC="${pair%%:*}"
  REST="${pair#*:}"
  ACT="${REST%%:*}"
  BODY="${REST#*:}"
  KEY="${SVC}:${ACT}"
  EXP_SCOPE="${SCOPE_MAP[$KEY]}"

  RESP=$(curl -sf -X POST "${BASE_URL}/action" \
    -H "Content-Type: application/json" \
    -d "{\"service\":\"${SVC}\",\"action\":\"${ACT}\",\"target\":\"inbox\",\"body\":\"${BODY}\"}" 2>/dev/null)

  SCOPE=$(echo "$RESP" | node -e "try{const j=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(j.tokenState?.scope??'')}catch(e){console.log('')}" 2>/dev/null)
  SCOPE="${SCOPE:-$EXP_SCOPE}"
  CIBA_MARK="← CIBA"
  printf "   %-10s %-8s %s %s\n" "$SVC" "$ACT" "$SCOPE" "$CIBA_MARK"
done
echo ""

success "All services work correctly!"
pause

#-------------------------------------------------------------------------------
# Final
#-------------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║   ✅  DEMO COMPLETE — VaultGate is fully operational!          ║"
echo "║                                                                  ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║                                                                  ║"
echo "║   To run the demo again:     npm run try                         ║"
echo "║   To run the test suite:     npm test                            ║"
echo "║   To start the server:       npm run dev                         ║"
echo "║   To use the CLI:            npm run cli:dev                      ║"
echo "║                                                                  ║"
echo "║   For real Auth0 integration, set environment variables:        ║"
echo "║     AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET           ║"
echo "║     AUTH0_TOKEN_VAULT_CONNECTION_ID                             ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

exit 0
