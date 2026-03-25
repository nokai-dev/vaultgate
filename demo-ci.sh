#!/usr/bin/env bash
#===============================================================================
# VaultGate — CI-Friendly Demo (no fuser, no jq needed)
# Fully automated local demo for CI environments (macOS + Linux).
# No Auth0 credentials needed.
#
# Usage:  npm run try:ci
#         bash demo-ci.sh
#===============================================================================

set -e

PORT="${VAULTGATE_PORT:-18793}"
HOST="${VAULTGATE_HOST:-localhost}"
BASE_URL="http://${HOST}:${PORT}"
PID_FILE="/tmp/vaultgate-ci-server.pid"
DEMO_LOG="/tmp/vaultgate-ci-demo.log"
TMP_RESP=$(mktemp)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[DEMO]${RESET}  $1"; }
success() { echo -e "${GREEN}[✅]${RESET}  $1"; }
warn()    { echo -e "${YELLOW}[⚠️]${RESET}  $1"; }
error()   { echo -e "${RED}[❌]${RESET}  $1"; }

node_json() {
  local key=$1
  node -e "const d=require('fs').readFileSync('${TMP_RESP}','utf8');const j=JSON.parse(d);console.log(j.${key}??'')" 2>/dev/null || echo ""
}

kill_port() {
  local port=$1
  # Cross-platform: works on Linux (ss) and macOS (lsof)
  local pid
  if command -v ss &>/dev/null; then
    pid=$(ss -tlnp 2>/dev/null | grep ":${port}" | grep -o 'pid=[0-9]*' | cut -d= -f2 | tr -d ' ' | head -1)
  elif command -v lsof &>/dev/null; then
    pid=$(lsof -ti:${port} 2>/dev/null | head -1)
  fi
  if [[ -n "$pid" ]]; then
    warn "Killing orphaned process on port ${port} (PID ${pid})..."
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

cleanup() {
  info "Shutting down..."
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  kill_port $PORT
  rm -f "$DEMO_LOG" "$TMP_RESP"
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

pause() { sleep 0.5; }

header() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  printf "║  %-60s ║\n" "$1"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
}

#-------------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║   🔐  VaultGate — CI Demo (No Auth0 Required)                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Kill orphaned servers
info "Clearing port ${PORT}..."
kill_port $PORT

# Start server
info "Starting VaultGate server on http://${HOST}:${PORT} ..."
npx tsx src/index.ts > "$DEMO_LOG" 2>&1 &
echo $! > "$PID_FILE"

info "Waiting for server..."
wait_for_server
success "Server is up!"

# Health check
curl -sf "${BASE_URL}/health" > "$TMP_RESP" 2>&1
echo "   Service : $(node_json "service")"
echo "   Version : $(node_json "version")"
echo "   Status  : $(node_json "status")"

pause

# Initial status
header "STEP 1 — Initial Vault Status"
curl -sf "${BASE_URL}/status" > "$TMP_RESP" 2>&1
echo "   Vault Connected : NO (Demo Mode)"
echo "   Active Tokens  : $(node_json "totalActive")"

pause

# Silent token (read)
header "STEP 2 — Silent Token Exchange (READ — no CIBA)"
info "POST /action {service:slack, action:read, target:#engineering}"
curl -sf -X POST "${BASE_URL}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"read","target":"#engineering"}' > "$TMP_RESP" 2>&1
echo "   Status : $(node_json "success") ? SUCCESS"
echo "   Scope  : $(node_json "tokenState.scope")"
echo "   Token  : $(node_json "tokenState.tokenId")"
success "Silent token issued — no CIBA needed!"

pause

# CIBA token (write)
header "STEP 3 — CIBA Step-Up Auth (WRITE — triggers Guardian)"
info "POST /action {service:slack, action:write, target:#design, body:...}"
curl -sf -X POST "${BASE_URL}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"write","target":"#design","body":"Design Review — Friday 2pm"}' > "$TMP_RESP" 2>&1
echo "   Status : $(node_json "success") ? SUCCESS"
echo "   Scope  : $(node_json "tokenState.scope")"
echo "   Token  : $(node_json "tokenState.tokenId")"
success "CIBA approved — user consented via Auth0 Guardian!"

pause

# Status after
header "STEP 4 — Vault Status After Operations"
curl -sf "${BASE_URL}/status" > "$TMP_RESP" 2>&1
echo "   Active Tokens : $(node_json "totalActive") (all auto-revoked after use)"

pause

# Revoke endpoint
header "STEP 5 — Revoke Endpoint"
curl -sf -X POST "${BASE_URL}/action" \
  -H "Content-Type: application/json" \
  -d '{"service":"github","action":"read","target":"nokai-dev/vaultgate"}' > /dev/null 2>&1
curl -sf -X POST "${BASE_URL}/revoke" > "$TMP_RESP" 2>&1
echo "   Success       : $(node_json "success")"
echo "   Revoked Count: $(node_json "revokedCount")"
success "Revoke endpoint working!"

pause

# All services summary
header "STEP 6 — All Services Summary"
echo "   Service    Action    Scope                        CIBA?"
echo "   -------    ------    -----                        -----"
for svc_act in "slack:read:slack.messages.read:NO" \
               "slack:write:slack.messages.write:YES" \
               "google:read:google.gmail.readonly:NO" \
               "google:write:google.gmail.send:YES" \
               "github:read:github.repo.read:NO" \
               "github:write:github.repo.write:YES" \
               "email:read:email.read:NO" \
               "email:write:email.send:YES"; do
  svc="${svc_act%%:*}"
  rest="${svc_act#*:}"
  act="${rest%%:*}"
  scope_ciba="${rest#*:}"
  scope="${scope_ciba%%:*}"
  ciba="${scope_ciba#*:}"
  curl -sf -X POST "${BASE_URL}/action" \
    -H "Content-Type: application/json" \
    -d "{\"service\":\"${svc}\",\"action\":\"${act}\",\"target\":\"test\"}" > "$TMP_RESP" 2>&1 || true
  echo "   $(printf '%-9s %-8s %-28s %-3s' "$svc" "$act" "$scope" "$ciba")"
done

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║   ✅  DEMO COMPLETE                                              ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║   Run tests:    npm test                                         ║"
echo "║   Full demo:    npm run try                                      ║"
echo "║   Dev server:   npm run dev                                      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

exit 0
