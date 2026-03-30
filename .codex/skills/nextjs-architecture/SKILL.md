---
name: nextjs-architecture
description: Enforces Next.js App Router architecture, folder structure, and data flow. Use when creating features, reviewing route structure, or designing server/client boundaries.
---

# Objective

Design and maintain a clean, predictable Next.js 16+ codebase using App Router, server-first rendering, explicit client boundaries, strong feature isolation, and consistent data flow.

# Core Rules
- Default to Server Components.
- Use `"use client"` only when interactivity or browser APIs require it.
- Keep `app/` thin; move business logic into `features/*` or `server/*`.
- Keep server-only code out of client components.
- Use Server Actions and Route Handlers deliberately, with predictable results.
- Fetch at the server boundary.
- Model loading, empty, success, error, and auth states explicitly.

## Separate by responsibility
```text
src/
  app/         routing and composition
  features/    business-domain code
  shared/      reusable cross-feature UI and utilities
  server/      server-only infrastructure and domain access
  styles/      global styles and tokens
```

## 3) Keep `app/` thin

* `page.tsx` should compose data and feature components, not hold large business logic.
* `layout.tsx` should handle layout composition and shared route concerns.
* Move reusable logic out of route files into `features/*` or `server/*`.

## 7) Define clear data contracts

* Map raw backend or database shapes into stable UI-facing types.
* Avoid leaking ORM models directly into UI.
* Use DTOs or view models where needed.

## 8) Make cache behavior explicit

* State whether data is static, dynamic, revalidated, or uncached.
* Use tags and revalidation intentionally.
* Do not mix caching strategies randomly.
* If unsure, prefer correctness and clarity over clever caching.

## 9) Co-locate by feature, not by file type only

Prefer:

```text
features/profile/
  components/profile-card.tsx
  server/get-profile.ts
  actions/update-profile.ts
  schemas/profile-schema.ts
  types/profile.ts
```

Avoid giant global folders with hundreds of unrelated files.

# Component Guidelines

## Server Components

Use for:

* data fetching
* auth-gated rendering
* layout composition
* SEO-critical rendering
* expensive data shaping

## Client Components

Use for:

* forms with local interaction
* dropdowns, modals, tabs
* browser APIs
* optimistic UI
* client-side only hooks

## Presentational rule

* Components in `shared/ui` should be mostly dumb and reusable.
* Feature components may know business context.
* Do not bury domain decisions in generic UI primitives.

# Data Flow Pattern

Use this default mutation flow:

1. user interacts with client component
2. form submits to server action
3. server action validates input
4. server action calls service/repository
5. server action returns structured result
6. route or client refreshes/revalidates affected data
7. UI renders success or error state clearly

# Naming Rules

* Use kebab-case for files.
* Use descriptive names tied to responsibility.
* Avoid vague names like `utils.ts`, `helpers.ts`, `data.ts`, `thing.tsx`.
* Prefer `get-user-profile.ts` over `profile.ts`.

# Review Checklist

When asked to review architecture, check for:

* oversized route files
* client components doing server work
* duplicated fetching logic
* poor feature boundaries
* hidden cache behavior
* direct ORM leakage to UI
* unsafe server action design
* weak error states
* ambiguous file naming
* tight coupling across features

# Output Style

When producing architecture help:

1. show the recommended folder structure
2. explain the separation of responsibilities
3. provide sample file placement
4. call out anti-patterns explicitly
5. prefer incremental refactors over full rewrites unless the user asks for a rewrite
