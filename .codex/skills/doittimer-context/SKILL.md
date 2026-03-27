---
name: doittimer-context
description: DoItTimer-specific project context: folder layout, route groups, Supabase client rules, auth boundaries, and mutation patterns. Use when working on any DoItTimer feature, debugging project structure, or needing repo-specific conventions.
---

# Objective

Provide DoItTimer-specific guardrails that complement generic Next.js skills.

# Folder Layout

```text
src/app/(public)/     -> marketing/landing pages, no auth required
src/app/(auth)/       -> sign in, sign up, password reset
src/app/(app)/        -> main app, requires authenticated session
src/features/         -> feature-scoped logic
src/server/           -> server-only: db, repositories, services
src/shared/           -> cross-feature UI and utilities
src/lib/              -> infrastructure helpers
src/components/ui/    -> reusable UI primitives
```

# Supabase Client Rules

- Server Components / Server Actions / Route Handlers: use `createServerClient` from `@supabase/ssr`.
- Client Components: use `createBrowserClient` from `@supabase/ssr`.
- Never use Supabase directly from UI components that are not the designated client boundary.

# Auth Boundary Rules

- Session checks happen in `(app)` `layout.tsx` via middleware or server-side session reads.
- Do not rely on client-side guards for protected routes.
- Redirect unauthenticated access to `(app)` routes to `/sign-in`.

# Mutation Pattern

- All mutations go through server actions in `features/*/actions/`.
- Return shape: `{ ok: boolean, message?: string, fieldErrors?: Record<string, string[]> }`.
- Validate all inputs with Zod before any Supabase call.
- Call `revalidatePath` or `revalidateTag` after successful mutations.

# Testing Setup

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`: TBD (script not currently defined)
- `pnpm test:e2e` and `pnpm test:e2e:ui` are available for Playwright flows.

# Verification

After changes, run `scripts/verify.sh`.
