# Quick Start — Sprint 3 (Pomodoro + Projects)

## Start here (commands)
- pnpm lint
- pnpm typecheck
- pnpm dev

## DB changes checklist
- Add migrations under `supabase/migrations/`
- Idempotent patterns: `if not exists`, `create or replace`
- RLS enabled and owner-only policies for `projects`
- `tasks.project_id` uses FK `on delete set null`
- Extend settings RPCs without renaming

## What to validate after each US

### After S3-US1 (Pomodoro settings)
- Save 50/10/20/4 → refresh → values unchanged
- Invalid values (0, negative, huge) → validation error
- Different user sees different values (RLS)

### After S3-US3 (Projects)
- Create project, rename, archive/unarchive
- Archived not shown by default (or shown in separate section)
- RLS isolation confirmed

### After S3-US4 (Tasks under projects)
- Create task with a project and without
- Edit task project
- Badge shows project
- If project archived, tasks remain valid

### After S3-US2 (Focus Pomodoro)
- New Pomodoro without task starts session
- New Pomodoro with task links session task_id
- Refresh while running keeps correct remaining time
- At 0: session auto-stops once (no duplicates)
- Break mode is UI-only (no DB rows created)

## Compatibility constraints (do NOT break)
- Keep existing RPC names stable
- Keep Sprint 1–2 server actions working
- Keep Playwright smoke tests stable (update selectors if needed)
