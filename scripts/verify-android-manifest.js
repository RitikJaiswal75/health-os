#!/usr/bin/env node
/**
 * Local prebuild check: grep android manifest for BOOT_COMPLETED after prebuild.
 * Usage: npm run prebuild && npm run verify-android-manifest
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error('AndroidManifest.xml not found. Run: npm run prebuild');
  process.exit(1);
}

const xml = fs.readFileSync(manifestPath, 'utf8');
const checks = [
  ['BOOT_COMPLETED', /BOOT_COMPLETED/],
  ['MedicationAlarmReceiver', /MedicationAlarmReceiver/],
  ['SCHEDULE_EXACT_ALARM', /SCHEDULE_EXACT_ALARM/],
  ['USE_FULL_SCREEN_INTENT', /USE_FULL_SCREEN_INTENT/],
];

let failed = false;
for (const [name, pattern] of checks) {
  if (!pattern.test(xml)) {
    console.error(`MISSING: ${name}`);
    failed = true;
  } else {
    console.log(`OK: ${name}`);
  }
}

process.exit(failed ? 1 : 0);
