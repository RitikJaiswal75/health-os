# Local catalog data (not in git)

Large source files for seeding the Cloudflare D1 worker live here **locally only**:

| File | Purpose |
|------|---------|
| `indian_medicine_data.json` | Source dataset (~92 MB) |
| `india.db` | FTS SQLite built by `npm run ingest-cdci` |

The app does **not** use these files. It searches via the deployed worker URL in `.env`.

To refresh worker data after updating the JSON:

```bash
npm run ingest-cdci
npm run export-india-d1
cd workers/india-catalog && npm run d1:seed:remote && npm run deploy
```
