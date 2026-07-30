/**
 * Builds a release AAB for Google Play and copies it to dist/.
 * Runs Gradle from the android/ subdirectory with the production API URL.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const androidDir = path.join(root, "android");

console.log("Building release AAB…");
const gradlew = path.join(androidDir, "gradlew.bat");
execSync(`"${gradlew}" bundleRelease`, {
  cwd: androidDir,
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: "https://videoparty.fly.dev",
  },
});

const source = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "bundle",
  "release",
  "app-release.aab"
);
const distDir = path.join(root, "dist");
const target = path.join(distDir, "videoparty-prod.aab");

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`AAB copied to ${target}`);
