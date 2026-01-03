# Sprint 2 Frontend — Execution Plan (Theming + PWA)

## Phase 1 — Theming foundation (Day 1–2)
1) Expand tokens in `app/globals.css`
2) Add dark override (`html[data-theme="dark"]`)
3) Update `@theme inline` mappings

## Phase 2 — No-flash theme (Day 2–3)
1) SSR theme cookie read + `<html data-theme=...>` in `app/layout.tsx`
2) Create `app/actions/theme.ts` set/get + cookie policy
3) Add ThemeToggle (client) + integrate in app header
4) Minimal migration of layout classes to tokens

## Phase 3 — PWA installability (Day 4)
1) Add `app/manifest.ts`
2) Add icons under `public/icons/`
3) Update metadata in `app/layout.tsx`

## Phase 4 — Offline fallback (Day 5)
1) Add `/offline` page
2) Add safe `public/sw.js`
3) Register SW in prod only

## Exit criteria
- Dark mode works + persists + no flash
- Installable PWA
- Offline fallback works safely
