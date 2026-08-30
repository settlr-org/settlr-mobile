#!/usr/bin/env bash
set -euo pipefail

# Local native release gate. The API stays on the host under Air; Docker is
# used only by ../settlr-api/scripts/dev.sh for Postgres and Mailpit.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${EXPO_PUBLIC_API_URL:-http://10.0.2.2:18081}"
HOST_API_URL="${HOST_API_URL:-http://localhost:18081}"
RUN_ID="${MAESTRO_RUN_ID:-mobile-$(date +%s)}"
EMAIL="${MAESTRO_EMAIL:-${RUN_ID}@test.local}"
PASSWORD="${MAESTRO_PASSWORD:-Test123!Test123!}"
RESPONSE="$(mktemp)"
trap 'rm -f "$RESPONSE"' EXIT

cd "$ROOT"
curl -fsS "$HOST_API_URL/health" >/dev/null
registration_status="$(curl -sS -o "$RESPONSE" -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/register" \
  --data "{\"name\":\"Maestro Tester\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
if [[ "$registration_status" != "201" ]]; then
  echo "Fixture registration failed (HTTP $registration_status)" >&2
  exit 1
fi
token="$(jq -r '.verification_token // empty' "$RESPONSE")"
if [[ -z "$token" ]]; then
  echo "Local API must run with APP_ENV=development to provision the test fixture." >&2
  exit 1
fi
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/verify-email" \
  --data "{\"token\":\"$token\"}" >/dev/null

MAESTRO_EMAIL="$EMAIL" MAESTRO_PASSWORD="$PASSWORD" \
  EXPO_PUBLIC_API_URL="$API_URL" TMPDIR="$ROOT/.tmp-native-build" ./scripts/e2e.sh \
  ./android/app/build/outputs/apk/release/app-release.apk ./maestro/flows
