---
name: doittimer-sprint3
description: Sprint 3 skill for DoItTimer (Pomodoro preferences + Focus New Pomodoro + Projects + Tasks under Projects) with backward-compatible DB/RPC changes and minimal surface area.
---

# DoItTimer — Sprint 3 (Pomodoro + Projects)

## Why this skill exists
Sprint 3 introduces **Pomodoro customization** and **Projects** without breaking the existing Sprint 1–2 daily loop (Tasks → Focus → Dashboard) or destabilizing RPC contracts.

## Sprint identity
- Sprint: **S3 — Pomodoro + Projects**
- Duration: **2 weeks**
- Goal: Focus becomes a **Pomodoro personnalisable** (prefs persisted) + Tasks can be grouped under **Projects** (optional)
- Status: **NOT DONE (plan)**

## MVP decisions (must follow)
1) **Focus session = Work only** (breaks are UI-only)
2) **DB is source of truth** for sessions (started_at/ended_at/duration_seconds)
3) **New Pomodoro** supports task OR no task
4) Projects are **archivable**; hard delete not required

## Repo invariants (do not violate)
- Keep existing RPC names stable (no renaming)
- Keep return shapes used by `app/actions/*` compatible
- Prefer Server Components + server actions; keep `use client` minimal
- RLS must remain correct on all new/changed tables

---

# Scope (Sprint 3)

## S3-US1 — Pomodoro preferences in Settings (P0)
### What to build
- Persist per-user Pomodoro fields in `public.user_settings`
- Extend `get_user_settings()` + `upsert_user_settings(...)` to include these fields
- Add Settings UI inputs with validation

### Key constraints
- Extend (don’t replace) existing settings logic
- Add bounds validation (Zod + optional DB CHECK constraints)

---

## S3-US2 — Focus: “New Pomodoro” + optional task (P0)
### What to build
- On `/focus`, when idle: CTA **New Pomodoro**
- User selects a task or “No task”
- Start a work session via existing session start RPC (task_id optional)
- Countdown display:
  - Remaining time computed from `session.started_at` + `work_minutes`
- At 0:
  - stop the session once (guard)
  - enter Break mode (local only)

### Key constraints
- Never create break rows in DB this sprint
- Avoid flaky intervals: compute work remaining from timestamps
- Ensure refresh restores correct state

---

## S3-US3 — Projects CRUD minimal (P0)
### What to build
- New table `public.projects` with owner-only RLS
- Server actions for create/list/rename/archive
- UI: minimal manage panel inside Tasks page (recommended)

### Key constraints
- Archive (soft) is enough; avoid complicated deletes
- Keep UI surface small

---

## S3-US4 — Tasks under Projects (P0)
### What to build
- Add `tasks.project_id` nullable FK → `projects(id)` (on delete set null)
- Update Tasks create/edit to assign project or none
- Display project badge

### Key constraints
- Tasks must remain valid if project is archived or deleted
- Avoid breaking existing tasks flows (edit/delete/toggle)

---

## S3-US5 — Project filter (P1)
### What to build
- Filter tasks list by:
  - All / No project / Project X
- Prefer client filter first; DB filter later if needed

---

## “Don’t break old things” checklist
- No RPC renames
- Migrations are idempotent
- RLS verified for projects + tasks.project_id
- Update Playwright smoke tests if UI labels change
- Run:
  - pnpm lint
  - pnpm typecheck
