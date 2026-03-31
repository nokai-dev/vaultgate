#!/usr/bin/env bash
# =============================================================================
# VaultGate — Fully Automated Local Demo (No Auth0 Required)
# =============================================================================
# Runs the complete CIBA walkthrough using the live HTTP API.
# No external services, no real Auth0 — everything is simulated.
#
# What it demonstrates:
#   1. READ  → silent token (no CIBA, fast)
#   2. WRITE → CIBA step-up auth (visible poll loop, 3-poll auto-approval)
#   3. STATUS → shows active tokens
#   4. REVOKE → clears all tokens
#   5. Full CIBA walkthrough — phone buzzing, binding message, approval
#
# Requirements: Node.js >= 20, npm (no install needed — uses tsx directly)
#
# Usage:
#   npm run try          # via package.json
#   bash demo-try.sh     # directly
# =============================================================================

set -e

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

VG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$VG_DIR"

# Demo config — fast CIBA (3 polls × 400ms ≈ 1.2s instead of 6s default)
export DEMO_APPROVAL_DELAY_POLLS=3
export VAULTGATE_PORT=18792
export VAULTGATE_HOST=localhost
export VAULTGATE_QUIET=1   # suppress startup banner so JSON captures stay clean

# Server startup
SERVER_PID=""
PORT_CHECK_RETRIES=20

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "\n${YELLOW}Stopping VaultGate server (PID $SERVER_PID)...${RESET}"
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

wait_for_server() {
  local retries=$1
  for i in $(seq 1 $retries); do
    if curl -s "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/health" > /dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  return 1
}

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║${RESET}           ${BOLD}🔐 VaultGate — Auth0 Token Vault Demo${RESET}                  ${CYAN}║${RESET}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${CYAN}║${RESET}  Consumer-Initiated Backchannel Authentication (CIBA)           ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  Human-in-the-loop auth for AI agents — no real Auth0 needed   ${CYAN}║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ---------------------------------------------------------------------------
# Port cleanup — kill any process already on VAULTGATE_PORT
# ---------------------------------------------------------------------------
kill_port() {
  local port=$1
  local pid
  if command -v ss &>/dev/null; then
    pid=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -o 'pid=[0-9]*' | cut -d= -f2 | tr -d ' ' | head -1)
  elif command -v lsof &>/dev/null; then
    pid=$(lsof -ti:${port} 2>/dev/null | head -1)
  fi
  if [[ -n "$pid" ]]; then
    echo -e "${YELLOW}⚠ Killing orphaned process on port ${port} (PID ${pid})...${RESET}"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

# ---------------------------------------------------------------------------
# Check Node.js
# ---------------------------------------------------------------------------
NODE_VERSION=$(node -v 2>/dev/null || echo "")
if [[ -z "$NODE_VERSION" ]]; then
  echo -e "${RED}❌ Node.js is required but not found. Aborting.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓${RESET} Node.js ${NODE_VERSION}"

# ---------------------------------------------------------------------------
# Start VaultGate server in background
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}▶ Starting VaultGate HTTP server on port ${VAULTGATE_PORT}...${RESET}"

# Clear port before starting
kill_port $VAULTGATE_PORT

# Load .env.local (contains AUTH0_CLIENT_SECRET)
set -a && source .env.local && set +a

# Use tsx to run the server directly (no build step needed)
node_modules/.bin/tsx src/index.ts &
SERVER_PID=$!

echo -e "${GREEN}✓${RESET} VaultGate server started (PID $SERVER_PID)"

if ! wait_for_server $PORT_CHECK_RETRIES; then
  echo -e "${RED}❌ Server failed to start within ${PORT_CHECK_RETRIES} retries.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓${RESET} Server is ready"

# ---------------------------------------------------------------------------
# Helper: pretty JSON echo (strip ANSI before parsing, fall back gracefully)
# ---------------------------------------------------------------------------
echo_json() {
  local raw="$1"
  # Strip ANSI codes and format with jq if available, else just strip codes
  local cleaned
  cleaned=$(echo "$raw" | sed 's/\x1b\[[0-9;]*m//g')
  if echo "$cleaned" | jq . > /dev/null 2>&1; then
    echo "$cleaned" | jq .
  else
    # Raw output without ANSI
    echo "$cleaned"
  fi
}

