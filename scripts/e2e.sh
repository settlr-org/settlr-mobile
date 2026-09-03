#!/usr/bin/env bash
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export TMPDIR="${TMPDIR:-$PWD/.tmp-native-build}"
mkdir -p "$TMPDIR"
# Android Gradle Plugin's Prefab helper is a Java process and otherwise uses
# /tmp directly, ignoring TMPDIR. Keep its temporary C++ artifacts off the
# limited hosted-runner tmpfs as well.
export GRADLE_OPTS="${GRADLE_OPTS:-} -Djava.io.tmpdir=$TMPDIR"
# Maestro is JVM-based and its Android driver also creates temporary APK
# files. Point it at the same workspace-backed location.
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Djava.io.tmpdir=$TMPDIR"

# Config
API_URL="${EXPO_PUBLIC_API_URL:-http://10.0.2.2:18081}"
APK_PATH="${1:-./dist/release.apk}"
FLOWS_DIR="${2:-./maestro/flows}"

echo "→ e2e: API=$API_URL APK=$APK_PATH FLOWS=$FLOWS_DIR"

if [[ -z "${MAESTRO_EMAIL:-}" || -z "${MAESTRO_PASSWORD:-}" ]]; then
  echo "✗ Missing fixture credentials. Run ./scripts/test-platform.sh, or set MAESTRO_EMAIL and MAESTRO_PASSWORD."
  exit 1
fi

# Check ADB + emulator
if ! adb devices | grep -q "device$"; then
  echo "✗ No emulator device found. Run: ./scripts/emulator.sh &"
  adb devices
  exit 1
fi

# Check API (host or emulator loopback)
if ! curl -sf http://localhost:18081/health >/dev/null 2>&1 && ! curl -sf "$API_URL/health" >/dev/null 2>&1; then
  echo "✗ API not reachable at $API_URL or localhost:18081"
  echo "  Ensure: cd ../settlr-api && docker compose -f docker-compose.yml -f docker-compose.local.yml up -d"
  exit 1
fi
echo "✓ API reachable"

# Check Maestro
if ! command -v maestro >/dev/null 2>&1; then
  echo "✗ maestro not found. Install: curl -Ls https://get.maestro.mobile.dev | bash"
  exit 1
fi

# Install APK if exists, else build
if [[ -f "$APK_PATH" ]]; then
  echo "→ Installing $APK_PATH ..."
  adb install -r "$APK_PATH"
else
  echo "→ No APK at $APK_PATH, building a bundled x86_64 release APK..."
  if [[ -d ./android ]]; then
    export EXPO_PUBLIC_API_URL="$API_URL"
    # Worklets is a Prefab dependency of gesture-handler. Build it first so
    # parallel native-task scheduling cannot link gesture-handler before
    # libworklets.so exists.
    ./android/gradlew -p android --no-daemon -PreactNativeArchitectures=x86_64 \
      :react-native-worklets:externalNativeBuildRelease assembleRelease
    APK_PATH="./android/app/build/outputs/apk/release/app-release.apk"
    adb install -r "$APK_PATH"
  else
    echo "✗ No APK and no android/ dir. Build first:"
    echo "  npx expo prebuild --platform android --clean && EXPO_PUBLIC_API_URL=$API_URL ./android/gradlew -p android -PreactNativeArchitectures=x86_64 assembleRelease"
    exit 1
  fi
fi

# Warm up app
adb shell am start -n com.settlr.app/.MainActivity || true
sleep 5

# Run Maestro flows
if [[ -d "$FLOWS_DIR" || -f "$FLOWS_DIR" ]]; then
  echo "→ Running Maestro flows in $FLOWS_DIR ..."
  maestro test "$FLOWS_DIR" --format junit --output ./maestro/report.xml || {
    echo "✗ Maestro flows failed — see ./maestro/report.xml and screenshots"
    exit 1
  }
  echo "✓ All Maestro flows passed"
else
  echo "✗ Maestro flow path not found: $FLOWS_DIR"
  exit 1
fi
