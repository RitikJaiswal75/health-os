#!/usr/bin/env node
/**
 * Local prebuild check: grep android manifest and Gradle wiring after prebuild.
 * Usage: npm run prebuild && npm run verify-android-manifest
 */
const fs = require('fs');
const path = require('path');

const androidRoot = path.join(__dirname, '..', 'android');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const appGradlePath = path.join(androidRoot, 'app', 'build.gradle');
const rootGradlePath = path.join(androidRoot, 'build.gradle');

if (!fs.existsSync(manifestPath)) {
  console.error('AndroidManifest.xml not found. Run: npm run prebuild');
  process.exit(1);
}

const xml = fs.readFileSync(manifestPath, 'utf8');
const appGradle = fs.existsSync(appGradlePath) ? fs.readFileSync(appGradlePath, 'utf8') : '';
const rootGradle = fs.existsSync(rootGradlePath) ? fs.readFileSync(rootGradlePath, 'utf8') : '';

function hasGoogleServicesConfig() {
  if (process.env.GOOGLE_SERVICES_JSON && fs.existsSync(process.env.GOOGLE_SERVICES_JSON)) {
    return true;
  }
  return fs.existsSync(path.join(__dirname, '..', 'google-services.json'));
}

const checks = [
  ['BOOT_COMPLETED', xml, /BOOT_COMPLETED/],
  ['MedicationAlarmReceiver', xml, /MedicationAlarmReceiver/],
  ['SCHEDULE_EXACT_ALARM', xml, /SCHEDULE_EXACT_ALARM/],
  ['USE_FULL_SCREEN_INTENT', xml, /USE_FULL_SCREEN_INTENT/],
  ['Sentry NDK exclude', appGradle, /sentry-android-ndk/],
  ['Play Services Auth exclude', appGradle, /play-services-auth/],
  ['Sentry Gradle script', appGradle, /sentry\.gradle/],
];

if (hasGoogleServicesConfig()) {
  checks.push(
    ['Google Services plugin', appGradle, /com\.google\.gms\.google-services/],
    ['Crashlytics Gradle plugin', appGradle, /com\.google\.firebase\.crashlytics/],
    ['Google Services classpath', rootGradle, /com\.google\.gms:google-services/],
    ['Crashlytics classpath', rootGradle, /com\.google\.firebase:firebase-crashlytics-gradle/],
  );
} else {
  console.warn(
    'SKIP: Firebase Gradle checks (google-services.json missing — Crashlytics not wired in this build)',
  );
}

let failed = false;
for (const [name, haystack, pattern] of checks) {
  if (!haystack || !pattern.test(haystack)) {
    console.error(`MISSING: ${name}`);
    failed = true;
  } else {
    console.log(`OK: ${name}`);
  }
}

process.exit(failed ? 1 : 0);
