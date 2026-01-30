# DoItTimer - Codex Instructions (Repo)

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

## Planning and execution governance
- PHASE header required in operator prompts. If missing, respond: "I need a PHASE header to proceed."
- PLANNING is read-only to product code. Allowed files only:
  - AGENTS.md (repo root)
  - PLANS.md (repo root)
  - sprint/2026-02/BACKLOG.md
  - sprint/2026-02/EXECPLAN.md
  - sprint/2026-02/DECISIONS.md (optional)
  - sprint/2026-02/RETROSPECTIVE.md
  - sprint/2026-02/METRICS.json (optional)
  - .codex/skills/** (skill files only)
  - .codex/review_prompt.md (optional)
- EXECUTION requires APPROVED line in sprint/2026-02/EXECPLAN.md with name and date.
- Failure protocol: stop -> capture evidence -> revert smallest unit -> update plan -> re-approve if material.

## Review guidelines
- Review-only safety: when asked to review, do not modify code unless explicitly asked.
- Treat auth/permissions regressions as P0.
- Treat RLS/policy mistakes as P0.
- No secrets/PII in logs (P0).
- DB migrations must be backward compatible (P0/P1).
- Any contract/API change must include compatibility notes + tests (P1).

## Approval policy
- Ask before adding any new production dependencies (except Supabase + zod which are already approved for Sprint 0).
