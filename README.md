# Health OS

Local-first medicine and supplement tracker built with Expo, React Native Paper, and TypeScript.

## Local quality gate (no CI in v1)

```bash
npm run typecheck && npm run lint && npm test
```

Or use the combined script:

```bash
npm run quality
```

## Development

```bash
npm install
npm run ingest-cdci   # build bundled India catalog
npx expo start
```

### Shareable Android APK

The default release build targets **arm64 phones only** (~41 MB), without the dev client:

```bash
npm run android:apk
# → dist/health-os-release.apk
```

After a shareable build, restore the dev-client native project before `npm run android`:

```bash
npm run prebuild:android
```

A universal APK (all CPU ABIs, ~118 MB) is available as `npm run android:apk:universal` if you need emulator x86 support.

## Platform notes

- **Android:** FSI-first alarm auto-open via native `AlarmManager.setAlarmClock`. Notification fallback only when FSI cannot be granted.
- **iOS:** Notification-then-tap only. Does not auto-open when killed.

## Data storage

User database and pill photos live in durable `Documents/HealthOS/` — survives Clear cache and Clear data on Android.
