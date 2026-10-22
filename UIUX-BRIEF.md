# Frontend/UI-UX Brief — Build on TanawKita's working framework

This brief is for Myles. The main dev has already built the functional framework locally: keep it intact and layer the visual design on top. Work from the latest `origin/main`, in a feature branch; do not merge or push directly to `main`.

## Current interface framework
- **Developer convenience:** role switcher is in the upper-right. It switches Jobseeker, Employer, and PESO Admin demos.
- **Actual user navigation:** left icon rail changes by role. It contains feature navigation, not role switching.
- **Menu behavior:** the left menu minimizes to the icon rail and maximizes as an overlay over the map. The map must not resize or jump when the menu opens.
- **Map:** MapLibre/OpenFreeMap 3D Davao map is the shared map canvas. Preserve map click, pin selection, competitor clustering, business-radius, heat layer, and fit/full-map behavior.
- **Selection detail:** selecting a job or competitor from the list or map highlights it and opens its details in the lower map panel. Preserve the selected item while styling the panel.
- **Employer tools:** Business overview, Franchise planning, Competitor map, Post a job, My job posts, and Business verification are separate navigation options. The old generic Business advisor recommendation page has been removed.
- **Simulation data:** business and jobseeker CSVs feed the local demo. They are synthetic, clearly labelled, and have approximate barangay locations.

## Design direction
Use the supplied dark logistics-dashboard references: a narrow vertical feature rail, a readable secondary menu/list to its right, a large map on the remaining canvas, and a lower selected-item detail panel. Use TanawKita's existing colors and copy voice rather than copying another product's identity or text.

## Implementation rule: visual layer over functional skeleton
- Prefer CSS, reusable presentation components, and wrappers around the existing screens.
- Keep existing `App.tsx` role flow, callback/prop contracts, form validation, store actions, pay/age/verification rules, and CSV-backed data.
- Do not replace the app with hard-coded mock screens or a disconnected landing-page-only prototype.
- Do not create real-looking competitor data in the UI; keep the synthetic-data disclosure visible.
- The authentication experience is still a client-side demo. Do not claim Google/Facebook sign-in or account security is real until a backend/auth design is approved.
- If you need a field, route, behavior, or source data that the current framework lacks, message the main dev with the exact request before changing shared contracts.

## Suggested frontend tasks
1. Polish the left role-specific navigation rail and menu open/minimize transitions, preserving current actions.
2. Improve list row density/readability and selected states, while retaining map synchronization.
3. Style the lower selected job/competitor details to match the references and remain usable on narrow screens.
4. Ensure keyboard focus, labels, touch targets, contrast, reduced-motion handling, and readable pay/location details.
5. Only after a visual component pass, propose a cohesive design token/icon system. Avoid introducing dependencies without approval.

## Acceptance checklist
- All three demo roles still switch via the upper-right developer control.
- Each role's left icons navigate to its real functional sections.
- Minimized/maximized menu never resizes or displaces the map.
- Selecting a job or synthetic competitor works from both map and list and updates the lower details panel.
- Forms, job application behavior, employer verification, and demo data remain intact.
- `npm test`, `npx tsc -b`, `npm run lint`, and `npm run build` pass (or existing warnings are documented).
