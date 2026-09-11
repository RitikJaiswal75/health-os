# Health OS

A **local-first** medicine and supplement tracker for Android. Schedule doses, get reliable full-screen reminders, track inventory, and search an India drug catalog — all without an account or cloud sync.

**Package:** `com.health.os` · **Version:** 1.1.0

---

## Download (Android)

Install the latest release APK from [GitHub Releases](https://github.com/RitikJaiswal75/health-os/releases) — no app store required.

| | |
|---|---|
| **File** | `health-os-release.apk` (on the latest release) |
| **Size** | ~41 MB (arm64 only) |
| **Requires** | Android 8+ · arm64-v8a phone (most devices from ~2017 onward) |

### Install steps

1. Open [Releases](https://github.com/RitikJaiswal75/health-os/releases) and download `health-os-release.apk`.
2. Enable **Install unknown apps** for your browser or file manager (Settings → Apps → Special access).
3. Open the APK and tap **Install**.

> **Note:** This is a sideload build for testing and personal use. A Google Play release may follow separately.

---

## What it does

Health OS helps you manage daily medications and supplements in one calm, dark-themed app inspired by modern health trackers.

### Today

- Date strip with a completion donut for the selected day
- See every scheduled dose with **Taken**, **Skip**, and **Snooze**
- Edit or delete logged doses; view remaining stock per medication

### Add medication wizard

- Search the **India medicine catalog** (downloaded on first use) plus live **RxTerms** and **NIH DSLD** (cached 24 h)
- Configure type, strength, pill shape and colour, schedule, nickname, notes, and starting stock
- Attach a photo from camera or gallery

### Medication types

Supports tablets, capsules, liquids, powders/supplements, inhalers, drops, and more — with type-aware dose labels (tablets, ml, g, scoops, pumps).

### Schedules

Daily, every N days, specific weekdays, monthly, or as-needed — with multiple times per day and optional end dates.

### Library & history

- **Library** — all medications with pill icons, strength, and stock; tap to edit; one-tap refill
- **History** — browse past days and review taken, skipped, or missed doses

### Reminders (Android)

- Native **exact alarms** with **full-screen intent** — the reminder opens even when the app is killed
- Snooze (30 min, 1 h, or custom time)
- Variant picker when one medication has multiple strengths
- Guided permission setup on first launch (exact alarm, full-screen intent, notifications)

### Inventory

- Stock decrements automatically when you mark a dose as taken
- Refill tracking with optional low-stock notifications
- Powder and liquid forms deduct **one serving**, not gram/ml dose amount

---

## Privacy & data

- **No accounts, no cloud sync** — everything stays on your device
- Database and pill photos live in durable **`Documents/HealthOS/`** storage
- Data survives Android **Clear cache**; removed only on **Clear data** / uninstall
- Catalog API queries (RxTerms, DSLD) are cached locally for 24 hours

---

## Platform support

| Platform | Status | Reminders |
|----------|--------|-----------|
| **Android** | Primary — APK available | Full-screen alarms via native module |
| **iOS** | Development only | Notification tap-to-open (no auto-open when killed) |
| **Web** | Expo web export | No native alarms |

---

## Development

### Prerequisites

- **Node.js** 20+ and **npm**
- **Android:** Android Studio / SDK (for native builds)
- **Optional:** [EAS CLI](https://docs.expo.dev/build/setup/) for cloud or local store builds

### Setup

```bash
git clone <your-repo-url>
cd health-os
npm install
npm run ingest-cdci   # build searchable India catalog (data/india.db) from data/indian_medicine_data.json
```

### Run in development

```bash
npm start              # Expo dev client (requires native build)
npm run start:go       # Expo Go (limited — alarms not supported)
npm run android        # Build & run on connected device
```

After cloning, generate the native Android project if `android/` is missing:

```bash
npm run prebuild:android
```

### Quality gate

```bash
npm run quality        # typecheck + lint + test
npm test               # Jest unit tests only
npm run typecheck
npm run lint
```

---

## Building release APKs

### Shareable sideload APK (~41 MB, arm64)

Excludes the dev client — suitable for sharing with testers:

```bash
npm run android:apk
# output: dist/health-os-release.apk (gitignored — not committed)
```

APK and AAB files are never pushed to the repo. Pushes to `main` that touch app code trigger [`.github/workflows/release-apk.yml`](.github/workflows/release-apk.yml), which builds the APK and publishes it to **GitHub Releases** only.

### Play Store bundle (AAB)

Uses EAS with production signing:

```bash
eas login
eas build --platform android --profile production   # cloud
npm run android:bundle                              # local EAS build (output stays local)
```

### Local EAS arm64 APK (shareable, ~41 MB)

```bash
npm run android:apk:local
```

### CI release (GitHub Actions)

Bump `version` in `app.json` before pushing when you want a new tagged download. The workflow:

1. Runs `npm run android:apk` (arm64 shareable sideload APK)
2. Publishes a **GitHub Release** tagged `v{version}` with `health-os-release.apk` attached

No Play Store signing or secrets required — this is for direct GitHub downloads only.

See [`eas.json`](eas.json) for optional local EAS / Play Store builds.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | [Expo SDK 57](https://docs.expo.dev/) + React Native 0.86 |
| Language | TypeScript (strict) |
| Navigation | Expo Router |
| UI | React Native Paper (MD3 dark) + Reanimated |
| Database | expo-sqlite + Drizzle ORM |
| State | Zustand (wizard draft) |
| Alarms | Custom `medication-alarm` native module (Android) |
| Catalog | GitHub-hosted India SQLite (downloaded on first use) + RxTerms + NIH DSLD |

---

## Project layout

```
app/                  Expo Router screens (tabs, medicine wizard, reminder)
src/core/             Theme, UI primitives, dates, domain types
src/features/         Medications, reminders, inventory, catalog, reliability
src/db/               Drizzle schema, migrations, repositories
modules/medication-alarm/   Android alarm native module
data/                 Indian medicine JSON + generated india.db (hosted on GitHub, not in APK)
dist/                 Local APK output from android:apk (gitignored)
scripts/              Catalog ingest, RN compat patches, manifest checks
```

---

## Medical disclaimer

Health OS is a **personal medication reminder and tracker**. It is **not** a medical device, does not provide clinical advice, and does not replace guidance from a qualified healthcare professional. Always follow your prescriber's instructions.

---

## License

See [LICENSE](LICENSE).
