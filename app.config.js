/** @type {import('expo/config').ExpoConfig} */
const fs = require('fs');
const path = require('path');
const appJson = require('./expo.base.json');

/** Plugins stripped from shareable release APKs (no dev menu / network inspector). */
const DEV_ONLY_PLUGINS = new Set([
  'expo-dev-client',
  './plugins/withDevClientMainApplication.js',
]);

/** Firebase plugins require google-services.json at prebuild time. */
const FIREBASE_PLUGINS = new Set([
  '@react-native-firebase/app',
  '@react-native-firebase/crashlytics',
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

function filterFirebasePlugins(plugins, googleServicesFile) {
  if (googleServicesFile) return plugins;
  return plugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return !FIREBASE_PLUGINS.has(name);
  });
}

function resolveGoogleServicesFile() {
  const fromEnv = process.env.GOOGLE_SERVICES_JSON;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const localPath = path.join(process.cwd(), 'google-services.json');
  if (fs.existsSync(localPath)) return './google-services.json';
  return undefined;
}

module.exports = () => {
  const shareable = process.env.SHAREABLE_APK === '1';
  const googleServicesFile = resolveGoogleServicesFile();
  let plugins = filterPlugins(appJson.expo.plugins, shareable);
  plugins = filterFirebasePlugins(plugins, googleServicesFile);

  if (!googleServicesFile) {
    console.warn(
      '[health-os] google-services.json not found — Firebase/Crashlytics plugins skipped. ' +
        'Sentry still works. Download the file from Firebase (package com.health.os) into the repo root, then prebuild again for Crashlytics.',
    );
  }

  const expo = {
    ...appJson.expo,
    plugins,
  };

  return {
    expo: {
      ...expo,
      android: {
        ...expo.android,
        ...(googleServicesFile ? { googleServicesFile } : {}),
      },
      extra: {
        ...expo.extra,
        indiaCatalogUrl:
          process.env.EXPO_PUBLIC_INDIA_CATALOG_URL ?? 'https://drugs.healthos.ritik.cc',
        i18nBaseUrl: process.env.EXPO_PUBLIC_I18N_BASE_URL ?? 'https://healthos.ritik.cc/i18n',
        observabilityConfigUrl:
          process.env.EXPO_PUBLIC_OBSERVABILITY_CONFIG_URL ?? 'https://config.healthos.ritik.cc',
      },
    },
  };
};
