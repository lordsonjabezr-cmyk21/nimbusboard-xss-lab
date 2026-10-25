#!/bin/sh
set -eu

API_URL="${1:-http://127.0.0.1:4000}"

echo "=================================================="
echo " NimbusBoard Lab State Reset"
echo " Target API: ${API_URL}"
echo "=================================================="

RESPONSE=$(curl -fsS -X POST "${API_URL}/lab/reset" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token-ari" \
  --data '{"reason":"manual_script_reset"}')

echo "[+] Response: ${RESPONSE}"
echo "[+] Reset completed successfully: Database restored to initial seed state."
