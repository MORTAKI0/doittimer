# DoItTimer AGENTS

## Non-negotiable engineering rules
- Use Next.js App Router route groups: `(public)`, `(auth)`, `(app)`.
- Prefer Server Components; add `"use client"` only for leaf interactivity.
- Keep `page.tsx` and `layout.tsx` thin; move business logic into features/server modules.
- Validate mutation inputs with Zod on the server before data access.
- Use pnpm only.
- Never commit secrets; keep sensitive values in `.env.local`.

## Supabase
- Server Components, Server Actions, and Route Handlers: use `createServerClient` from `@supabase/ssr`.
- Client Components only: use `createBrowserClient` from `@supabase/ssr`.
- Keep Supabase access out of generic UI components.

## Auth boundaries
- Public routes live in `(public)`.
- Auth flow routes live in `(auth)`.
- Protected app routes live in `(app)` and must enforce session checks on the server.
- Client components may reflect auth state, not own it.

## Mutation pattern
- Prefer server actions for writes.
- Return `{ ok: true, data }` or `{ ok: false, error }`.
- Keep errors typed and user-safe.

## Restricted paths
- Do not modify without explicit approval:
  - `supabase/migrations/**`
  - `supabase/policies/**`
  - `middleware.ts`
  - `.env*`
  - `vercel.json`
  - `.github/workflows/**`
  - `package.json`
  - lockfiles
  - auth/session handlers
  - webhook/payment handlers

## Stabilization mode
- For the first 10 real runs, only allow:
  - docs/copy changes
  - small UI changes
  - test additions
  - isolated frontend cleanup
- Reject and escalate anything else.

## Validation order
Run in this order:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm build`
4. relevant tests if required by task class

## Change limits
- Escalate if predicted scope is unclear.
- Escalate if restricted files may be touched.
- Escalate if task exceeds class limits for files or diff size.
- Escalate if schema/auth/payment behavior may change.

## Folder layout
Intended target layout:
```text
src/
  app/
    (public)/
    (auth)/
    (app)/
  components/
    ui/
  features/
  lib/
  server/