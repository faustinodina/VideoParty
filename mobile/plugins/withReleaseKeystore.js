// Wires mobile/keystore.properties into the Android release signing config.
// keystore.properties and the .jks file must NOT be committed (both gitignored).
// Run `npx expo prebuild --platform android` after adding keystore.properties.
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = (config) =>
  withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes("keystorePropertiesFile")) return config;

    // 1. Load keystore.properties from the mobile/ dir (two levels up from android/app/)
    //    projectRoot is already defined in build.gradle as the mobile/ directory.
    gradle = gradle.replace(
      "\nandroid {",
      `
def keystorePropertiesFile = new File(projectRoot, 'keystore.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {`
    );

    // 2. Add a release signing config after the debug block inside signingConfigs
    gradle = gradle.replace(
      `        }
    }
    buildTypes {`,
      `        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile new File(projectRoot, keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {`
    );

    // 3. Use release signingConfig in the release build type; fall back to debug when
    //    keystore.properties is absent (local dev without the file present).
    gradle = gradle.replace(
      `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
      `            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`
    );

    config.modResults.contents = gradle;
    return config;
  });
