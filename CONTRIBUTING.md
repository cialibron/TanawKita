# Contributing (Myles + main dev)

## Roles
- **Myles** — frontend / UI-UX: `src/pages/**`, `src/components/**`, `index.css`
- **Main dev** — logic & data: `rules.ts`, `verification.ts`, `advisor.ts`, `area.ts`, `store.tsx`, `scripts/**`, `src/data/**`
- **Shared contract** — `types.ts` (and exported signatures of the logic modules). Any change to these must be discussed before merging.

## Workflow (devs)
1. `main` is always working. Never push to `main` directly.
2. Work on a branch named after what it is: `myles/find-jobs-card` (front end) or `feat/adjust-match-score` (logic).
3. Each frontend change: Myles pushes his branch to `origin/myles/frontend` (or a feature branch), opens a PR.
4. Main dev reviews the PR **locally** (see below), runs `npm test` and `npm run build`, then merges.

## Everyday commands
```bash
git pull

# Start work
git checkout -b myles/something

# When done
git push -u origin myles/something
# then open a Pull Request on GitHub (or tell main dev)
```

## How main dev reviews Myles's work locally
Use **git worktrees** so Myles's branch runs side-by-side with main on a different port
(so you can compare UIs without losing your own working state):

```bash
# Peek at / run Myles's work without touching your checkout
git fetch origin
git worktree add ../tanawkita-review origin/myles/frontend
cd ../tanawkita-review
npm install
npm test
npm run dev -- --port 5174   # review at http://localhost:5174
```

When it looks good:
```bash
# From your main checkout
git merge origin/myles/frontend   # or merge the PR on GitHub
git worktree remove ../tanawkita-review
```

If it needs changes, leave comments on the PR / message Myles; do NOT push to his branch.

## House rules
- Commit often, small commits, message like "Skill card: add guardian consent toggle".
- Before opening a PR: `git pull`, resolve conflicts locally, run `npm test` — CI/red tests = not ready.
- Don't touch shared files (`types.ts`, `store.tsx`) without a ping/discussion.
- Parties of the app keep everything in English in comments/PRs for consistency.
- UI copy for users writes in informal English/Filipino as currently in the app; keep that voice.
