# Contributing to TanawKita

## Roles
- **Myles — frontend/UI-UX:** screens, presentation components, layouts, interaction polish, and styling.
- **Main dev — system/data:** application state, matching and safety rules, verification, data imports, and shared architecture.
- **Shared contract:** `types.ts`, `store.tsx`, map interfaces, and exported logic signatures. Coordinate before changing these.

## Design approach: working framework first, visual layer second
TanawKita already has functional role flows and locally stored data. A design pass should improve how those flows look and feel **without replacing the working framework**.

Keep these behaviors intact while redesigning:
- Developer role switch in the upper-right: Jobseeker / Employer / PESO Admin.
- Role-specific feature icons on the left; these are not role-switch buttons.
- Left menu minimizes to its icon rail and maximizes as an overlay over the map; the map must not jump or resize.
- Job and competitor selections stay linked between lists, map markers, highlighting, and the lower details panel.
- Existing forms, validation, age/pay/verification rules, map picking, and store actions continue to work.
- Employer **Franchise planning** and **Competitor map** stay separate; do not reintroduce the old generic business-idea advisor.

Prefer styling and composing the current pages/components. Avoid replacing `App.tsx` or the map/application shell with a disconnected visual-only prototype. If the design needs behavior or data the current system does not provide, write a request for the main dev instead of hard-coding fake UI values.

The remote `myles/landing-page` branch is an older design prototype based on Leaflet and client-side demo sign-in. It can be used as a visual reference, but do not merge or copy its `App.tsx` wholesale over the current MapLibre/role-navigation framework. Port only approved presentation pieces and preserve the current contracts.

The current sign-in/SSO concept is a client-side demo, not real authentication. Keep it clearly labelled as a prototype unless a real backend and auth plan are approved.

## Synthetic data
`simulation-data/businesses.csv` and `simulation-data/jobseekers.csv` are fictional simulation records imported additively by the app. Their locations are approximate barangay-level demo points. Do not present the records as real businesses, competitors, jobseekers, or official CBMS/PESO data. Preserve the visible synthetic-data disclosure.

## Git workflow
1. Keep `main` stable; do not commit or push directly to it.
2. Start a feature branch from the latest `origin/main`, e.g. `myles/market-research-ui`.
3. Commit focused changes with clear messages and push your branch.
4. Open a PR or message the main dev for review. The main dev reviews locally and merges.
5. Never force-push or rewrite branches under review.
6. Before requesting review, run:
   ```bash
   npm test
   npx tsc -b
   npm run lint
   npm run build
   ```

## Main dev's local review workflow
```bash
git fetch origin
git worktree add ../tanawkita-review origin/myles/your-branch
cd ../tanawkita-review
npm install
npm test
npm run dev -- --port 5174
```
Review at `http://localhost:5174/` (or the configured Vite base path), then remove the worktree after review.
