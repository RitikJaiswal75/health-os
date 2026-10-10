# Config-driven app update banner

Add a remotely configured app-update check, served from the existing app-config Cloudflare worker. Installs older than `latestVersion` get a dismissable banner (Later / Skip this version / Update). Installs older than `minSupportedVersion` get a full-screen blocking overlay that leads to the Play Store.

**Distribution:** the Play Store is the only update channel. The GitHub Releases APK from [release-apk.yml](../.github/workflows/release-apk.yml) is temporary and goes away once closed and internal testing on Play are done. Until the production listing is public, keep `latestVersion` at the current version so nobody gets sent to a store page they can't open.

## Implementation todos

- [x] Add versionCompare, appUpdateSchema, updateDecision with unit tests (TDD)
- [x] Generalize configLoader into fetchRemoteConfig; observability and app-update both use it
- [x] Add /v1/app-update route + --kind flag to config-set, README, worker tests
- [x] Add appUpdateStore (later/skip persistence), openStore, loader tests
- [x] Build AppUpdateBanner (Today tab) and ForceUpdateOverlay (root, hidden on /reminder, BackHandler block), mount AppUpdateBootstrap
- [x] Add update.* keys to en.ts and website i18n catalogs
- [x] Add scripts/check-version-bump.ts (+ tests, semver and versionCode), config:set --validate-only, and .github/workflows/pr-checks.yml with paths-filter
- [x] Add workers/app-config/config/app-update.json and .github/workflows/deploy-app-config.yml (wrangler deploy + KV put on merge, smoke check that compares served vs committed), README secrets setup
- [x] Run npm run quality and fix issues

## Config shape (KV key `app-update`, served at `GET /v1/app-update`)

```json
{
  "version": 1,
  "android": {
    "latestVersion": "2.1.0",
    "minSupportedVersion": "2.0.2",
    "storeUrl": "https://play.google.com/store/apps/details?id=com.health.os"
  }
}
```

- The config is keyed by platform (`android` is the only key required today). A platform with no entry means no update prompt on that platform.
- **`minSupportedVersion` (optional):** any install strictly below it is forced to update. Leave it out to force nobody.
- **Worked example:** `latestVersion: "2.1.0"`, `minSupportedVersion: "2.0.2"`:
  - `2.0.1`, `2.0.0`, `1.x`: force update (blocking overlay)
  - `2.0.2` up to but not including `2.1.0`: optional banner
  - `2.1.0` and above (for example closed-track testers ahead of production): no prompt
- **Validation:** `minSupportedVersion <= latestVersion`. This stops a bad config from blocking users who are already on the latest version. The same parser runs in the app, the worker, and the `config:set` script.
- **Forward compatibility:** the installs you most need to force are the oldest ones, so their parser must keep accepting newer configs. `parseAppUpdateConfig` ignores unknown keys and validates only the fields it reads. Never change `version: 1` in a way that would make an old parser reject the config. Add new behaviour as new optional fields.
- **Bundled default:** no config, which means no prompt. The app never blocks users because a fetch failed.

## Decision logic (pure function)

```mermaid
flowchart TD
  start[currentVersion from expoConfig] --> floorCheck{"current < minSupportedVersion?"}
  floorCheck -->|yes| force[force: blocking overlay]
  floorCheck -->|no| latestCheck{"current < latestVersion?"}
  latestCheck -->|no| none[none]
  latestCheck -->|yes| skipCheck{"skippedVersion == latestVersion or Later tapped this session?"}
  skipCheck -->|yes| none
  skipCheck -->|no| optional[optional: dismissable banner]
```

- Versions are compared numerically, part by part (`2.10.0 > 2.9.0`). Missing parts count as 0. A malformed current version is treated as `none`, and a malformed config version is rejected by the schema. Pre-release suffixes (`2.1.0-beta.1`) count as malformed, so those builds never get a prompt.
- **Later** is kept in memory only, so the banner comes back on the next launch. **Skip this version** saves `latestVersion` to disk, so the banner stays hidden until you publish a newer `latestVersion`. Skip never suppresses a force update.

## Worker changes: [workers/app-config/src/index.ts](../workers/app-config/src/index.ts)

- Refactor the handler into a small route table: `/v1/observability` maps to KV key `observability`, and `/v1/app-update` maps to KV key `app-update`. Each route has its own parser and default. Reuse the existing ETag, 304, CORS, and `Cache-Control` code.
- [workers/app-config/scripts/config-set.ts](../workers/app-config/scripts/config-set.ts): add `--kind observability|app-update` (default `observability`) to choose the parser and KV key. Add `--validate-only`, which parses the file and exits without writing (CI uses it on PRs).
- New committed source of truth: `workers/app-config/config/app-update.json`. The initial content is `latestVersion: "2.0.2"` with no `minSupportedVersion`, so the first deploy prompts nobody. Add a README section.

