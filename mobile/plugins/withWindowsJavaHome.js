const { withGradleProperties, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const JAVA_HOME = "C:/Program Files/Android/Android Studio/jbr";

// Resolve Android SDK path from env or the standard Windows default.
function getSdkDir() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.LOCALAPPDATA)
    return path.join(process.env.LOCALAPPDATA, "Android", "Sdk");
  return null;
}

// Convert a Windows path to the Java properties format expected by local.properties:
// C:\Users\foo  →  C\:/Users/foo
function toPropertiesPath(p) {
  return p.replace(/\\/g, "/").replace(/:/, "\\:");
}

// Pins JBR in gradle.properties — survives every prebuild.
function withJavaHome(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.java.home")
    );
    config.modResults.push({ type: "property", key: "org.gradle.java.home", value: JAVA_HOME });
    return config;
  });
}

// Writes sdk.dir to local.properties — also survives every prebuild.
function withSdkDir(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const sdkDir = getSdkDir();
      if (!sdkDir) return config;

      const localPropsPath = path.join(
        config.modRequest.platformProjectRoot,
        "local.properties"
      );

      let contents = fs.existsSync(localPropsPath)
        ? fs.readFileSync(localPropsPath, "utf8")
        : "";

      // Replace existing sdk.dir line or prepend a new one.
      const line = `sdk.dir=${toPropertiesPath(sdkDir)}`;
      if (/^sdk\.dir=/m.test(contents)) {
        contents = contents.replace(/^sdk\.dir=.*$/m, line);
      } else {
        contents = line + "\n" + contents;
      }

      fs.writeFileSync(localPropsPath, contents, "utf8");
      return config;
    },
  ]);
}

module.exports = (config) => withSdkDir(withJavaHome(config));
