# DoItTimer AGENTS

## Non-Negotiable Rules
- Use Next.js App Router route groups: `(public)`, `(auth)`, `(app)`.
- Prefer Server Components; add `"use client"` only for true browser interactivity.
- Keep `page.tsx` and `layout.tsx` thin; move business logic into features/server modules.
- Validate all mutation inputs with Zod on the server before data access.
- Run all mutations through server actions; keep return shapes predictable.
- Do not call backend services directly from random UI components.
- Use pnpm only.
- Ask before adding new production dependencies.
- Do not mix unrelated refactors into focused tasks.
- Never commit secrets; keep sensitive values in `.env.local`.

## Project Layout
```text
src/
  app/
    (public)/
    (auth)/
    (app)/
  features/
  server/
  shared/
  lib/
  components/
    ui/
```

## Supabase Usage
- Server Components / Server Actions / Route Handlers: use `createServerClient` from `@supabase/ssr`.
- Client Components only: use `createBrowserClient` from `@supabase/ssr`.
- Do not use Supabase directly outside the designated client boundary.

## Mandatory Skill Triggers
- Before creating or editing a feature: call `$nextjs-architecture`.
- Before writing or reviewing a form/action: call `$forms-validation`.
- Before any Supabase schema or RLS work: call `$doittimer-supabase`.
- Before reviewing code: call `$nextjs-code-review`.
- When debugging a Next.js issue: call `$nextjs-debugging`.
- When implementing security-sensitive logic: call `$nextjs-security`.
- When writing tests: call `$nextjs-testing`.
- When optimizing performance: call `$web-performance`.
- When designing the data layer: call `$api-data-layer`.
- When documenting in Notion: call `$notion-implementation-docs`.

## Commands
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (if script exists)
