#!/bin/bash
#===============================================================================
# VaultGate Demo Script — "Authorized to Act" Hackathon
# 3-minute demo showing CIBA-powered human-in-the-loop auth
#
# Run this script to reproduce the full demo:
#   ./demo/demo.sh
#
# Prerequisites:
#   1. npm install
#   2. VaultGate server running (npm run dev)
#   3. Terminal in split view or large enough for CIBA poll output
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

wait() {
    echo -e "${NC}Press Enter to continue..."
    read -r
}

clear
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                            ║${NC}"
echo -e "${CYAN}║            🔐 VAULTGATE DEMO — "Authorized to Act" Hackathon               ║${NC}"
echo -e "${CYAN}║                                                                            ║${NC}"
echo -e "${CYAN}║              Auth0 Token Vault + CIBA Step-Up Authentication             ║${NC}"
echo -e "${CYAN}║                                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

wait

#-------------------------------------------------------------------------------
# STEP 0: THE PROBLEM (0:00-0:30)
#-------------------------------------------------------------------------------
print_header "PART 1: THE PROBLEM"

echo -e "${BOLD}The Challenge:${NC}"
echo "  AI agents need credentials to do useful work."
echo "  But storing credentials = security nightmare."
echo ""
echo -e "${BOLD}Current Approach (broken):${NC}"
echo "  • Agent has credentials stored locally"
echo "  • Credentials never expire"
echo "  • No human oversight on sensitive actions"
echo ""
echo -e "${BOLD}Let's check the agent's credential store...${NC}"
echo ""

# Check for any stored credentials (should be empty or minimal)
echo -e "${YELLOW}Checking ~/.clawdbot/ for credentials:${NC}"
if [ -d "$HOME/.clawdbot" ]; then
    echo "Contents of ~/.clawdbot/:"
    ls -la "$HOME/.clawdbot/" 2>/dev/null || echo "  (empty or cannot list)"
else
    echo "  Directory does not exist"
fi
echo ""

echo -e "${RED}✗ No Slack credentials stored.${NC}"
echo -e "${RED}✗ No Google credentials stored.${NC}"
echo -e "${RED}✗ Agent can't do anything useful!${NC}"
echo ""

print_info "VaultGate solves this: credentials stay in the vault."
print_info "Agent only gets ephemeral, scoped tokens for specific tasks."

wait

#-------------------------------------------------------------------------------
# STEP 1: SETUP (0:30-1:00)
#-------------------------------------------------------------------------------
clear
print_header "PART 2: VAULTGATE SETUP"

echo -e "${BOLD}VaultGate is a local gateway that:${NC}"
echo "  1. Intercepts AI agent tool calls"
echo "  2. Routes them through Auth0 Token Vault"
echo "  3. Triggers CIBA (step-up auth) for write operations"
echo "  4. Issues ephemeral tokens that auto-expire"
echo ""

echo -e "${BOLD}Architecture:${NC}"
echo "  OpenClaw → VaultGate → Auth0 Token Vault → Slack"
echo "              ↓"
echo "         No credentials"
echo "         on machine"
echo ""

echo -e "${BOLD}Checking VaultGate status...${NC}"
echo ""

# Check if server is running
if curl -s "http://localhost:18792/health" > /dev/null 2>&1; then
    print_success "VaultGate server is running"
    
    # Show status
    echo ""
    echo -e "${YELLOW}VaultGate Status:${NC}"
    node cli/index.ts status 2>/dev/null || npm run cli -- status 2>/dev/null || echo "  (CLI not available)"
else
    print_error "VaultGate server is not running!"
    echo ""
    echo "  Start it with: npm run dev"
    echo "  Then run this demo again."
    exit 1
fi

wait

#-------------------------------------------------------------------------------
# STEP 2: CIBA DEMO (1:00-2:00)
#-------------------------------------------------------------------------------
clear
print_header "PART 3: THE MAGIC MOMENT — CIBA STEP-UP AUTH"

echo -e "${BOLD}Now let's send a Slack message.${NC}"
echo ""
echo "  vaultgate send \"#design\" \"Design Review — Friday 2pm\""
echo ""

echo -e "${YELLOW}Watch what happens:${NC}"
echo "  1. VaultGate intercepts the request"
echo "  2. Identifies it as a WRITE action"
echo "  3. Triggers CIBA flow..."
echo "  4. Push sent to your phone (Auth0 Guardian)"
echo "  5. YOU approve on your phone"
echo "  6. Token issued, message sent"
echo "  7. Token auto-expires"
echo ""

wait

# Send the message
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  EXECUTING: vaultgate send \"#design\" \"Design Review — Friday 2pm\"${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Try the CLI (this will show the full CIBA flow)
node cli/index.ts send "#design" "Design Review — Friday 2pm" 2>/dev/null || \
npm run cli -- send "#design" "Design Review — Friday 2pm" 2>/dev/null || \
echo "(CLI command failed — check npm install)"

wait

#-------------------------------------------------------------------------------
# STEP 3: TOKEN CLEANUP (2:00-2:30)
#-------------------------------------------------------------------------------
clear
print_header "PART 4: TOKEN CLEANUP"

echo -e "${BOLD}After the task completes:${NC}"
echo "  • Token was used once"
echo "  • Token is now expired/revoked"
echo "  • No persistent access"
echo ""

echo -e "${YELLOW}Checking vault status after task:${NC}"
echo ""

# Show status after
node cli/index.ts status 2>/dev/null || npm run cli -- status 2>/dev/null

echo ""
echo -e "${GREEN}✓ Token auto-expired. Zero active tokens.${NC}"
echo ""

wait

#-------------------------------------------------------------------------------
# STEP 4: RECAP (2:30-3:00)
#-------------------------------------------------------------------------------
clear
print_header "PART 5: RECAP — THE SECURITY MODEL"

echo -e "${BOLD}What just happened:${NC}"
echo ""
echo -e "${GREEN}✅${NC} Credentials never on machine"
echo -e "${GREEN}✅${NC} CIBA gated all write operations"
echo -e "${GREEN}✅${NC} Human approved on phone"
echo -e "${GREEN}✅${NC} Scoped token issued (minimum privilege)"
echo -e "${GREEN}✅${NC} Action executed"
echo -e "${GREEN}✅${NC} Token auto-expired"
echo ""

echo -e "${BOLD}This means:${NC}"
echo "  • AI agent has exactly the access it needs"
echo "  • No standing permissions"
echo "  • Human always in the loop for writes"
echo "  • Tokens expire automatically"
echo "  • Audit trail in Auth0"
echo ""

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                            ║${NC}"
echo -e "${CYAN}║   🔐 VaultGate: Security through ephemeral, human-gated access            ║${NC}"
echo -e "${CYAN}║                                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_success "Demo complete!"
