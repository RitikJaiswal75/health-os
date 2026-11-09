# Health OS — project scripts

Local quality gate (CI runs typecheck + Jest before every APK build in `release-apk.yml`):

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
- `npm run version:patch|minor|major` — bump `expo.base.json` version + versionCode, `package.json`, `package-lock.json` and every `latestVersion` in `app-update.json`

## Running checks (machine load)

- Never run typecheck, jest and eslint in one chained command.
- Jest is capped at 2 workers in the `jest` config in `package.json`; no flag needed. Prefer `--onlyChanged` or a specific file.
- Run jest, typecheck and eslint without asking (allowed in `.claude/settings.json`), one at a time.

## Pre-commit hook (husky)

Installed by `npm install` (`prepare` script). `.husky/pre-commit` runs, in order:
1. `scripts/hooks/checkStaged.js` on the staged snapshot: blocks secrets (`.env*`, keystores, credential files, `google-services.json`), APK/AAB, files > 5 MB, conflict markers, `.only`/`fit` in tests, and ESLint errors in staged `.ts/.tsx`.
2. `scripts/bump-version.ts --if-needed`: when staged app changes still carry `origin/main`'s version, bumps from main (`BUMP=major|minor|patch git commit`, default patch) and stages the four version files. Refuses if those files have unstaged edits; does nothing if the version was already changed by hand.
3. `scripts/check-version-bump.ts --pre-commit`, only when staged files touch app paths (CI's `app` filter + `app-update.json`). Against local `origin/main` (no fetch): staged `expo.base.json` version and `android.versionCode` must be greater, `package.json` version must equal it, and every `latestVersion` in `workers/app-config/config/app-update.json` must equal it.
4. `npm run typecheck` (working tree), plus `typecheck:tests` when `__tests__` files are staged.

Bypass only when intentional: `git commit --no-verify`.

Stack: Expo SDK 57, TypeScript, React Native Paper, expo-sqlite (raw SQL, row types in `src/db/types.ts`), app-private HealthOS storage (`documentDirectory/HealthOS`).
