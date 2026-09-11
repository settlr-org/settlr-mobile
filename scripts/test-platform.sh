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
PARTNER_EMAIL="partner-${RUN_ID}@test.local"
CORE_EMAIL="core-${RUN_ID}@test.local"
SEARCH_EMAIL="search-${RUN_ID}@test.local"
GROUP_NAME="E2E Core ${RUN_ID}"
FLOW_PATH="${1:-./maestro/flows/regression-suite.yaml}"
mkdir -p "$ROOT/.tmp-native-build"
RESPONSE="$(mktemp "$ROOT/.tmp-native-build/fixture.XXXXXX")"
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
owner_id="$(jq -r '.user.id // empty' "$RESPONSE")"
if [[ -z "$token" ]]; then
  echo "Local API must run with APP_ENV=development to provision the test fixture." >&2
  exit 1
fi
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/verify-email" \
  --data "{\"token\":\"$token\"}" >/dev/null

# Provision two additional verified users and a real two-person ledger. Advanced
# split and settlement journeys cannot be validated honestly with a
# single-member account.
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/register" \
  --data "{\"name\":\"Maestro Core\",\"email\":\"$CORE_EMAIL\",\"password\":\"$PASSWORD\"}" >"$RESPONSE"
core_id="$(jq -r '.user.id // empty' "$RESPONSE")"
core_token="$(jq -r '.verification_token // empty' "$RESPONSE")"
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/verify-email" \
  --data "{\"token\":\"$core_token\"}" >/dev/null
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/login" \
  --data "{\"email\":\"$CORE_EMAIL\",\"password\":\"$PASSWORD\"}" >"$RESPONSE"
core_access="$(jq -r '.access_token // empty' "$RESPONSE")"

curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/register" \
  --data "{\"name\":\"Maestro Partner\",\"email\":\"$PARTNER_EMAIL\",\"password\":\"$PASSWORD\"}" >"$RESPONSE"
partner_id="$(jq -r '.user.id // empty' "$RESPONSE")"
partner_token="$(jq -r '.verification_token // empty' "$RESPONSE")"
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/verify-email" \
  --data "{\"token\":\"$partner_token\"}" >/dev/null
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/login" \
  --data "{\"email\":\"$PARTNER_EMAIL\",\"password\":\"$PASSWORD\"}" >"$RESPONSE"
partner_access="$(jq -r '.access_token // empty' "$RESPONSE")"

# Two deterministic incoming requests cover both accept and reject paths.
curl -fsS -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $partner_access" \
  -X POST "$HOST_API_URL/api/v1/friends/$owner_id/request" >/dev/null
curl -fsS -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $core_access" \
  -X POST "$HOST_API_URL/api/v1/friends/$owner_id/request" >/dev/null

# A disconnected searchable account exercises the person-detail request state.
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/register" \
  --data "{\"name\":\"Maestro Search\",\"email\":\"$SEARCH_EMAIL\",\"password\":\"$PASSWORD\"}" >"$RESPONSE"
search_token="$(jq -r '.verification_token // empty' "$RESPONSE")"
curl -fsS -H 'Content-Type: application/json' \
  -X POST "$HOST_API_URL/api/v1/auth/verify-email" \
  --data "{\"token\":\"$search_token\"}" >/dev/null

curl -fsS -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $core_access" \
  -X POST "$HOST_API_URL/api/v1/friends/$partner_id/request" >/dev/null
curl -fsS -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $partner_access" \
  -X POST "$HOST_API_URL/api/v1/friends/$core_id/accept" >/dev/null
curl -fsS -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $core_access" \
  -X POST "$HOST_API_URL/api/v1/groups" \
  --data "{\"name\":\"$GROUP_NAME\",\"description\":\"Two-person Maestro fixture\",\"currency\":\"NPR\",\"group_type\":\"OTHER\"}" >"$RESPONSE"
group_id="$(jq -r '.id // empty' "$RESPONSE")"
curl -fsS -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $core_access" \
  -X POST "$HOST_API_URL/api/v1/groups/$group_id/members" \
  --data "{\"user_id\":\"$partner_id\"}" >/dev/null

MAESTRO_RUN_ID="$RUN_ID" MAESTRO_EMAIL="$EMAIL" MAESTRO_PASSWORD="$PASSWORD" \
  MAESTRO_GROUP_NAME="$GROUP_NAME" MAESTRO_PARTNER_NAME="Maestro Partner" \
  MAESTRO_CORE_EMAIL="$CORE_EMAIL" \
  MAESTRO_SEARCH_NAME="Maestro Search" MAESTRO_SEARCH_EMAIL="$SEARCH_EMAIL" \
  EXPO_PUBLIC_API_URL="$API_URL" TMPDIR="$ROOT/.tmp-native-build" ./scripts/e2e.sh \
  ./android/app/build/outputs/apk/release/app-release.apk "$FLOW_PATH"
