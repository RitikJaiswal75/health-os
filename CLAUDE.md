# Health OS — project scripts

Local quality gate (no CI in v1):

```bash
npm run quality
```

Key scripts:
- `npm start` — Expo dev server
- `npm run ingest-cdci` — build local india.db for worker D1 seeding
- `npm run export-india-d1` — export seed SQL for Cloudflare D1
- `npm run typecheck` — TypeScript strict check
- `npm test` — Jest unit tests

Stack: Expo SDK 57, TypeScript, React Native Paper, Drizzle + expo-sqlite, durable Documents/HealthOS storage.
