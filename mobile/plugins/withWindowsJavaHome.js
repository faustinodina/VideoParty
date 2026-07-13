// Pins gradle to Android Studio's bundled JDK 17 (JBR). This used to be a
// manual gradle.properties edit that `expo prebuild --clean` kept erasing;
// as a config plugin it survives every prebuild. Forward slashes are valid
// in gradle.properties on Windows and need no escaping.
const { withGradleProperties } = require("expo/config-plugins");

const JAVA_HOME = "C:/Program Files/Android/Android Studio/jbr";

module.exports = (config) =>
  withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.java.home")
    );
    config.modResults.push({
      type: "property",
      key: "org.gradle.java.home",
      value: JAVA_HOME,
    });
    return config;
  });
