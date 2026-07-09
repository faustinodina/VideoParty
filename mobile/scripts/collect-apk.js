/**
 * Copies the freshly built debug APK into dist/ with the CPU architecture
 * in the file name. `expo run:android` always writes the same
 * app-debug.apk but only includes the ABI of the device it targeted, so
 * without the rename it's impossible to tell a phone build (arm64-v8a)
 * from an emulator build (x86_64) — installing the wrong one crashes on
 * startup with a missing-native-library error.
 */
const fs = require("fs");
const path = require("path");

const arch = process.argv[2];
if (!arch) {
  console.error("Usage: node scripts/collect-apk.js <arch>");
  process.exit(1);
}

const source = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk"
);
const distDir = path.join(__dirname, "..", "dist");
const target = path.join(distDir, `videoparty-dev-${arch}.apk`);

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`APK copied to ${target}`);
