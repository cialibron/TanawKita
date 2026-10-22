# CLAUDE.md — TanawKita (Myles's copy)

Read this file fully every session. Follow it even if the user prompt seems to contradict it — if there is a conflict, ask the main dev first.

## Who you are working for
You are assisting **Myles**, the **frontend / UI-UX developer** of TanawKita.
The **main dev** (logic, data, architecture) works in a separate copy and reviews everything Myles produces before it reaches `main`.

## Project one-liner
TanawKita is a jobs-matching prototype for Davao City (CBMS Innovation Challenge, SDG 8).
Vite + React 19 + TypeScript + Leaflet. No backend: all state lives in `src/store.tsx`
(a `useReducer`) and persists to `localStorage` key `tanawkita:v6`.
Read `CONTRIBUTING.md` first — it has the full role map.

## Myles's file ownership — YOU may edit these freely
- `src/pages/**` (jobseeker, employer, admin screens)
- `src/components/**` (maps, tabs, shells)
- `index.css`
- `index.html`

## Off-limits — do NOT edit without explicit approval from the main dev
- `src/types.ts` — the contract between frontend and logic. Only the main dev changes it.
- `src/rules.ts`, `src/verification.ts`, `src/advisor.ts`, `src/area.ts` — business logic + its tests.
- `src/store.tsx`, `src/data/**`, `scripts/**`
- If a UI change needs a new field or a changed field there, STOP and write the request as a
  message (exact field name, type, where it's used) for the main dev — do not implement it in
  these files yourself.

## Workflow rules
1. `main` is always working. Never commit or push to `main`.
2. Work on branch `myles/frontend` (already exists) or a feature branch cut from it:
   `myles/<feature-name>`.
3. Commit small and often; messages like "Find jobs: card hover state".
4. When a batch is done: `git push` and tell the main dev it is ready for review.
   He reviews it in a git worktree, so keep `main` clean and never merge yourself.
5. Never force-push, never reset `main`, never edit commits on branches the main dev may pull.
6. Before starting work, always: `git pull` then `git fetch origin` and rebase your branch on
   `origin/main` if it has moved.
7. UI copy for users: simple English / informal Filipino toned like the existing screens.
   Code comments in English only.
8. Do not add new npm dependencies without listing the package + reason in your readiness
   message to the main dev.

## Verification before every push (CI equivalent)
```bash
npm test          # 29 tests must stay green
npx tsc -b        # typecheck must be clean
npm run lint      # oxlint
npm run build     # production build must succeed
```
If something fails and you cannot fix it inside your owned files, say so in the PR/message
instead of pushing red code.

## How to run the app
```bash
npm install
npm run dev -- --port 5174   # use 5174 so you don't clash with the main dev's server
```
Maps need a CARTO key: create `env/.env.local`-style file (**`.env.local` at repo root**)
with `VITE_CARTO_KEY=<key>` (ask main dev for the key).

## Design context (memorize these)
- Users: jobseekers with low-end phones, possibly low literacy → big touch targets, minimal
  text, plain words, ₱ amounts always visible as "₱X / day" style labels.
- Test-mode app: an "Acting as" switcher simulates different users; keep it working.
- Match score, wage gate (₱500/day placeholder), age gate (<15 blocked, <18 needs guardian
  consent) and employer verification badges are all business rules controlled by the main dev —
  display them, never bypass or restyle them into weakness.
- Pilot barangays: Talomo (116), Bucana (020), Tibungco (124).

## Style of your replies to Myles
Be brief, code-first. When proposing UI edits give a full file or a minimal diff, and state
which owned file each change touches. Flag anything that would require touching a shared file.