## App: new module `src/features/appUpdate/`

- `versionCompare.ts`: `parseVersion` and `compareVersions`.
- `appUpdateSchema.ts`: `parseAppUpdateConfig` and `BUNDLED_DEFAULT_APP_UPDATE_CONFIG`. The worker imports this file, the same way it imports `configSchema.ts` today.
- `updateDecision.ts`: `resolveUpdateState(currentVersion, platformConfig, { skippedVersion, laterDismissed })` returns `'force' | 'optional' | 'none'`.
- Loader: generalize [src/core/observability/configLoader.ts](../src/core/observability/configLoader.ts) into `fetchRemoteConfig({ path, parse, cacheKey, etagKey })` (10s timeout, ETag/304, cached last-good config). Observability and app-update both call it instead of keeping two copies.
- `appUpdateStore.ts` (zustand): holds `config`, `laterDismissed`, `skippedVersion`, `dismissLater()`, `skip()`. It hydrates from cache synchronously, so a force update still applies offline. Persistence goes through `readObservabilityKv` / `writeObservabilityKv` from [src/core/observability/observabilityDb.ts](../src/core/observability/observabilityDb.ts), using keys `app_update_config`, `app_update_etag`, and `app_update_skipped`.
- `openStore.ts`: opens `market://details?id=com.health.os` first, then falls back to the config `storeUrl` through `Linking.openURL`. Errors are reported through `crashReporter`.
- `AppUpdateBootstrap.tsx`: refreshes on mount and whenever `AppState` returns to `active`, so a user coming back from the Play Store gets re-evaluated.

## UI

- `src/core/components/AppUpdateBanner.tsx`: a Paper `Banner` in the same style as [ReminderPermissionBanner.tsx](../src/core/components/ReminderPermissionBanner.tsx), with the actions Later, Skip this version, and Update. It renders only on the Today tab ([app/(tabs)/index.tsx](../app/(tabs)/index.tsx)), above the permission banner, so users are not nagged on every screen.
- `src/core/components/ForceUpdateOverlay.tsx`: an absolutely positioned full-screen `View` with the logo, a title, the body text, and a single Update button. It blocks all touches and has no dismiss action. On Android, `BackHandler` is intercepted while the overlay is visible.
- The overlay is mounted in [app/_layout.tsx](../app/_layout.tsx) inside `RootNavigation`, after `<Stack>`. **It is hidden on the `/reminder` route**, so medication alarms can always be acknowledged even on an unsupported build.
- Mount `<AppUpdateBootstrap />` next to `<ObservabilityBootstrap />` in [app/_layout.tsx](../app/_layout.tsx).

## i18n

- Add these keys to [src/i18n/en.ts](../src/i18n/en.ts): `update.optional.body`, `update.later`, `update.skip`, `update.now`, `update.force.title`, `update.force.body`. Add the same keys to every `website/public/i18n/*.json` catalog. English fallback covers any locale that is missing a key.

## Tests (`__tests__/appUpdate/`)

- `versionCompare.test.ts`: ordering, missing parts, `2.10` vs `2.9`, malformed input, pre-release suffix.
- `appUpdateSchema.test.ts`: valid config; config without `minSupportedVersion`; rejects `minSupportedVersion > latestVersion`; rejects bad semver, a missing platform shape, and a wrong `version` field; **accepts and ignores unknown keys** (forward compatibility).
- `updateDecision.test.ts`: force below the minimum; not forced at the minimum; optional below latest; none at or above latest; skip and Later hide optional but not force; no platform config.
- Loader tests (shared `fetchRemoteConfig`): 200 caches the config, 304 returns the cached config, network error returns null. Existing observability loader tests keep passing.
- Extend [__tests__/observability/workerHandler.test.ts](../__tests__/observability/workerHandler.test.ts): the `/v1/app-update` route returns the stored config or the default, and returns ETag/304.
- Run `npm run quality`.

## CI pipelines (GitHub Actions)

```mermaid
flowchart LR
  pr[Pull request] --> filter{"app paths changed?"}
  filter -->|yes| bump[check-version-bump]
  filter -->|no| skipBump[pass]
  pr --> cfgChanged{"app-update.json changed?"}
  cfgChanged -->|yes| validate[validate config]
  merge[Push to main] --> deployCfg{"app-update.json changed?"}
  deployCfg -->|yes| kvPut["config:set --kind app-update --remote"]
  merge --> deployWorker{"worker src changed?"}
  deployWorker -->|yes| wranglerDeploy[wrangler deploy]
```

