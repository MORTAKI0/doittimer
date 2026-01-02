---
name: doittimer-sprint0-auth
description: Implement Supabase Auth for DoItTimer (email/password + Google OAuth) with SSR session cookies and protected (app) routes.
metadata:
  short-description: Supabase auth + SSR + protected layout for DoItTimer
---

## Goal
Implement Sprint 0 auth only (no tasks/timer/stats).

## Constraints
- Use Next.js App Router route groups: (public), (auth), (app)
- Use @supabase/ssr for server-side cookie session handling
- Provide login + signup pages and a logout action
- Protected server layout for /(app) that redirects to /login when unauthenticated
- Show user-friendly errors in UI

## Acceptance checklist
- Email signup works
- Email login works
- Google OAuth works (redirect flow)
- Refresh /dashboard keeps session (SSR cookies)
- Logout clears session and redirects to /
- pnpm lint + pnpm typecheck pass
