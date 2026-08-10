const { withAndroidManifest } = require("expo/config-plugins");

// Restricts Play Store listing to phones by declaring screen size support.
// largestWidthLimitDp=600 is the standard phone/tablet boundary; tablets
// (7" and 10") have a smallest width >= 600dp and won't see the app.
module.exports = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest["supports-screens"] = [
      {
        $: {
          "android:smallScreens": "true",
          "android:normalScreens": "true",
          "android:largeScreens": "false",
          "android:xlargeScreens": "false",
          "android:largestWidthLimitDp": "600",
        },
      },
    ];
    return config;
  });
