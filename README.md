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

## Platform notes

- **Android:** FSI-first alarm auto-open via native `AlarmManager.setAlarmClock`. Notification fallback only when FSI cannot be granted.
- **iOS:** Notification-then-tap only. Does not auto-open when killed.

## Data storage

User database and pill photos live in durable `Documents/HealthOS/` — survives Clear cache and Clear data on Android.
