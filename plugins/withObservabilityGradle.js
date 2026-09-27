const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EXCLUDES = `
// health-os observability excludes
configurations.configureEach {
    exclude group: "io.sentry", module: "sentry-android-ndk"
    exclude group: "io.sentry", module: "sentry-native-ndk"
    exclude group: "com.google.android.gms", module: "play-services-auth"
}
`.trim();

function withObservabilityGradle(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const gradlePath = path.join(config.modRequest.platformProjectRoot, 'app', 'build.gradle');
      if (!fs.existsSync(gradlePath)) return config;
      const contents = fs.readFileSync(gradlePath, 'utf8');
      if (contents.includes('health-os observability excludes')) return config;
      fs.writeFileSync(gradlePath, `${contents.trim()}\n\n${EXCLUDES}\n`);
      return config;
    },
  ]);
}

module.exports = createRunOncePlugin(withObservabilityGradle, 'health-os-observability-gradle', '1.0.0');
