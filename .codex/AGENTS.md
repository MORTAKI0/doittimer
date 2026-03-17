# DoItTimer — Codex Instructions (Repo)

## Project context
DoItTimer is a Next.js App Router + TypeScript + Tailwind application.

Current focus:
- new feature implementation
- clean App Router architecture
- server-first rendering
- maintainable UI patterns
- safe validation and mutation flows
- strong security, performance, and repo standards

Implement only what the current task requires.
Do not add unrelated features, broad rewrites, or speculative improvements.

## Source of truth for implementation style
Use the local skills in `.codex/skills` when relevant, especially:
- notion-implementation-docs
- nextjs-architecture
- frontend-ui-system
- nextjs-code-review
- nextjs-debugging
- nextjs-testing
- web-performance
- nextjs-security
- forms-validation
- api-data-layer
- repo-standards

## Non-negotiable engineering rules
- Use Next.js App Router patterns consistently.
- Prefer Server Components by default.
- Add `"use client"` only when browser APIs, event handlers, refs, local interactive state, or client-only hooks are required.
- Keep client components small and leaf-level where possible.
- Keep `page.tsx` and `layout.tsx` thin.
- Move business logic, validation, and data access out of route files where practical.
- Do not access Supabase or other backend services directly from arbitrary UI components unless the task explicitly requires it.
- Prefer server actions, route handlers, server helpers, services, or repositories for mutations and privileged operations.
- Use pnpm only.
- Preserve existing conventions unless the task explicitly asks to change them.
- Do not mix unrelated refactors into focused implementation work.

## Repository structure conventions
- Reusable UI primitives live in `src/components/ui` unless the task explicitly uses another shared UI location.
- Shared/domain/infrastructure helpers live in `src/lib`.
- Group feature logic clearly by responsibility.
- Prefer descriptive kebab-case file names.
- Avoid vague file names like `utils.ts`, `helpers.ts`, `data.ts`, `misc.ts`, or `temp.ts`.

## Validation and data handling
- Use `zod` for input validation where appropriate.
- Server validation is the source of truth.
- Keep mutation result shapes predictable and stable.
- Do not leak raw backend or database models directly into UI when a mapped shape is clearer.
- Make loading, empty, success, error, and unauthorized states explicit where relevant.

## Security and secrets
- Never commit secrets, tokens, or credentials.
- Use `.env.local` for local secrets.
- Do not expose server-only environment variables to client code.
- Be careful with auth boundaries, redirects, input validation, and sensitive data handling.

## Dependency approval policy
- Ask before adding any new production dependency.
- Prefer built-in platform features and existing repo utilities before adding packages.

## Commands to run after meaningful changes
- `pnpm lint`
- `pnpm typecheck`
- `pnpm dev` for manual smoke validation when relevant

## Documentation rules
- Keep docs concise, practical, and scoped to the task.
- Use local markdown files when documentation is needed.
- Prefer short sections, checklists, and explicit implementation decisions.
- Never include secrets or credentials; use `[REDACTED]` if needed.

## Optional overrides
You may add folder-specific overrides such as:
- `src/app/(auth)/AGENTS.override.md`
- `src/app/(app)/AGENTS.override.md`
- `src/features/<feature>/AGENTS.override.md`

More local override files take priority over this repo-level file.
