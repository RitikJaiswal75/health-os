/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

/** Plugins stripped from shareable release APKs (no dev menu / network inspector). */
const DEV_ONLY_PLUGINS = new Set([
  'expo-dev-client',
  './plugins/withDevClientMainApplication.js',
]);

function filterPlugins(plugins, shareable) {
  if (!shareable) {
    return plugins;
  }
  return plugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return !DEV_ONLY_PLUGINS.has(name);
  });
}

module.exports = () => {
  const shareable = process.env.SHAREABLE_APK === '1';
  const expo = {
    ...appJson.expo,
    plugins: filterPlugins(appJson.expo.plugins, shareable),
  };

  return {
    expo: {
      ...expo,
      extra: {
        ...expo.extra,
        indiaCatalogUrl:
          process.env.EXPO_PUBLIC_INDIA_CATALOG_URL ?? 'https://drugs.healthos.ritik.cc',
      },
    },
  };
};
