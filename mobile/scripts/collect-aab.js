/**
 * Copies the freshly built release AAB into dist/.
 * Unlike APKs, AABs are architecture-independent so no ABI suffix is needed.
 */
const fs = require("fs");
const path = require("path");

const source = path.join(
  __dirname,
  "..",
  "android",
  "app",
  "build",
  "outputs",
  "bundle",
  "release",
  "app-release.aab"
);
const distDir = path.join(__dirname, "..", "dist");
const target = path.join(distDir, "videoparty-prod.aab");

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`AAB copied to ${target}`);
