---
name: nextjs-architecture
description: enforce clean, scalable next.js 16+ app router architecture for production applications. use when chatgpt is asked to create, refactor, organize, or review a next.js codebase, route, feature, data flow, server action, route handler, caching strategy, auth boundary, or folder structure with emphasis on server components, client boundaries, performance, maintainability, and clean architecture.
---

# Objective

Design and maintain a clean, predictable Next.js 16+ codebase using App Router, server-first rendering, explicit client boundaries, strong feature isolation, and consistent data flow.

# Core Rules

## 1) Prefer server-first
- Default to Server Components.
- Add `"use client"` only when interactivity, browser APIs, local state, refs, or event handlers are required.
- Keep client components as small leaf components whenever possible.

## 2) Separate by responsibility
Use this structure unless the user explicitly requests another one:

```text
src/
  app/
    (marketing)/
    (dashboard)/
    api/
    layout.tsx
    not-found.tsx
    global-error.tsx
  features/
    auth/
      components/
      server/
      actions/
      hooks/
      schemas/
      types/
      utils/
    bookings/
    users/
  shared/
    components/
    ui/
    hooks/
    lib/
    types/
    constants/
  server/
    auth/
    db/
    repositories/
    services/
    policies/
  styles/
```

### Meaning of top-level folders

* `app/`: routing, layouts, route segments, page composition only
* `features/`: business-domain code grouped by feature
* `shared/`: reusable cross-feature UI and utilities
* `server/`: server-only infrastructure and domain access
* `styles/`: global styles and design tokens if needed

## 3) Keep `app/` thin

* `page.tsx` should compose data and feature components, not hold large business logic.
* `layout.tsx` should handle layout composition and shared route concerns.
* Move reusable logic out of route files into `features/*` or `server/*`.

## 4) Keep server code server-only

* Database access, secrets, auth checks, repository logic, and privileged operations belong in `server/*` or `features/*/server`.
* Never import server-only modules into client components.
* Keep mutation logic out of presentational components.

## 5) Use actions deliberately

* Use Server Actions for UI-triggered mutations tightly coupled to forms or a route flow.
* Use Route Handlers for public endpoints, webhooks, integrations, or API-style contracts.
* Validate all action inputs before doing work.
* Return predictable results:

  * success state
  * validation errors
  * domain errors
  * unexpected failure fallback

## 6) Fetch close to the server boundary

* Fetch data in Server Components, loaders, or feature server modules.
* Do not scatter raw `fetch()` calls throughout many UI files.
* Wrap repeated fetching in feature-level server functions or repositories.

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

## 10) Error and state handling are required

Every route or feature should account for:

* loading
* empty
* success
* error
* unauthorized / forbidden when relevant

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
