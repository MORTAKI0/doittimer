---
name: doittimer-sprint2-quality
description: Sprint 2 Quality skill for DoItTimer — deployment/env hardening, error boundaries + observability basics, and Playwright smoke tests for the Sprint 1 core loop.
---

# DoItTimer — Sprint 2 Quality (Deployment + Observability + Testing)

## Why this “skill” exists
Shipping the MVP requires repeatable quality steps: deployment readiness, graceful error handling, and smoke tests that protect Sprint 1’s core loop. This skill bundles those steps so Codex can execute them reliably.

## Sprint identity
- **Sprint:** S2 — Final MVP (Shipping + UX + Reliability)
- **Goal:** production readiness + minimal safety net
- **Status:** NOT DONE (plan)

## Repo baseline (confirmed)
- `package.json` sets Node engine `24.x` (important for deployment target compatibility)
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

## Why we pick this
MVP isn’t MVP until it runs in production. Env hardening prevents “works locally, fails in prod”.

## Tasks (implementation plan)
1) Choose deployment target:
   - Recommended: Vercel (fastest for Next.js App Router)
   - Alternative: Cloud Run (Docker) if you want GCP alignment
2) Harden `lib/env.ts`:
   - keep required:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - add optional:
     - `NEXT_PUBLIC_SITE_URL` (metadataBase)
     - `SENTRY_DSN` (only if using S2-US6 optional)
3) Update metadata base usage (frontend story will use the new env var)
4) Supabase Auth configuration:
   - ensure redirect URLs include prod domain
5) Build/runtime checks:
   - `pnpm build`
   - verify SSR auth gate works in production

## Compatibility note: Node 24
Many managed platforms default to Node 18/20.
This sprint must include a decision:
- keep Node 24 and deploy on a platform/runtime that supports it, OR
- adjust engine target (product decision)
Document the decision and keep it consistent.

## Acceptance criteria
- Production URL working
- Auth works
- Tasks/focus/dashboard work
- No missing env crashes

---

# S2-US6 — Observability + error boundaries

## Why we pick this
We need friendly failures and basic diagnostics in production.

## Tasks (implementation plan)
1) Add App Router error boundary:
   - `app/error.tsx` (global)
   - optional `app/(app)/error.tsx` (app section)
2) Standardize error mapping:
   - create helper `lib/errors/mapError.ts` used by client components
   - reduce duplicated inline maps (e.g., Focus panel error strings)
3) Server-side logging:
   - ensure server actions log errors with stable prefixes (e.g., `doittimer:action:sessions:start`)
4) Optional Sentry:
   - behind `SENTRY_DSN` only (do not make required)

## Acceptance criteria
- Unhandled errors show friendly UI
- Logs are consistent and searchable

---

# S2-US7 — Playwright smoke tests

## Why we pick this
Protect Sprint 1 core loop from regression:
- login → tasks → focus → dashboard
- active session guard

## Tasks (implementation plan)
1) Add deps:
   - `@playwright/test`
2) Add `playwright.config.ts`:
   - baseURL for local/prod
3) Add smoke tests:
   - `auth.spec.ts` login
   - `tasks.spec.ts` create → toggle → edit → delete
   - `focus.spec.ts` start → stop → duration > 0
   - `dashboard.spec.ts` stats update after session
   - `guard.spec.ts` cannot start second session
4) Test user strategy:
   - use env credentials for seeded user, OR
   - create user at setup step (prefer deterministic)

## Acceptance criteria
- Tests pass locally
- Tests stable (avoid flaky waits; prefer deterministic selectors)

---

## Sprint 2 Quality DoD checklist
- Deployment plan documented and validated
- Error boundary pages exist
- Smoke tests cover core loop
- `pnpm lint` + `pnpm typecheck` + `pnpm build` pass (when implemented)
---
name: doittimer-sprint2-quality
description: Sprint 2 quality skill for DoItTimer (deployment/env hardening, error boundaries/observability, Playwright smoke tests). Use when implementing S2-US4/S2-US6/S2-US7 and protecting Sprint 1 loop.
---
