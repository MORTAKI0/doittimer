---
name: doittimer-sprint3-quality
description: Sprint 3 quality skill for DoItTimer (clean code, regression safety, stable migrations/RLS, and test hygiene) to protect Sprint 1–2 features while adding Pomodoro + Projects.
---

# DoItTimer — Sprint 3 Quality (Clean code + Regression)

## Why this skill exists
Sprint 3 touches Settings, Focus, Tasks, and DB schema. This skill ensures we ship **clean, maintainable code** while keeping the Sprint 1–2 loop stable.

## Core principles
- **Smallest change wins**: implement the story with minimal refactors
- **Server-first**: Server Components + server actions as the default
- **Stable contracts**: don’t rename RPCs; keep return shapes compatible
- **RLS-first DB**: every new/changed table must remain owner-scoped
- **Testable UI**: use stable selectors; avoid flaky waits

## Required gates
- pnpm lint
- pnpm typecheck
- Manual smoke checklist (login/tasks/focus/dashboard/settings)

## DB guardrails
- Migrations idempotent and reproducible
- New table: RLS enabled + policies
- New FK columns: consider `on delete set null` to avoid orphan breakage
- Indexes only when justified by query patterns

## Test hygiene
- If button labels change (“Start” → “New Pomodoro”), update Playwright selectors
- Prefer adding `data-testid` over brittle text selectors (only where needed)
- Avoid time-based sleeps; wait for UI state

## Definition of Done (Sprint 3 quality)
- No regressions in Sprint 1–2 flow
- Sprint 3 stories work as specified
- Lint/typecheck pass
- Smoke tests are stable and updated
