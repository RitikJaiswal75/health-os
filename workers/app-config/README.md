# App config worker

Cloudflare Worker + KV that serves **crash-reporting provider config** so Health OS can switch Sentry / Crashlytics without an app release.

**Production URL:** `https://config.healthos.ritik.cc`

The app reads `GET /v1/observability` at launch (cached 15 minutes). Every named provider in `primary` and `fallback` receives each report. Set `fallback` to `"none"` for a single provider. A provider-list change is a KV write, not a store update. Native crash handlers still flip on the **next app launch**.

## One-time setup

You already have a Cloudflare account and `healthos.ritik.cc` on the same zone as the India catalog worker. This Worker is the same shape with KV instead of D1.

```bash
# 1. Install worker deps
cd workers/app-config
npm install

# 2. Confirm wrangler is logged in (skip login if this prints your account)
npx wrangler whoami
# If not logged in:
# npx wrangler login

# 3. Create the KV namespace and paste the printed id into wrangler.toml
#    Replace <paste-id-here> under [[kv_namespaces]].
npx wrangler kv namespace create APP_CONFIG

# 4. Write the first config. --remote is required — without it wrangler
#    writes a local simulator and production stays empty.
#    Keep sentryDsn empty until the Sentry project exists.
npm run config:set -- example.config.json --remote

# 5. Deploy (creates config.healthos.ritik.cc DNS + TLS on first deploy)
npm run deploy

# 6. Verify. DNS/TLS can take a minute on the first deploy.
curl https://config.healthos.ritik.cc/health
curl https://config.healthos.ritik.cc/v1/observability
```

`npm run config:set` validates JSON against the **same schema the app uses** before writing. Do not hand-edit KV with raw `wrangler kv key put` — a typo there reaches every installed app.

Copy the base URL (no path) into `.env` at the repo root if you need to override the default:

```
EXPO_PUBLIC_OBSERVABILITY_CONFIG_URL=https://config.healthos.ritik.cc
```

Restart Expo after changing `.env`.

Full Sentry / Firebase / EAS account steps: [`docs/OBSERVABILITY-SETUP.md`](../../docs/OBSERVABILITY-SETUP.md).

## Changing the provider later

No app release. Validated write, then wait up to 15 minutes (or restart the app after it refreshes):

```bash
cd workers/app-config
# Edit example.config.json (or a copy), then:
npm run config:set -- example.config.json --remote
```

Read back what is live:

```bash
npm run config:get
```

Example: Sentry and Crashlytics both receive every report:

```json
{
  "version": 1,
  "enabled": true,
  "primary": "sentry",
  "fallback": "crashlytics",
  "captureNonFatal": true,
  "sampleRate": 1.0,
  "sentryDsn": "https://PUBLIC_KEY@o0.ingest.de.sentry.io/PROJECT_ID"
}
```

Example: Crashlytics only (no Sentry):

```json
{
  "version": 1,
  "enabled": true,
  "primary": "crashlytics",
  "fallback": "none",
  "captureNonFatal": true,
  "sampleRate": 1.0,
  "sentryDsn": ""
}
```

Example: Crashlytics and Sentry both receive every report:

```json
{
  "version": 1,
  "enabled": true,
  "primary": "crashlytics",
  "fallback": "sentry",
  "captureNonFatal": true,
  "sampleRate": 1.0,
  "sentryDsn": "https://PUBLIC_KEY@o0.ingest.de.sentry.io/PROJECT_ID"
}
```

## API

```
GET /v1/observability?platform=android&appVersion=2.0.1
GET /health
```

`platform` and `appVersion` are accepted for forward compatibility and do not change the response today.

Response headers include `ETag` and `Cache-Control: public, max-age=900`. Send `If-None-Match` to receive `304`.

## Free tier

Workers KV free tier is 100,000 reads/day and 1,000 writes/day. Each app reads at most once per 15 minutes. Writes happen only when you change providers.
