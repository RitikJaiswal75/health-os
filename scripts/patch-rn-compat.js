#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'rn-compat', 'ReactNativeFeatureFlags.kt');
const destDir = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'rncompatibility',
);
const dest = path.join(destDir, 'ReactNativeFeatureFlags.kt');

if (!fs.existsSync(source)) {
  console.warn('[patch-rn-compat] source missing, skipping');
  process.exit(0);
}

if (!fs.existsSync(path.join(__dirname, '..', 'node_modules', 'expo-modules-core'))) {
  console.warn('[patch-rn-compat] expo-modules-core not installed, skipping');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, dest);
console.log('[patch-rn-compat] installed ReactNativeFeatureFlags shim');
