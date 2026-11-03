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
- `npm run typecheck:tests` — type-check `__tests__` (ts-jest only transpiles)
- `npm test` — Jest unit tests
- `npm run test:changed` — Jest on files changed since last commit

## Running checks (machine load)

- Never run typecheck, jest and eslint in one chained command.
- Jest is capped at 2 workers in the `jest` config in `package.json`; no flag needed. Prefer `--onlyChanged` or a specific file.
- Run jest, typecheck and eslint without asking (allowed in `.claude/settings.json`), one at a time.

Stack: Expo SDK 57, TypeScript, React Native Paper, Drizzle + expo-sqlite, durable Documents/HealthOS storage.
