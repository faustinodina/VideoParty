const { execSync } = require('child_process');

let gitCommit;
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  gitCommit = 'unknown';
}

// Extends app.json with build-time values. The function form receives the
// static config already merged from app.json, so nothing needs repeating here.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    gitCommit,
  },
});
