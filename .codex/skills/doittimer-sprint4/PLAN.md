# DoItTimer — Sprint 4 Plan (S4)

## Sprint identity
- Sprint: S4
- Duration: 2 weeks
- Goal:
  1) More control: Pomodoro per task overrides
  2) Integration foundations: Notion export + Music tagging (+ optional iCal read-only)
- Reality check:
  - No bi-directional sync + OAuth + background jobs in this sprint.

---

## Scope
### P0 (Must)
- S4-US1 — Pomodoro per Task (overrides)
- S4-US2 — Music tagging (manual URL)
- S4-US3 — Notion integration (one-way export + Sync now + mapping)

### P1 (Should)
- S4-US4 — Calendar read-only via iCal URL (manual refresh)
- S4-US5 — Sync foundation improvements (idempotency + better errors)

---

## Delivery order (recommended)
1) US1 (no external deps, low risk)
2) US2 (small schema + UI)
3) US3 (Notion one-way export, bigger surface)
4) US5 (reliability pass for US3)
5) US4 (optional; if time remains)

---

# S4-US1 — Pomodoro per Task (overrides)

## User story
As a user, I want optional Pomodoro durations per task so focus adapts per task.

## Acceptance criteria
- In task edit:
  - toggle "Use custom Pomodoro"
  - nullable override fields:
    - work / short break / long break / long break every
  - reset button clears overrides (null)
- Focus uses override when selected task has overrides, else Settings defaults.
- Validation ranges match Settings.
- No DB change to sessions model.
- Build + E2E stable.

## DB (migration)
- Add nullable columns to `public.tasks`:
  - pomodoro_work_minutes_override
  - pomodoro_short_break_minutes_override
  - pomodoro_long_break_minutes_override
  - pomodoro_long_break_every_override
- Add CHECK constraints that allow NULL but validate ranges when set.

## Repo touchpoints
- `app/actions/tasks.ts` (TaskRow + update action)
- `app/(app)/tasks/components/TaskList.tsx` (edit UI)
- `app/(app)/focus/*` (compute effective pomodoro durations)

## Implementation tasks
- Add migration SQL file (idempotent).
- Extend `TaskRow` select (additive).
- Add `updateTaskPomodoroOverrides(taskId, overrides)` server action.
- Add UI inputs in edit mode + reset button.
- Update Focus effective settings computation.
- Verify lint/typecheck/build + E2E.

---

# S4-US2 — Music tagging (manual link)

## User story
As a user, I want to attach a music link (track/playlist URL) to a work session.

## Acceptance criteria
- Optional URL input (empty allowed)
- Saved to the work session
- Shown in Today sessions list (clickable)
- No OAuth
- No regression in start/stop

## DB
- Add `public.sessions.music_url text null` (+ optional length check)

## Repo touchpoints
- `app/actions/sessions.ts` (add update after start or extend existing flow)
- `app/(app)/focus/*` (input + persistence)
- dashboard / focus session list rendering

## Implementation tasks
- Add migration SQL file.
- Add server action `updateSessionMusicUrl(sessionId, url|null)`.
- In Focus UI: input before start or editable while running.
- Render link in sessions list.
- Verify regression suite.

---

# S4-US3 — Notion integration (one-way export + Sync now)

## User story
As a user, I want to connect Notion and sync my projects/tasks into a Notion database.

## Acceptance criteria (MVP)
- Settings > Integrations > Notion:
  - token + database id inputs
  - Connect / Disconnect / Sync now
  - last synced at + status + last error
- One-way: app -> Notion
- Idempotent: update existing pages using mapping tables
- Secrets never sent to client

## DB (tables + RLS)
- `public.notion_connections` (unique per user)
- `public.notion_task_map` (task_id -> notion_page_id)
- `public.notion_project_map` (project_id -> notion_page_id)

## Repo touchpoints
- New: `app/actions/notion.ts`
- New UI section in settings:
  - either `app/(app)/settings/*` or `app/(app)/settings/integrations/*`
- `app/actions/tasks.ts`, `app/actions/projects.ts` (export data)

## Implementation tasks
- Add migrations for the 3 tables + RLS.
- Add server actions:
  - getNotionConnection()
  - connectNotion(token, dbId)
  - disconnectNotion()
  - syncNotionNow()
- Implement Notion client server-side only.
- Implement sync algorithm:
  - load projects/tasks
  - for each item: create or update page based on mapping
  - persist mapping + connection last sync status
- UX: show last sync status + error.
- Regression: ensure existing tests pass.

---

# S4-US4 — Calendar read-only via iCal URL (P1)

## User story
As a user, I want to see today’s calendar events inside the app.

## Acceptance criteria
- Store iCal feed URL
- Manual refresh
- Show today events (timezone-aware)
- Errors handled (invalid feed)

## DB
- `public.calendar_feeds` table + RLS owner-only

## Repo touchpoints
- New `app/actions/calendar.ts`
- Dashboard or Focus sidebar UI

---

# S4-US5 — Sync foundation improvements (P1)

## Goals
- Make sync idempotent and resilient:
  - dedupe / update instead of create
  - stable error handling and UX
- Improve UI surfacing (last error details)
- Add safe logging (redaction)

## Implementation tasks
- Add `last_pushed_hash` to mapping tables (optional).
- UI: small status panel with “last run”, “success/error”.
- Ensure failures never crash page (error boundaries already exist).
