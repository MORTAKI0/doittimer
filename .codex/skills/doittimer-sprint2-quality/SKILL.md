---
name: doittimer-sprint2-quality
description: Sprint 2 quality skill for DoItTimer (deployment/env hardening, error boundaries/observability, Playwright smoke tests) protecting the Sprint 1 loop.
---

# DoItTimer — Sprint 2 Quality (Deployment + Observability + Testing)

## Why this skill exists
Shipping the MVP requires repeatable quality steps: deployment readiness, graceful error handling, and smoke tests that protect Sprint 1's core loop.

## Sprint identity
- Sprint: **S2 — Final MVP (Shipping + UX + Reliability)**
- Goal: production readiness + minimal safety net
- Status: **NOT DONE (plan)**

## Repo baseline (confirmed)
- `package.json` sets Node engine `24.x` (deployment must be compatible)
- No Playwright dependency yet
- No App Router error boundary files yet (`app/error.tsx`)
- Env validation exists in `lib/env.ts` (currently focused on Supabase URL/anon)

---

## Scope (Sprint 2 — Quality)
- **S2-US4 (P0):** Production deployment + env hardening
- **S2-US6 (P1):** Basic observability + error boundaries
- **S2-US7 (P1):** Playwright smoke tests (happy paths)

---

# S2-US4 — Deployment + env hardening

## Tasks (implementation plan)
1) Choose deployment target:
   - recommended: Vercel
   - alternative: Cloud Run (Docker)
2) Harden `lib/env.ts`:
   - required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - optional: `NEXT_PUBLIC_SITE_URL`, `SENTRY_DSN`
3) Supabase Auth config:
   - redirect URLs include prod domain
4) Build/runtime checks:
   - `pnpm build`
   - verify SSR auth gate works in production

## Compatibility note: Node 24
Many platforms default to Node 18/20.
Sprint 2 must decide:
- keep Node 24 and deploy where supported, OR
- adjust engine target (product decision)

## Acceptance criteria
- Production URL working
- Auth works
- Tasks/focus/dashboard work
- No missing env crashes

---

# S2-US6 — Observability + error boundaries

## Tasks (implementation plan)
1) Add App Router error boundary:
   - `app/error.tsx` (global)
   - optional: `app/(app)/error.tsx` (app section)
2) Standardize error mapping:
   - add helper `lib/errors/mapError.ts`
3) Server-side logging:
   - stable prefixes for server actions
4) Optional Sentry (behind `SENTRY_DSN` only)

## Acceptance criteria
- Unhandled errors show a friendly UI
- Logs are consistent and searchable

---

# S2-US7 — Playwright smoke tests

## Tasks (implementation plan)
1) Add deps:
   - `@playwright/test`
2) Add `playwright.config.ts` (baseURL for local/prod)
3) Add smoke tests:
   - `auth.spec.ts` login
   - `tasks.spec.ts` create â†’ toggle â†’ edit â†’ delete
   - `focus.spec.ts` start â†’ stop â†’ duration > 0
   - `dashboard.spec.ts` stats update after session
   - `guard.spec.ts` cannot start second session
4) Test user strategy:
   - seeded user via env, OR create user at setup (prefer deterministic)

## Acceptance criteria
- Tests pass locally
- Tests stable (avoid flaky waits; use deterministic selectors)

---

## Sprint 2 Quality DoD checklist
- Deployment steps reproducible
- Error UX exists
- Smoke tests cover core loop
- `pnpm lint`, `pnpm typecheck`, `pnpm build` pass (when implemented)

---
