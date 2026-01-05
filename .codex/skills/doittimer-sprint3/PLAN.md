# Sprint 3 — Execution Plan (Pomodoro + Projects)

## Sprint identity
- Sprint: S3 (2 weeks)
- Goal: Focus becomes a personalized Pomodoro + Tasks can belong to Projects (optional)

## MVP decisions (must follow)
1) Tracking: focus session = Work only (breaks do NOT create DB sessions)
2) DB is source of truth for sessions (started_at/ended_at/duration_seconds)
3) New Pomodoro supports starting with a task OR without a task
4) Projects: archive is enough (no hard delete required)

---

## Phase 0 — Pre-flight (always)
- Create a new git branch
- Run from repo root
- Confirm existing contracts:
  - do not rename existing RPCs
  - keep return shapes used by server actions
- Run baseline:
  - pnpm lint
  - pnpm typecheck

---

## Phase 1 — S3-US1 Settings Pomodoro prefs (DB + RPC + UI)
DB:
- Add columns to `public.user_settings`:
  - pomodoro_work_minutes (default 25)
  - pomodoro_short_break_minutes (default 5)
  - pomodoro_long_break_minutes (default 15)
  - pomodoro_long_break_every (default 4)
- Add CHECK constraints (recommended bounds)

RPC:
- Extend `get_user_settings()` return shape to include new fields
- Extend `upsert_user_settings(...)` to accept new fields
- Keep names stable (no rename)

App:
- Update `app/actions/settings.ts` (types + Zod + payload)
- Update `app/(app)/settings/SettingsForm.tsx` (inputs + helper text)

Exit:
- Save values, refresh, confirm persisted
- pnpm lint + typecheck

---

## Phase 2 — S3-US3 Projects CRUD (DB + server actions + UI)
DB:
- Create `public.projects` (user_id, name, archived_at, timestamps)
- Add RLS owner-only policies (same pattern as tasks/settings)

App:
- Add `app/actions/projects.ts`:
  - createProject, getProjects, renameProject, toggleArchiveProject
- UI: embed simple “Projects” panel in Tasks page (recommended to limit surface)

Exit:
- Create/rename/archive/unarchive works
- RLS isolation confirmed
- pnpm lint + typecheck

---

## Phase 3 — S3-US4 Tasks under Project
DB:
- Add `tasks.project_id` nullable FK -> projects(id) ON DELETE SET NULL
- Index (user_id, project_id)

App:
- Update tasks server actions:
  - createTask supports projectId?
  - updateTask supports project change (projectId|null)
  - list tasks includes project_id (optionally project name via join)
- UI:
  - create/edit task includes project selector
  - list shows project badge

Exit:
- Task can be created with project or no project
- Changing project works
- pnpm lint + typecheck

---

## Phase 4 — S3-US2 Focus “New Pomodoro” + optional task
App:
- `/focus` loads settings (pomodoro durations) + tasks list for selector
- “New Pomodoro” CTA when idle:
  - pick task OR “No task” and start work
- Work countdown:
  - computed from `session.started_at` + pomodoro_work_minutes
- Auto-stop at 0:
  - call stop_session once (guard)
- Break mode:
  - local countdown only (no DB)
  - “Start break / Skip break / Start next Pomodoro”

Exit:
- Start with/without task
- Refresh during running: remaining time correct
- Auto-stop creates a finished session
- pnpm lint + typecheck

---

## Phase 5 — S3-US5 Filters (P1)
- Add filter (All / No project / Project X) on Tasks
- Prefer client-side filtering first (simple)

Exit:
- Filter works + doesn’t break edit/delete flows

---

## Phase 6 — Verify pass (regression)
- Core loop still works:
  - Login, Tasks CRUD, Focus start/stop, Dashboard totals update, Settings save
- Update Playwright smoke tests if labels changed
