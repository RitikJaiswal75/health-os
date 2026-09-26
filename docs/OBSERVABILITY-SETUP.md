# Observability setup (Sentry, Crashlytics, config worker)

Health OS reports each crash to **every provider listed** in the remote config (`primary` and `fallback` are both delivery targets, not an either-or). Set `fallback` to `"none"` to use a single provider. Native crash handlers are installed at process start, so a remote provider change takes effect on the **next app launch**. Non-fatal routing updates as soon as the app refreshes config (within 15 minutes).

Accounts are free. No credit card is required for any of these steps.

Do them in this order — each produces a value a later step needs.

## A. Sentry

**A1. Sign up.** Go to [sentry.io](https://sentry.io) and create an account. Choose the **Developer** plan (free: 5,000 errors/month, 1 user). Name the organization something URL-friendly like `healthos` — that becomes the **org slug** and is hard to change later.

**A2. Create the project.** Platform **React Native** (not JavaScript, not Android). Name it `health-os`.

**A3. Copy three values** from the setup screen:

- **DSN** — a URL like `https://abc123@o456789.ingest.sentry.io/1234567` (US) or `https://abc123@o456789.ingest.de.sentry.io/1234567` (EU). Public and write-only. Safe to put in the Worker config.
- **Org slug** and **project slug** — also in the browser URL. EU orgs use `de.sentry.io/organizations/<org-slug>/projects/<project-slug>/`.

Ignore the wizard's code snippets. **Do not run `npx @sentry/wizard`.** It would overwrite `metro.config.js` and `app.config.js`. The app is already wired.

If the slugs are not `healthos` / `health-os`, or the project is not on `de.sentry.io`, update the Sentry plugin block in [`expo.base.json`](../expo.base.json) (`organization`, `project`, and `url`).

**A4. Turn off IP storage.** Project settings → **Security & Privacy** → enable **Prevent Storing of IP Addresses**. Sentry infers IP from the request; the client also sends `ip_address: 0.0.0.0`.

**A5. Create the auth token.** This is a **different secret** from the DSN. The DSN (Client Keys page) sends crashes at runtime. The token uploads source maps at **build** time so stack traces are readable.

You are currently in **project** settings (`Settings → health-os → Client Keys`). Leave that page.

1. Click the **`<<`** back arrow next to "Settings" in the left column (or the org avatar at the bottom-left). You should now see org-level items like **Members**, **Teams**, **Developer Settings** — not "Client Keys".
2. Open **Settings → Developer Settings → Organization Tokens**.
   Direct link for your EU org: [https://de.sentry.io/settings/auth-tokens/](https://de.sentry.io/settings/auth-tokens/)
3. **Create New Token**. Name it `eas-build-sourcemaps`. Leave the default CI permissions (they include source-map upload).
4. Copy the token **immediately**. Sentry shows it once. It starts with `sntrys_`.

If Organization Tokens is missing, use a personal token instead: click your avatar (top-right or bottom-left) → **User settings → Auth Tokens → Create New Token**, and enable **org:read** plus **project:releases** (sometimes labelled "Release: Admin").

Put it in `.env.local` (gitignored):

```
SENTRY_AUTH_TOKEN=sntrys_...
```

Crashes still report without this token. Without it, stack traces in Sentry will be minified (`a`, `b`, `c`) instead of real function names.

## B. Firebase Crashlytics

**B1. Create the project.** [console.firebase.google.com](https://console.firebase.google.com) → create project → name `health-os`. Stay on **Spark (free)**. Crashlytics is free at any scale.

**B2. Decline Google Analytics.** Skip it. The only Crashlytics feature it adds is breadcrumb logs of what the user tapped — which would leak medication screens. Also skip or accept "Gemini in Firebase"; it does not affect the app.

**B3. Register the Android app.** Package name must be exactly `com.health.os`. Leave nickname and SHA-1 blank.

**B4. Download `google-services.json`** into the repo root (`health-os/google-services.json`). It is gitignored. Treat it as private config.

Without this file, `npm run prebuild:android` still succeeds but **skips Crashlytics** (Sentry-only build). Add the file and prebuild again to enable the fallback provider.

**B5. Skip the rest of the Firebase Gradle wizard.** Expo config plugins apply those edits during `npx expo prebuild`.

**B6. The Crashlytics dashboard stays empty until the first crash arrives.** That is expected.

## C. EAS variables

`--name` is the **variable name**, not the secret. Put the token in the **value** prompt (or `--value`), never in `--name`. `eas env:create` is deprecated.

```bash
eas env:set SENTRY_AUTH_TOKEN --environment production --visibility sensitive --type string
eas env:set GOOGLE_SERVICES_JSON --environment production --visibility secret --type file
```

When prompted for `SENTRY_AUTH_TOKEN`, paste the `sntrys_...` token. For the file variable, upload `google-services.json`.

[`eas.json`](../eas.json) production profile already sets `"environment": "production"`. For local builds, the same token lives in `.env.local` (gitignored).

## D. Config Worker

Follow [`workers/app-config/README.md`](../workers/app-config/README.md). Use the Sentry DSN from A3 in the KV value once you have it. Until then, `example.config.json` (Crashlytics-only, empty DSN) is valid.

## E. Verify it actually works

Neither SDK works in Expo Go. Use a dev client:

```bash
npm run prebuild:android && npm run verify-android-manifest
npm run android
```

Open **About → Troubleshooting** on a dev client to exercise error paths manually, or temporarily set `"primary":"crashlytics"` in the Worker config to verify Firebase routing.

Timing:

- **Crashlytics** uploads on the *next* launch after a crash. Crash, reopen, wait up to 5 minutes. Dashboard: **DevOps & Engagement → Crashlytics**. For debug/dev-client testing, set `crashlytics_debug_enabled: true` in [`firebase.json`](../firebase.json) locally and rebuild.
- **Sentry** non-fatals arrive in seconds. Native fatals wait for the next launch.

**Both dashboards:** With `"primary":"sentry"` and `"fallback":"crashlytics"`, every non-fatal is sent to **both**. A report is queued on device only when every configured provider fails. Native crashes still belong to Crashlytics (Sentry NDK is off). Change the provider list via Worker config — no app release needed.

PII check: open one real event in Sentry → JSON tab. It must not contain a medication name, note, photo URI, or file path under `Documents/HealthOS`.

## Two-sitting split

1. Firebase + Worker with `"primary":"crashlytics"` and `"sentryDsn":""` — Crashlytics-only, no Sentry account needed.
2. Add Sentry later: set `"fallback":"sentry"` (or `"primary":"sentry"`) and paste the DSN in KV, then rebuild if you need source maps.
