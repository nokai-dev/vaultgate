#!/bin/bash
set -e

echo "=========================================="
echo "  VaultGate — Try It Out (Demo Mode)"
echo "=========================================="

# Step 1: Build
echo ""
echo "[1/5] Building..."
npm run build

# Step 2: Start server in background
echo ""
echo "[2/5] Starting VaultGate server on port 18792..."
npm start &
SERVER_PID=$!
sleep 3

# Step 3: Check server is up
echo ""
echo "[3/5] Health check..."
curl -s http://localhost:18792/health | jq .

# Step 4: Run demo — send a message (triggers CIBA)
echo ""
echo "[4/5] Sending message via VaultGate (CIBA demo)..."
echo "      Watch the CIBA poll loop in the server terminal!"
npm run cli -- send "#design" "Design Review — Friday 2pm"

# Step 5: Check status
echo ""
echo "[5/5] Final status..."
curl -s http://localhost:18792/status | jq .

# Cleanup
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Demo complete!"
echo "=========================================="
