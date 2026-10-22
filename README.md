# TanawKita
CBMS: Innovation Challenge Entry for SDG #8

Mobile-first job matching for Davao City: underemployed workers, TVET graduates and out-of-school, out-of-work youth (15–24) find nearby work, and micro-employers find nearby workers. Built for the IDEA-CTRL CBMS Innovation Challenge (PSA RSSO XI).

**Prototype / test mode.** No login: switch between the Jobseeker, Employer and Admin interfaces with the tabs, and choose who you are acting as. All people, businesses, permits and applications in the app are fictional sample data.

## Features

- **Jobseeker:** full-screen map of jobs with pay labels, search and filters, skill card, match score, apply, age rules for 15–17.
- **Employer:** full-screen map of the business area with a heatmap of people looking for work (CBMS barangay totals), nearby profile feed, post a job with wage check, business advisor for new businesses.
- **Verification:** employers submit Philippine business records (DTI/SEC/CDA, Mayor’s permit, barangay clearance, BIR 2303, ID; SSS/PhilHealth/Pag-IBIG for regular employees) before posting. PESO staff approve them in Admin.
- **Admin (PESO):** overview, pilot barangay table, verification queue.

## Run locally

Needs Node 24.

```sh
npm install
npm run dev -- --host   # http://localhost:5173
npm test
npm run build
```

### Map key

Map tiles come from CARTO basemaps, which need a key. Create `.env.local` (never committed) with:

```
VITE_CARTO_KEY=your-key
```

The key is visible in the browser's tile requests, so restrict it to your domains in the CARTO dashboard.

## Data

- `src/data/labor.ts` and `src/data/barangayGeo.ts` are generated. Only barangay-level aggregates are used; personal CBMS records never enter the app.
- The source CSVs (`data/insights/`) are kept out of the repo. To regenerate, put them there and run `node scripts/gen-labor.mjs` and `node scripts/geocode-barangays.mjs`.
- Barangay centers come from OpenStreetMap (Nominatim) and are approximate; two were corrected by hand.
- Placeholders to replace before real use: the daily minimum wage (`DAILY_MINIMUM_PLACEHOLDER`, not the DOLE Region XI figure), the skills list (not the TESDA list), business advisor costs and weights, and verification number formats.

Map data © OpenStreetMap contributors, © CARTO.
