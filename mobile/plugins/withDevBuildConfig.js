// Gives the debug build a distinct package name and app label so the dev
// build and the production build can coexist on the same device.
//   dev:  com.faustinodina.videoparty.dev  "VideoParty Dev"
//   prod: com.faustinodina.videoparty       "VideoParty"
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = (config) =>
  withAppBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;

    // Inject into the debug block only if not already present.
    if (!gradle.includes('applicationIdSuffix ".dev"')) {
      config.modResults.contents = gradle.replace(
        /buildTypes\s*\{[\s\S]*?debug\s*\{/,
        (match) =>
          match +
          '\n            applicationIdSuffix ".dev"' +
          '\n            resValue "string", "app_name", "VideoParty Dev"'
      );
    }

    return config;
  });
