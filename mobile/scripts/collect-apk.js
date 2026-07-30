/**
 * Copies the freshly built APK into dist/ with the CPU architecture and
 * variant in the file name. `expo run:android` always writes the same
 * app-{variant}.apk but only includes the ABI of the device it targeted,
 * so without the rename it's impossible to tell a phone build (arm64-v8a)
 * from an emulator build (x86_64) — installing the wrong one crashes on
 * startup with a missing-native-library error.
 *
 * Usage: node scripts/collect-apk.js <arch> [variant]
 *   arch:    arm64-v8a | x86_64
 *   variant: debug (default) | release
 */
const fs = require("fs");
const path = require("path");

const arch = process.argv[2];
const variant = process.argv[3] ?? "debug";

if (!arch) {
  console.error("Usage: node scripts/collect-apk.js <arch> [variant]");
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
  variant,
  `app-${variant}.apk`
);
const distDir = path.join(__dirname, "..", "dist");
const label = variant === "release" ? "prod" : "dev";
const target = path.join(distDir, `videoparty-${label}-${arch}.apk`);

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`APK copied to ${target}`);
