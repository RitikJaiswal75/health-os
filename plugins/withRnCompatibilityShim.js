const fs = require('fs');
const path = require('path');
const { withDangerousMod, createRunOncePlugin } = require('@expo/config-plugins');

const COMPAT_SOURCE = `package expo.modules.rncompatibility

import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags as RNFeatureFlags

object ReactNativeFeatureFlags {
  val enableBridgelessArchitecture: Boolean
    get() = RNFeatureFlags.enableBridgelessArchitecture()
}
`;

function withRnCompatibilityShim(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const destDir = path.join(
        config.modRequest.projectRoot,
        'android/app/src/main/java/expo/modules/rncompatibility',
      );
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, 'ReactNativeFeatureFlags.kt'), COMPAT_SOURCE);
      return config;
    },
  ]);
}

module.exports = createRunOncePlugin(withRnCompatibilityShim, 'rn-compatibility-shim', '1.0.0');