# ---------------------------------------------------------------------------
# STEP 1 — Health check
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}STEP 1 — Health Check${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

HEALTH=$(curl -s "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/health")
echo -e "  ${GREEN}✓${RESET} GET /health"
echo_json "$HEALTH" | sed 's/^/    /'

# ---------------------------------------------------------------------------
# STEP 2 — Silent token (read, no CIBA)
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}STEP 2 — READ (Silent Token — No CIBA)${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo -e "  ${BOLD}→${RESET} AI agent requests: ${GREEN}read${RESET} from ${YELLOW}#all-auth0${RESET}"
echo -e "  ${BOLD}→${RESET} Scope needed: ${CYAN}slack.messages.read${RESET}"
echo -e "  ${BOLD}→${RESET} CIBA required: ${RED}NO${RESET} (read operations are silent)"
echo ""

READ_RESP=$(curl -s -X POST "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"read","target":"#all-auth0"}')

echo_json "$READ_RESP" | sed 's/^/    /'

# ---------------------------------------------------------------------------
# STEP 3 — CIBA step-up (write, triggers poll loop)
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}STEP 3 — WRITE with CIBA Step-Up Auth${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo -e "  ${BOLD}→${RESET} AI agent requests: ${GREEN}write${RESET} to ${YELLOW}#all-auth0${RESET}"
echo -e "  ${BOLD}→${RESET} Message: \"Sprint planning starts at 3pm 🎯\""
echo -e "  ${BOLD}→${RESET} Scope needed: ${CYAN}slack.messages.write${RESET}"
echo -e "  ${BOLD}→${RESET} CIBA required: ${GREEN}YES${RESET} — push sent to Auth0 Guardian"
echo ""
echo -e "  ${YELLOW}⏳ Watch the poll loop below — this is the demo moment!${RESET}"
echo ""

WRITE_RESP=$(curl -s -X POST "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"write","target":"#all-auth0","body":"Sprint planning starts at 3pm 🎯"}')

echo_json "$WRITE_RESP" | sed 's/^/    /'

# ---------------------------------------------------------------------------
# STEP 4 — Status (shows active tokens)
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}STEP 4 — Vault Status${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

STATUS_RESP=$(curl -s "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/status")
echo -e "  ${GREEN}✓${RESET} GET /status"
echo_json "$STATUS_RESP" | sed 's/^/    /'

# ---------------------------------------------------------------------------
# STEP 5 — Revoke all tokens
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}STEP 5 — Revoke All Tokens${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

REVOKE_RESP=$(curl -s -X POST "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/revoke")
echo -e "  ${GREEN}✓${RESET} POST /revoke"
echo_json "$REVOKE_RESP" | sed 's/^/    /'

# ---------------------------------------------------------------------------
# STEP 6 — Verify clean state
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}STEP 6 — Verify Clean State${RESET}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

STATUS_AFTER=$(curl -s "http://${VAULTGATE_HOST}:${VAULTGATE_PORT}/status")
echo -e "  ${GREEN}✓${RESET} GET /status (after revoke)"
echo_json "$STATUS_AFTER" | sed 's/^/    /'

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║${RESET}                    ${BOLD}✅ DEMO COMPLETE${RESET}                                ${CYAN}║${RESET}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════════════════╣${RESET}"
echo -e "${CYAN}║${RESET}  What just happened:                                                  ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}                                                                      ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  1. ${GREEN}READ${RESET} (slack:#all-auth0) — Silent token, no human needed        ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}     AI agent got access instantly without interrupting the user   ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}                                                                      ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  2. ${YELLOW}WRITE${RESET} (slack:#all-auth0) — CIBA triggered                         ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}     • Push notification sent to Auth0 Guardian                  ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}     • Poll loop ran (visible in terminal)                        ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}     • User approved on phone → token issued                      ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}     • Token auto-revoked after use (ephemeral)                   ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}                                                                      ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  3. ${RED}REVOKE${RESET} — All tokens invalidated                         ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}                                                                      ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}  Real Auth0 integration requires:                                     ${CYAN}║${RESET}"
echo -e "${CYAN}║${RESET}    AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET env vars     ${CYAN}║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}To run with real Auth0:${RESET}"
echo "  export AUTH0_DOMAIN=your-tenant.auth0.com"
echo "  export AUTH0_CLIENT_ID=your_client_id"
echo "  export AUTH0_CLIENT_SECRET=your_client_secret"
echo "  export AUTH0_TOKEN_VAULT_CONNECTION_ID=slack"
echo "  bash demo-try.sh"
echo ""