### PR check: `.github/workflows/pr-checks.yml` (`on: pull_request` to `main`)

- The job always runs; there is no workflow-level `paths:` filter. A skipped workflow leaves a required check stuck on "pending", so the job must always report a result. `dorny/paths-filter@v3` sets two outputs:
  - `app`: `app/**`, `src/**`, `modules/**`, `plugins/**`, `assets/**`, `package.json`, `package-lock.json`, `expo.base.json`, `app.config.js`. Keep this list identical to the paths in [release-apk.yml](../.github/workflows/release-apk.yml) while that workflow exists; once the GitHub APK is retired, this becomes the only copy.
  - `updateConfig`: `workers/app-config/config/app-update.json`, `src/features/appUpdate/**`
- **Version bump step** (runs when `app` is true): `npx tsx scripts/check-version-bump.ts`. The script:
  - Reads the base `expo.base.json` with `git show origin/${{ github.base_ref }}:expo.base.json` (checkout uses `fetch-depth: 0`), and reads the head version from the working tree.
  - Fails unless `compareVersions(head.version, base.version) > 0`, reusing `src/features/appUpdate/versionCompare.ts`.
  - Fails unless `android.versionCode` head > base. Play rejects an upload whose versionCode isn't higher, so this catches it at PR time instead of at manual upload time.
  - Fails unless `package.json` `version` equals the `expo.base.json` version, since today both are `2.0.2` and should not drift.
  - Prints a clear message, for example: `expo.base.json version 2.0.2 (versionCode 5) must be greater than main (2.0.2, 5). Bump both or remove app changes.`
- **Config validation step** (runs when `updateConfig` is true): `npm run config:set -- config/app-update.json --kind app-update --validate-only`, plus a check that `android.latestVersion` is less than or equal to the head `expo.base.json` version. This stops anyone from advertising a version that doesn't exist yet.
- Unit tests: `__tests__/scripts/checkVersionBump.test.ts` covers the pure compare/format logic, which is exported from the script.

### Deploy on merge: `.github/workflows/deploy-app-config.yml` (`on: push` to `main`)

- Uses `paths:` `workers/app-config/**`, `src/features/appUpdate/**`, and `src/core/observability/configSchema.ts` (the worker imports it). This workflow is not a required check, so a path filter is fine here.
- `concurrency: deploy-app-config`, without cancel-in-progress, so KV writes happen in merge order.
- Steps: checkout (with `fetch-depth: 2`), Node 22, `npm ci` at the repo root (the worker scripts import `src/`), then `npm ci` in `workers/app-config`.
- Uses `dorny/paths-filter` again, with `base: ${{ github.event.before }}`:
  - Worker src, `src/features/appUpdate/**`, or `configSchema.ts` changed: run `npx wrangler deploy`. This runs first, so the `/v1/app-update` route exists before the KV write.
  - `config/app-update.json` changed: run `npm run config:set -- config/app-update.json --kind app-update --remote`.
  - **Smoke check:** fetch `https://config.healthos.ritik.cc/v1/app-update` and fail unless the served `android.latestVersion` and `android.minSupportedVersion` match the committed file. A plain `curl -f` is not enough, because the worker returns 200 with the bundled default when the KV value fails to parse.
- Secrets: `CLOUDFLARE_API_TOKEN` (scoped to Workers Scripts:Edit and Workers KV Storage:Edit) and `CLOUDFLARE_ACCOUNT_ID`, passed as env. No secrets are committed. Add setup notes to the worker README.

## Release workflow (documented in the worker README)

1. App PR: bump `version` and `android.versionCode` in [expo.base.json](../expo.base.json), and `version` in `package.json`. The PR check enforces this.
2. Build the `.aab` and upload it to Play manually.
3. **Wait until the release is live at 100% in the production track.** Until then, users who aren't in the rollout yet (and anyone, while the production listing isn't public) would be sent to a store page with no update.
4. Config PR: edit `workers/app-config/config/app-update.json` (`latestVersion`, and optionally `minSupportedVersion`). The PR check validates it, and the merge deploys it automatically.
5. To shut off old builds: raise `minSupportedVersion`. Every version below it is forced to update within about 15 minutes of its next launch or foreground.
   - **Before raising it**, check that the target version's `minSdk` hasn't gone up. Users on older Android can't install the new version and would be locked out of their data. There is no data export to fall back on today.
6. **Emergency kill switch:** if a merge is too slow, run `npm run config:set -- config/app-update.json --kind app-update --remote` locally, then open a PR with the same change so the committed file matches what is deployed.
