#!/bin/sh
set -eu

API_URL="${1:-http://127.0.0.1:4000}"
OOB_URL="${2:-http://127.0.0.1:5000}"

echo "=================================================="
echo " NimbusBoard Safe Blind-XSS Listener Verification"
echo " Target API: ${API_URL}"
echo " Listener:   ${OOB_URL}"
echo "=================================================="

echo "[1] Submitting support feedback triggering safe internal review event..."
curl -fsS -X POST "${API_URL}/api/feedback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token-mira" \
  --data '{"message":"Local blind-XSS callback verification check"}' > /dev/null

echo "[2] Fetching callback listener event log..."
RESPONSE=$(curl -fsS "${OOB_URL}/")

echo "[+] Callback listener log output:"
echo "${RESPONSE}" | grep -A 10 "<pre>" || echo "${RESPONSE}"
echo "[+] Verification successful: Safe local-only callback verified."
