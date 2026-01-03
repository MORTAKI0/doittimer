---
name: doittimer-sprint2-frontend
description: Sprint 2 Frontend skill for DoItTimer — theming (dark mode), PWA installability, and safe offline fallback without breaking Sprint 1.
---

# DoItTimer — Sprint 2 Frontend (Theming + PWA)

## Why this “skill” exists
Codex “skills” are reusable instruction bundles that let the agent follow a consistent workflow across tasks. This Sprint 2 skill packages the exact frontend steps we want Codex to follow so it can implement Sprint 2 safely, without breaking Sprint 1.

## Sprint identity
- **Sprint:** S2 — Final MVP (Shipping + UX + Reliability)
- **Goal:** turn Sprint 1 “core daily loop” (Tasks → Focus → Dashboard) into a **ship-ready MVP**:
  - theme support
  - installability (PWA)
  - minimal offline behavior
- **Status:** NOT DONE (plan)

## Repo baseline (confirmed constraints)
- **Next.js 16 App Router** with route groups: `(public)`, `(auth)`, `(app)`
- **Tailwind v4** with `@import "tailwindcss";` and `@theme inline` already present in `app/globals.css`
- Root layout uses hard-coded colors:
  - `app/layout.tsx` uses `bg-white` and `text-zinc-900`
- App shell layout uses hard-coded zinc/white:
  - `app/(app)/layout.tsx`
- Icons are custom SVGs in `components/ui/icons.tsx` (do not assume lucide-react)
- Do NOT rename any routes or server actions

---

## Scope (Sprint 2 — Frontend)
- **S2-US1 (P0):** Dark mode (toggle + persistence, no flash)
- **S2-US2 (P0):** PWA installability (manifest + icons + metadata)
- **S2-US3 (P1):** Minimal offline behavior (safe offline fallback)

---

# S2-US1 — Dark mode (toggle + persistence)

## Why we pick this
Dark mode is MVP-level UX polish for a timer app and also improves the “app-like” feel that complements PWA installability.

## Non-breaking strategy
1) Expand CSS tokens first (no component rewrites).
2) Switch the root/app layouts to token-based classes.
3) Add SSR cookie-based theme application to eliminate flash.
4) Add a toggle component using existing icon style.

## Tasks (implementation plan)

### Task 1 — Expand theme tokens in `app/globals.css`
- Keep existing `:root --background/--foreground` as the source of truth.
- Add minimal extra tokens:
  - `--card`, `--card-foreground`
  - `--muted`, `--muted-foreground`
  - `--border`, `--ring`
- Add dark overrides using:
  - `html[data-theme="dark"] { ... }`
- Extend `@theme inline` mappings so Tailwind can use classes like:
  - `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`

### Task 2 — SSR theme injection (no flash)
Update `app/layout.tsx`:
- Read cookie `theme` using `cookies()` from `next/headers`
- Set `<html lang="en" data-theme={theme} suppressHydrationWarning>`
- Replace body hard-coded classes with token-based baseline:
  - `bg-background text-foreground font-sans antialiased`

Important:
- Make this change ONLY after tokens exist so you don’t break styling.

### Task 3 — Theme persistence via server action
Create `app/actions/theme.ts`:
- `setThemeAction(theme: 'light' | 'dark' | 'system')`
  - write cookie via `cookies().set(...)`
  - use safe cookie config (`sameSite=lax`, `secure` in prod, 1 year maxAge)
  - `revalidatePath('/', 'layout')` after change
- `getTheme()` that returns theme from cookie (fallback `light`)

### Task 4 — Theme toggle component (client)
Create `components/layout/ThemeToggle.tsx`:
- client component
- uses existing Button style and custom SVG icons:
  - either add `IconSun` / `IconMoon` into `components/ui/icons.tsx`
  - or inline minimal SVGs in the toggle component
- optimistic UI toggle (instant icon switch), server action runs in transition

### Task 5 — Integrate toggle in app shell header
Update `app/(app)/layout.tsx` header:
- render `<ThemeToggle initialTheme={...} />`
- keep header layout stable

### Task 6 — Minimal class migration to tokens
Do NOT refactor everything.
Only update:
- `app/layout.tsx` and `app/(app)/layout.tsx`
- shared surfaces (header container, main background, borders)
Replace patterns:
- `bg-white` → `bg-background` or `bg-card` depending on surface
- `text-zinc-900` → `text-foreground`
- `border-zinc-200` → `border-border`
- secondary text `text-zinc-600` → `text-muted-foreground`

## Acceptance criteria
- Toggle works (header and/or Settings)
- Theme persists across refresh
- No theme flash on first paint
- `pnpm lint` and `pnpm typecheck` pass

---

# S2-US2 — PWA installability (manifest + icons + metadata)

## Why we pick this
A timer app feels incomplete if it can’t be installed. Installability is part of “real MVP.”

## Tasks (implementation plan)

### Task 1 — Metadata update
Update `app/layout.tsx` `metadata`:
- Title/description set to DoItTimer
- Add `metadataBase` using `NEXT_PUBLIC_SITE_URL` when available (fallback localhost)

### Task 2 — Add manifest route
Create `app/manifest.ts` using Next.js `MetadataRoute.Manifest`:
- `name`, `short_name`, `start_url`, `display: 'standalone'`
- icons array pointing to `/icons/...`

### Task 3 — Add icons
Add to `public/icons/`:
- `icon-192.png`
- `icon-512.png`
Optional but recommended:
- `icon-192-maskable.png`
- `icon-512-maskable.png`

### Task 4 — Apple touch icon / favicon alignment
- Keep existing favicon but ensure PWA icons are correct.

## Acceptance criteria
- Lighthouse: installable PWA checks pass (manifest + icons)
- Browser install prompt available when criteria met

---

# S2-US3 — Minimal offline behavior (safe offline fallback)

## Why we pick this
Users expect the app to open even with unstable connectivity.

## Security constraints
Avoid caching authenticated SSR HTML with user data.
Prefer:
- caching static assets + shell
- offline fallback page
- optional last-known cache in localStorage (read-only)

## Tasks (implementation plan)

### Task 1 — Offline fallback route
Create `app/offline/page.tsx`:
- simple message + retry button
- do not require auth

### Task 2 — Service worker strategy
Option A (recommended for MVP safety):
- custom SW at `public/sw.js` with safe caching:
  - cache `/_next/*`, `/icons/*`, `/offline`
  - navigation fallback to `/offline`
  - do not cache API/server action calls
Option B:
- `next-pwa` with strict config to avoid caching personalized HTML (only if you already use/accept it)

### Task 3 — Register SW in production only
Create `components/layout/ServiceWorkerRegister.tsx` (client):
- register `/sw.js` only in production
- no failures should break the app

### Task 4 (optional) — Last-known cache for read-only UX
In client components (optional):
- store last known tasks/sessions in localStorage
- allow user to show cached snapshot when server data fails

## Acceptance criteria
- Offline refresh shows `/offline` page (not a browser error page)
- No caching of sensitive authenticated SSR HTML by default

---

## Frontend DoD checklist
- Theme toggle works + persists + no flash
- PWA manifest + icons present
- Offline fallback works
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass (when later implemented)
---
name: doittimer-sprint2-frontend
description: Sprint 2 frontend skill for DoItTimer (dark mode theming + PWA installability + safe offline fallback). Use when implementing S2-US1/S2-US2/S2-US3 without breaking Sprint 1.
---
