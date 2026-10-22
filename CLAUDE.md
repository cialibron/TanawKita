# CLAUDE.md — TanawKita

Read this file at the start of every session. You are assisting Myles, the frontend/UI-UX developer. The main dev owns business logic, data, and architecture; coordinate before changing those contracts.

## Project
TanawKita is a Davao City jobs-matching prototype for the CBMS Innovation Challenge (SDG 8). It uses Vite, React 19, TypeScript, and MapLibre GL with free OpenFreeMap vector tiles. There is no backend. Demo state is held in `src/store.tsx` and saved locally; synthetic records are loaded from `simulation-data/` and added without replacing existing saved records. The remote `myles/landing-page` branch is an older design prototype based on Leaflet and demo-only sign-in; use it as a visual reference, not as a wholesale replacement for the current app.

## Frontend goal: keep the framework, layer the design on top
Treat the existing app as a working functional skeleton. Improve its presentation without replacing its role flows, callbacks, validation, map behavior, or data connections.

Current interaction framework to preserve:
- Developer-only role switch is in the **upper-right**. It switches Jobseeker, Employer, and PESO Admin demo interfaces.
- The **left icon rail is for the current role's actual navigation**, not for switching roles.
- The left menu minimizes to the icon rail; maximizing it overlays the map rather than resizing or moving the map.
- Selecting a job or competitor from its list or map marker highlights it and shows details in the map's lower detail panel.
- MapLibre is the shared Davao map. Keep its selection, map-picking, 3D building, heatmap, business-radius, and competitor-marker behavior working.
- Employer navigation has separate **Franchise planning** and **Competitor map** screens. Do not bring back the old generic “Business advisor” recommendations page.

For a visual refresh, prefer CSS, presentational components, and wrappers around existing functional pages. Keep the existing data and behavior as the foundation; put the new visual design on top. Do not replace `App.tsx` with a disconnected prototype or hard-coded mock screen. Preserve the same callback and prop contracts so the demo still works.

## Synthetic data and accuracy
- `simulation-data/businesses.csv` contains fictional sample businesses; `simulation-data/jobseekers.csv` contains fictional sample profiles. All locations are approximate simulation points, not real storefronts or homes.
- Keep the visible synthetic/demo disclosure. Never present these records as actual DTI/PESO/CBMS records, real competitors, or real people.
- Competitor maps use the local simulation sheet; do not invent live-business claims or merge simulation pins indistinguishably with real listings.
- No real authentication exists. Sign-in/SSO concepts from a visual prototype must stay clearly demo-only until the main dev approves a backend/auth plan. Never describe the current client-side demo login as secure authentication.

## File ownership
You may edit presentation-focused work in:
- `src/pages/**`
- Presentational pieces in `src/components/**`
- `src/index.css`, `src/landing.css` (if present), and `index.html`

Ask the main dev before changing these shared/core areas:
- `src/types.ts`, `src/store.tsx`, `src/data/**`, `simulation-data/**`
- `src/rules.ts`, `src/verification.ts`, `src/area.ts`, `src/businessDirectory.ts`, `src/data/simulation.ts`
- `src/components/MapLibreView.tsx`, map data contracts, `vite.config.ts`, or package/deployment configuration

If a design requires new data or behavior, stop and send the main dev a short request with the field/behavior, where it is needed, and why. Do not add fake values in the UI to fill the gap.

## Git workflow
1. Never commit directly to `main`; never merge your own work.
2. Start a feature branch from the latest `origin/main`, e.g. `myles/franchise-layout`. Do not assume an old branch is current.
3. Make small commits, push your branch, and tell the main dev when it's ready for local review.
4. Never force-push, reset `main`, or rewrite a branch the main dev may be reviewing.
5. Don't add dependencies without stating the package and reason in the readiness note.

## Checks before requesting review
```bash
npm test
npx tsc -b
npm run lint
npm run build
```
If something fails outside your owned files, report it rather than changing core logic to silence it.

## Running locally
```bash
npm install
npm run dev -- --port 5174
```
Map tiles require internet access but no API key or credit card. Keep user-facing copy short, plain, and accessible; use large touch targets and show pay as `₱X / day` (or the correct pay unit).
