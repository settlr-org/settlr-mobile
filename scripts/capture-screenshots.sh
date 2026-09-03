#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${EXPO_PUBLIC_API_URL:-http://10.0.2.2:18081}"
HOST_API_URL="${HOST_API_URL:-http://localhost:18081}"
SCREENSHOT_DIR="${1:-$ROOT/maestro/screenshots}"
REPORT_XML="${2:-$ROOT/maestro/screenshots/report.xml}"
mkdir -p "$SCREENSHOT_DIR"
echo "→ capture-screenshots: API=$HOST_API_URL SCREENSHOT_DIR=$SCREENSHOT_DIR"

# Check API
if ! curl -sf "$HOST_API_URL/health" >/dev/null 2>&1; then
  echo "✗ API not reachable at $HOST_API_URL"
  echo "  Ensure: cd ../settlr-api && DATABASE_URL=postgres://settlr:local-dev-password@127.0.0.1:5433/settlr_local?sslmode=disable make dev"
  exit 1
fi
echo "✓ API reachable"

# Check maestro
if ! command -v maestro >/dev/null 2>&1; then
  echo "✗ maestro not found. Install: curl -Ls https://get.maestro.mobile.dev | bash"
  exit 1
fi

# Screenshots are QA evidence, not presentation assets. A run without a
# connected device must fail rather than manufacturing placeholder images that
# can be mistaken for real UI captures.
if ! maestro list-devices 2>&1 | grep -q "device" && ! adb devices 2>&1 | grep -q "device$"; then
  echo "✗ No Android device/emulator found. Real screenshots are required."
  echo "  Start one with ./scripts/emulator.sh, install the APK, then rerun."
  exit 1
fi

# Device present — run maestro with screenshots
echo "→ Running Maestro with screenshots -> $SCREENSHOT_DIR"
# Ensure fixture credentials
if [[ -z "${MAESTRO_EMAIL:-}" || -z "${MAESTRO_PASSWORD:-}" ]]; then
  echo "→ Provisioning fixture via test-platform.sh"
  export MAESTRO_RUN_ID="screenshots-$(date +%s)"
  # Source test-platform.sh to set MAESTRO_EMAIL/PASSWORD
  set +u
  source "$ROOT/scripts/test-platform.sh" 2>&1 | tail -20 || true
  set -u
fi

# Run full coverage + screenshot suite
maestro test \
  --test-output-dir "$SCREENSHOT_DIR" \
  --format junit --output "$REPORT_XML" \
  "$ROOT/maestro/flows/full-coverage.yaml" \
  "$ROOT/maestro/flows/screenshot-suite.yaml" 2>&1 | tee "$SCREENSHOT_DIR/maestro.log"

# Pull screenshots if maestro stored them in nested dirs
find "$SCREENSHOT_DIR" -name "*.png" -type f | head -20
echo "✓ Screenshots captured: $(find "$SCREENSHOT_DIR" -name "*.png" | wc -l) files in $SCREENSHOT_DIR"
echo "  Report: $REPORT_XML"
ls -lh "$SCREENSHOT_DIR"/*.png 2>&1 | head -30
