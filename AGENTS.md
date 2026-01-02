# DoItTimer — Codex Instructions (Repo)

## Project context
DoItTimer is a Next.js App Router + TypeScript + Tailwind app.
Sprint 0 scope: Public home page + Supabase Auth (email/password + Google OAuth) + SSR session persistence.
Do NOT implement timer/tasks/stats in Sprint 0.

## Non-negotiable engineering rules
- App Router with route groups: (public), (auth), (app)
- Server-first: pages/layouts are Server Components unless browser APIs are required.
- Keep client boundaries small ("use client" only in leaf interactive components).
- Do not access Supabase directly from UI components unless explicitly planned (prefer server actions / server helpers).
- Use pnpm only.

## Commands to run after changes
- pnpm lint
- pnpm typecheck
- pnpm dev (manual smoke)

## Coding conventions
- Reusable UI components in src/components/ui
- Domain/infra helpers in src/lib
- Validation with zod for auth inputs
- No secrets committed; use .env.local

## Approval policy
- Ask before adding any new production dependencies (except Supabase + zod which are already approved for Sprint 0).

Optional: you can add folder-specific overrides later like src/app/(auth)/AGENTS.override.md if you want special rules for auth pages. Codex prioritizes overrides closer to the working directory.
OpenAI Developers
