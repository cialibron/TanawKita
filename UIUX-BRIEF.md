# UI/UX Brief — TanawKita pass (for Myles)

Working branch: `myles/frontend`. Work top-down (P0 first). Each item lists the file — you own
all files below; if an item touches `App.tsx`/`store.tsx`/logic files, tell the main dev instead.
The main dev stays out of your files while you work.

## Who we are designing for
- Jobseekers: workers 15+, often low-end Android phones, possibly on mobile data, may have limited
  literacy. Employers: sari-sari/carinderia-scale owners registering documents on their phone.
- Demo target: PSA/CBMS judges who must "get it" in 3 minutes. Every screen must show ₱ pay and
  barangay context clearly.

## P0 — do first (bare minimum confidence)
1. **Find Jobs empty state** (`src/pages/jobseeker/FindJobs.tsx`): when filters produce zero jobs
   the list is just blank. Add a friendly empty state ("No open jobs match — try All jobs or a
   nearby barangay") plus one button clearing filters.
2. **Skill card missing state** (`SkillCardForm`, `FindJobs`): without a skill card, applying is
   blocked silently-ish. Show a persistent headline banner in the jobs list: "Create your skill card
   to match and apply" with a link to the tab.
3. **Apply flow feedback** (`FindJobs`): after apply, the job card should visibly flip to "Applied ✓"
   state, not rely on the Applications tab.
4. **Bottom sheet affordance** (`src/components/MapShell.tsx`): on phones, the collapsed sheet needs
   a visible grab handle and a peek of the first list item so users discover it.
5. **`prompt()` replacement** (`src/App.tsx` — ask main dev): "Acting as → + New" uses the ugly
   native `prompt()`. Needs a small inline dialog/completely styled input. Main dev must implement
   (file is out of your lane); flag it done and he'll match your look.

## P1 — demo polish
6. **Match score explanation**: `matchScore` already returns `reasons[]` — surface all of them in
   the job detail, not only the percent. "Same barangay + pay passes wage check" beats "68%".
7. **Verification screen literacy** (`src/pages/employer/Verify.tsx`, 267 lines of dense forms):
   split into steps (1 Business type → 2 Numbers → 3 Documents → 4 Review). Show progress
   ("Step 2 of 4"). Required docs list right now is a wall of 4+ filenames.
8. **Wage-check messaging on Post Job** (`src/pages/employer/PostJob.tsx`): the wage error only
   shows on submit. Show it live as the employer types (red inline under pay amount).
9. **Job status visibility** (`src/pages/employer/MyPosts.tsx`): open/paused/filled needs colored
   chips with a counts line ("2 hired of 3 slots") — data is already in `Application` records.
10. **Admin Overview scan-ability** (`src/pages/admin/Overview.tsx`): stats cards good, but hero
    demo moment belongs here — one barangay map with heat layer + 3 headline numbers. PESO =
    the "government sees everything" story, sell it visually.

## P2 — nice to have
11. Dark mode pass, printed forms, retro with real skill tags + TVET labels.
12. Use `analysis_*.md` findings in `/home/vonan/TANAWKITA` (outside the app repo) to tell the
    story in the Admin view: "30,384 underemployed, 4,551 TVET grads" as context chips.
13. Consistent chip component once `Tabs.tsx` styling settles.
14. Icons: `public/icons.svg` exists — use one cohesive icon set across tabs.

## House style
- Inputs/buttons already have 44px min-height — keep it.
- Plain-English/Filipino copy voice; ₱ amounts as "₱550 / day", never "PHP550.00".
- Test only with the seeded demo data; never invent new flows that need a backend.
