---
name: doittimer-sprint2-frontend
description: Sprint 2 frontend skill for DoItTimer (dark mode theming + PWA installability + safe offline fallback) without breaking Sprint 1.
---

# DoItTimer — Sprint 2 Frontend (Theming + PWA)

## Why this skill exists
This skill packages the exact frontend steps we want Codex to follow so it can implement Sprint 2 safely, without breaking Sprint 1.

## Sprint identity
- Sprint: **S2 — Final MVP (Shipping + UX + Reliability)**
- Goal: turn Sprint 1 core loop (Tasks â†’ Focus â†’ Dashboard) into a ship-ready MVP:
  - theme support
  - PWA installability
  - minimal offline behavior
- Status: **NOT DONE (plan)**

## Repo baseline (confirmed constraints)
- Next.js 16 App Router with route groups: `(public)`, `(auth)`, `(app)`
- Tailwind v4 with `@import "tailwindcss";` and `@theme inline` in `app/globals.css`
- Layouts currently hard-code colors:
  - `app/layout.tsx`: `bg-white`, `text-zinc-900`
  - `app/(app)/layout.tsx`: zinc/white borders/backgrounds
- UI atoms in `components/ui/*` and icons in `components/ui/icons.tsx` (do not assume lucide-react)

**Non-breaking rule:** implement tokens first, then migrate incrementally. Avoid big sweeping refactors.

---

## Scope (Sprint 2 — Frontend)
- **S2-US1 (P0):** Dark mode (toggle + persistence, no flash)
- **S2-US2 (P0):** PWA installability (manifest + icons + metadata)
- **S2-US3 (P1):** Minimal offline behavior (safe offline fallback)

---

# S2-US1 — Dark mode (toggle + persistence)

## Goal
Add a theme system with:
- SSR theme application to prevent flash
- cookie persistence
- theme toggle in header and/or Settings

## Tasks (implementation plan)

### Task 1 — Expand theme tokens in `app/globals.css`
- Keep existing `:root --background/--foreground` as source of truth
- Add minimal extra tokens:
  - `--card`, `--card-foreground`
  - `--muted`, `--muted-foreground`
  - `--border`, `--ring`
- Add dark overrides:
  - `html[data-theme="dark"] { ... }`
- Extend `@theme inline` so Tailwind classes work:
  - `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`

### Task 2 — SSR theme injection (no flash)
Update `app/layout.tsx`:
- read cookie `theme` using `cookies()` from `next/headers`
- set `<html lang="en" data-theme={theme} suppressHydrationWarning>`
- replace body hard-coded classes with token baseline:
  - `bg-background text-foreground font-sans antialiased`

### Task 3 — Theme persistence via server action
Create `app/actions/theme.ts`:
- `setThemeAction(theme: 'light' | 'dark' | 'system')`
  - write cookie via `cookies().set(...)`
  - safe cookie config (`sameSite=lax`, `secure` in prod, 1 year maxAge)
  - `revalidatePath('/', 'layout')`
- `getTheme()` reads cookie (fallback `light`)

### Task 4 — Theme toggle component (client)
Create `components/layout/ThemeToggle.tsx`:
- client component
- use existing icon style (custom SVG, not lucide)
- optimistic UI toggle; server action runs in a transition

### Task 5 — Integrate toggle in app shell header
Update `app/(app)/layout.tsx` header:
- render `<ThemeToggle initialTheme={...} />`
- keep header layout stable

### Task 6 — Minimal class migration to tokens
Do NOT refactor everything.
Only update:
- `app/layout.tsx` and `app/(app)/layout.tsx`
- shared surfaces (header, main background, borders)
Replace patterns:
- `bg-white` â†’ `bg-background` or `bg-card`
- `text-zinc-900` â†’ `text-foreground`
- `border-zinc-200` â†’ `border-border`
- `text-zinc-600` â†’ `text-muted-foreground`

## Acceptance criteria
- Toggle works (header and/or Settings)
- Theme persists across refresh
- No theme flash on first paint
- `pnpm lint` and `pnpm typecheck` pass

---

# S2-US2 — PWA installability (manifest + icons + metadata)

## Tasks (implementation plan)
1) Update `app/layout.tsx` metadata:
   - title/description: DoItTimer
   - add `metadataBase` using `NEXT_PUBLIC_SITE_URL` when available
2) Add manifest route `app/manifest.ts` using `MetadataRoute.Manifest`
3) Add icons under `public/icons/`:
   - `icon-192.png`, `icon-512.png`
   - optional: `icon-192-maskable.png`, `icon-512-maskable.png`
4) Apple touch icon / favicon alignment (keep existing favicon if present)

## Acceptance criteria
- Lighthouse PWA installability checks pass (manifest + icons)
- Install prompt appears on supported browsers when criteria is met

---

# S2-US3 — Minimal offline behavior (safe offline fallback)

## Security constraints
Avoid caching authenticated SSR HTML with user data.
Prefer:
- caching static assets + shell
- offline fallback page
- optional last-known cache in localStorage (read-only)

## Tasks (implementation plan)
1) Add `/offline` route (no auth required)
2) Add safe service worker:
   - cache only static assets (`/_next/*`, `/icons/*`) and `/offline`
   - navigation fallback to `/offline`
   - do not cache API/server action requests
3) Register SW only in production
4) Optional: last-known cache in localStorage for read-only UX

## Acceptance criteria
- Offline refresh shows `/offline` (not browser error page)
- No caching of sensitive authenticated SSR HTML by default

---

## Frontend DoD checklist
- theme persists + no flash
- PWA manifest + icons present
- offline fallback works safely
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass (when implemented)

---
