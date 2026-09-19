# Health OS Marketing Website

Static marketing site for [Health OS](https://healthos.ritik.cc) — built with Vite, React, and Tailwind CSS.

## Local development

```bash
cd website
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
cd website
npm run build
```

Output goes to `website/dist/`.

## Cloudflare deploy

The site is a static Vite build in `dist/`. `wrangler.jsonc` points Wrangler at that folder.

### Workers (Git-connected build)

| Setting | Value |
|---------|-------|
| Root directory | `website` |
| Build command | `npm ci && npm run build` |
| Deploy command | `npm run deploy` (or `npx wrangler versions upload`) |
| Node version | 20+ |

`name` in `wrangler.jsonc` must match your Cloudflare Worker project name.

### Classic Pages (alternative)

| Setting | Value |
|---------|-------|
| Root directory | `website` |
| Build command | `npm ci && npm run build` |
| Output directory | `dist` |

3. Custom domain → add `healthos.ritik.cc`
4. Optional: **Build watch paths** → `website/*` so app-only pushes skip rebuilds

After setup, Cloudflare auto-deploys on every push that changes `website/`.

## Screenshots

Add JPG or PNG screenshots to `public/screenshots/` with these exact filenames:

| Filename | Screen | What to show |
|----------|--------|--------------|
| `01-today.jpg` | Today tab | Date strip, 2–3 doses, completion donut |
| `02-search.jpg` | Add med → Search | Catalog results (e.g. search "dolo") |
| `03-configure.jpg` | Configure | Type, strength, nickname, optional pill photo |
| `04-schedule.jpg` | Schedule | Daily schedule with multiple times |
| `05-reminder.jpg` | Reminder | Full-screen Taken/Skip/Snooze |
| `06-library.jpg` | Medications tab | 3+ meds with icons and stock |
| `07-history.jpg` | History tab | Past day with taken/skipped doses |

Tips: use the same device, portrait orientation, dark mode. Until screenshots are added, the phone frame shows a gradient placeholder.

## Isolation from the Expo app

This folder is a separate npm package. Root `npm run quality` and `npm run android:apk` are unaffected. The APK GitHub Actions workflow does not trigger on `website/**` changes.
