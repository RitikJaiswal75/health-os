const { withMainApplication } = require('@expo/config-plugins');

const PACKAGE_IMPORT = 'import com.healthos.alarm.MedicationAlarmPackage';
const PACKAGE_ADD = 'add(MedicationAlarmPackage())';

const REACT_NATIVE_HOST_BLOCK = `
  private fun buildPackageList(): List<ReactPackage> =
    PackageList(this).packages.apply {
      ${PACKAGE_ADD}
    }

  @Suppress("DEPRECATION")
  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> = buildPackageList()

      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    }
`;

function withDevClientMainApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('DefaultReactNativeHost')) {
      contents = contents.replace(
        /import com\.facebook\.react\.defaults\.DefaultNewArchitectureEntryPoint/,
        `import com.facebook.react.ReactNativeHost\nimport com.facebook.react.defaults.DefaultNewArchitectureEntryPoint\nimport com.facebook.react.defaults.DefaultReactNativeHost`,
      );
    }

    if (!contents.includes('override val reactNativeHost')) {
      contents = contents.replace(
        /class MainApplication : Application\(\), ReactApplication \{\n\n/,
        `class MainApplication : Application(), ReactApplication {\n${REACT_NATIVE_HOST_BLOCK}\n`,
      );
    }

    if (!contents.includes(PACKAGE_IMPORT)) {
      contents = contents.replace(
        /import com\.facebook\.react\.ReactApplication/,
        `import com.facebook.react.ReactApplication\n${PACKAGE_IMPORT}`,
      );
    }

    if (contents.includes('override val reactHost')) {
      const reactHostUsesBuildPackageList =
        /override val reactHost[\s\S]*?packageList\s*=\s*buildPackageList\(\)/.test(contents);
      if (!reactHostUsesBuildPackageList) {
        contents = contents.replace(
          /packageList\s*=\s*\n\s*PackageList\(this\)\.packages\.apply \{[\s\S]*?\}/,
          'packageList = buildPackageList()',
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withDevClientMainApplication;
