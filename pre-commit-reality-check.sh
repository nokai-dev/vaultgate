#!/usr/bin/env bash
#===============================================================================
# VaultGate — Pre-Commit Reality Check
# Runs BEFORE every `git push` to catch phantom packages, unmarked simulations,
# and dependency misalignment (as required by AGENTS.md Build Verification Rules).
#===============================================================================

cd /data/.openclaw/workspace/vaultgate

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  echo -n "  $label ... "
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${RESET}"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${RESET}"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo -e "${CYAN}[pre-commit]${RESET} VaultGate Reality Check"
echo ""

# 1. Verify key packages exist on npm
echo -e "${CYAN}  1. Checking referenced packages exist on npm...${RESET}"
for pkg in express cors dotenv vitest @vitest/coverage-v8 tsx typescript supertest @types/express @types/cors @types/node @types/supertest tsd; do
  echo -n "    $pkg ... "
  if npm info "$pkg" version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${RESET}"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗ MISSING${RESET}"
    FAIL=$((FAIL+1))
  fi
done

# 2. Verify @auth0/auth0-ai is NOT imported as real dependency in source
echo ""
echo -e "${CYAN}  2. Checking no phantom @auth0/auth0-ai imports...${RESET}"
echo -n "    @auth0/auth0-ai in source (non-test) ... "
if grep -r "from '@auth0/auth0-ai'" src/ --include="*.ts" 2>/dev/null | grep -v "\.test\.ts" | grep -qv "^$"; then
  echo -e "${RED}✗ FOUND — phantom package referenced!${RESET}"
  FAIL=$((FAIL+1))
else
  echo -e "${GREEN}✓ none found${RESET}"
  PASS=$((PASS+1))
fi

# 3. Verify simulation is properly labeled
echo ""
echo -e "${CYAN}  3. Checking simulation labeling...${RESET}"
SIMULATED=$(grep -r "SIMULATED\|// sim\|// mock\|DEMO_MODE\|demo\|DEMO" src/*.ts 2>/dev/null | grep -v "\.test\.ts" | wc -l)
echo -n "    Simulation/mock labels in source ... "
if [[ "$SIMULATED" -gt 0 ]]; then
  echo -e "${GREEN}✓ ($SIMULATED references)${RESET}"
  PASS=$((PASS+1))
else
  echo -e "${YELLOW}⚠ none found${RESET}"
  FAIL=$((FAIL+1))
fi

# 4. Verify README has Demo Mode section
echo ""
echo -e "${CYAN}  4. Checking README Demo Mode disclosure...${RESET}"
echo -n "    README mentions Demo Mode ... "
if grep -qi "demo mode" README.md 2>/dev/null; then
  echo -e "${GREEN}✓${RESET}"
  PASS=$((PASS+1))
else
  echo -e "${RED}✗ missing${RESET}"
  FAIL=$((FAIL+1))
fi

# 5. TypeScript compilation check
echo ""
echo -e "${CYAN}  5. TypeScript compilation...${RESET}"
check "tsc --noEmit" "npx tsc --noEmit"

# 6. Run test suite
echo ""
echo -e "${CYAN}  6. Test suite...${RESET}"
check "vitest run" "npx vitest run"

echo ""
echo "========================================"
echo -e "  Results: ${GREEN}${PASS} passed${RESET} / ${RED}${FAIL} failed${RESET}"
echo "========================================"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo -e "${RED}❌ Pre-commit check failed. Fix issues before pushing.${RESET}"
  exit 1
else
  echo ""
  echo -e "${GREEN}✅ All checks passed. Safe to push!${RESET}"
  exit 0
fi
