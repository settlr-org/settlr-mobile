#!/usr/bin/env bash
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

AVD="${1:-settlr}"
echo "→ Booting AVD: $AVD ..."
if ! emulator -list-avds | grep -qx "$AVD"; then
  echo "AVD $AVD not found. Available:"
  emulator -list-avds
  exit 1
fi

# Kill any stale emulator
adb devices | grep emulator | cut -f1 | xargs -r adb -s {} emu kill 2>/dev/null || true
sleep 2

emulator -avd "$AVD" -no-window -no-audio -gpu swiftshader_indirect -no-snapshot-save &
EMU_PID=$!
echo "  emulator pid $EMU_PID, waiting for boot..."

adb wait-for-device
# Wait for sys.boot_completed
timeout 120 bash -c 'while [[ -z $(adb shell getprop sys.boot_completed 2>/dev/null | tr -d "\r") ]]; do sleep 2; echo -n "."; done'
echo ""
# Additional wait for package manager
adb shell 'while [[ -z $(getprop sys.boot_completed | tr -d "\r") ]]; do sleep 1; done;'
sleep 3
adb shell input keyevent 82 || true  # dismiss lock screen
echo "✓ Emulator ready: $(adb devices | grep emulator)"
echo "  AVD: $AVD | PID: $EMU_PID"
echo "  Stop with: adb emu kill  or  kill $EMU_PID"
wait $EMU_PID 2>/dev/null || true
