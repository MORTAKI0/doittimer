---
name: doittimer-sprint2-backend
description: Sprint 2 Backend skill for DoItTimer — user settings (timezone + default task), timezone-correct “today” queries, and DB reproducibility without breaking Sprint 1 RPC contracts.
---

# DoItTimer — Sprint 2 Backend (Settings + Database)

## Why this “skill” exists
This skill standardizes backend work so Codex (and humans) implement Sprint 2 DB changes in a safe, repeatable way: RLS-first, backward-compatible RPC updates, and migrations that make the project reproducible.

## Sprint identity
- **Sprint:** S2 — Final MVP (Shipping + UX + Reliability)
- **Goal:** finalize MVP by adding Settings correctness and DB reproducibility
- **Status:** NOT DONE (plan)

## Repo baseline (confirmed)
- Supabase is used with SSR (`@supabase/ssr`)
- Sessions RPC names are already used by server actions:
  - `start_session({ p_task_id })`
  - `stop_session({ p_session_id })`
  - `get_active_session()`
  - `get_today_sessions()`
- Existing migration hardcodes timezone in `get_today_sessions()`:
  - `Africa/Casablanca` in `supabase/migrations/20260105_s1_us4_fix_rpc_overload_v2.sql`
- Code calls `get_dashboard_today_stats` via `app/actions/dashboard.ts` but repo has no migration for it.

**Non-breaking rule:** do not rename RPC functions. Change internals only.

---

## Scope (Sprint 2 — Backend)
- **S2-US5 (P1):** Settings MVP (timezone + focus defaults)
- Cross-cutting DB reproducibility:
  - add missing migration for `get_dashboard_today_stats`
  - remove hardcoded timezone from “today” computations safely

---

# S2-US5 — Settings MVP (timezone + default task)

## Why we pick this
“Today” boundaries depend on timezone, and defaults reduce friction (start focus faster). Also fixes the current hard-coded timezone bug.

## Data model
Create `public.user_settings`:
- `user_id uuid primary key` (must equal `auth.uid()`)
- `timezone text not null default 'Africa/Casablanca'`
- `default_task_id uuid null references public.tasks(id) on delete set null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## Tasks (DB-first implementation plan)

### Task 1 — Migration: `user_settings` table + RLS
- Create table
- Enable RLS
- Policies (owner-only):
  - SELECT where `user_id = auth.uid()`
  - INSERT with check `user_id = auth.uid()`
  - UPDATE using `user_id = auth.uid()`

### Task 2 — RPC: get + upsert settings
Add functions:
- `get_user_settings()`
  - returns settings row for current user
  - if missing: return defaults OR create default row (choose one and document)
- `upsert_user_settings(p_timezone text, p_default_task_id uuid)`
  - upsert current user row
  - validate timezone non-empty (DB-level simplest: `coalesce(nullif(trim(p_timezone), ''), 'Africa/Casablanca')`)

### Task 3 — Remove hardcoded timezone from “today”
Update internals of:
- `get_today_sessions()`
  - read timezone from `user_settings` (fallback to 'Africa/Casablanca')
  - compute start/end of “today” in that timezone
  - keep return columns identical so UI doesn’t break

### Task 4 — Make dashboard stats reproducible
Add migration for `get_dashboard_today_stats`:
- keep name exactly: `get_dashboard_today_stats`
- compute in the user timezone (same strategy as `get_today_sessions`)
- ensure return shape matches the code type:
  - `focus_seconds`
  - `sessions_count`
  - `tasks_total`
  - `tasks_completed`

## Acceptance criteria
- Users can save timezone and default task
- “Today sessions” and dashboard stats use the user timezone (not hardcoded)
- RPC names unchanged; return shapes remain compatible
- RLS blocks cross-user access

---

## Notes to avoid breaking Sprint 1
- Do NOT change:
  - sessions table columns
  - server action argument shapes
  - RPC names
- If you extend return shapes, do it with nullable optional columns only.
---
name: doittimer-sprint2-backend
description: Sprint 2 backend skill for DoItTimer (user settings timezone + default task, timezone-aware today queries, DB/RPC migrations). Use when implementing S2-US5 and DB reproducibility without renaming RPCs.
---
