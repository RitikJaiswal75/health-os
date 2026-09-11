# India catalog search worker

Cloudflare Worker + D1 that serves **per-query** India medicine search (~few KB per request) instead of downloading the full catalog to the phone.

## One-time setup

```bash
# 1. Build local SQLite catalog from JSON (repo root)
npm run ingest-cdci
npm run export-india-d1

# 2. Install worker deps
cd workers/india-catalog
npm install

# 3. Create D1 database (copy database_id into wrangler.toml)
npm run d1:create

# 4. Apply schema
npm run d1:migrate:remote

# 5. Seed data (~246k rows — may take several minutes)
# Re-export seed files from repo root if you changed the catalog: npm run export-india-d1
npm run d1:seed:remote   # runs seed/*.sql in order (~125 files, several minutes)

# 6. Deploy worker
npm run deploy
```

### Find your worker URL

**Production URL:** `https://drugs.healthos.ritik.cc`

Configured in `wrangler.toml` as a custom domain. The app uses this by default; override with `EXPO_PUBLIC_INDIA_CATALOG_URL` in `.env` if needed.

Test it:

```bash
curl "https://drugs.healthos.ritik.cc/health"
curl "https://drugs.healthos.ritik.cc/search?q=dolo"
```

Copy the base URL (no `/search` path) into `.env` at the repo root:

```
EXPO_PUBLIC_INDIA_CATALOG_URL=https://drugs.healthos.ritik.cc
```

Restart Expo after changing `.env`.

## API

```
GET /search?q=dolo&limit=20
GET /health
```

Response:

```json
{
  "results": [
    { "id": 1, "name": "Dolo 650 Tablet", "strength": "Paracetamol (650mg)", "form": "strip of 15 tablets" }
  ]
}
```

## Updating catalog data

When your local `data/indian_medicine_data.json` changes (kept out of git):

```bash
npm run ingest-cdci
npm run export-india-d1
cd workers/india-catalog
npm run d1:migrate:remote   # if schema changed
# Re-seed: drop tables or recreate DB, then:
npm run d1:seed:remote
npm run deploy
```
