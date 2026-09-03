const { execSync } = require('child_process');
const out = process.env.OUT || (typeof env !== 'undefined' ? env.OUT : undefined);
console.log(`Capturing screenshot to ${out}`);
try {
  execSync(`/home/wizard/Android/Sdk/platform-tools/adb exec-out screencap -p > "${out}"`, { stdio: 'inherit' });
  console.log(`Captured ${out}`);
} catch (e) {
  console.error(`Failed to capture ${out}: ${e.message}`);
}
