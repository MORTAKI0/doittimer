---
name: doittimer-sprint4
description: "Sprint 4 skill for DoItTimer (Pomodoro per task + MVP integrations: Notion export, music tagging, optional iCal calendar) with user-controlled sync and no regressions."
---

# DoItTimer - Sprint 4 (Integrations + Advanced Control)

## Sprint identity
- Sprint: S4
- Duration: 2 weeks
- Goal:
  - More control: Pomodoro per task (overrides)
  - Integration foundations: Notion / Calendar / Music
- Reality check:
  - Bi-directional Notion sync + OAuth + background jobs in one sprint is high-risk.
  - S4 delivers MVP integrations: user-controlled, manual "Sync now", one-way first.

## MVP decisions (S4)
- User control first: integrations have Connect / Disconnect / Sync now and show last sync status.
- Notion sync is one-way (app -> Notion) in S4.
- Music is manual URL tagging (no Spotify OAuth).
- Calendar is read-only via iCal URL (no OAuth).
- No background scheduler required (manual actions are enough for MVP).

## Non-negotiable regression constraints
- Sessions DB remains the source of truth for time (started_at/ended_at/duration_seconds).
- Keep Playwright stable (run with --workers=1).
- Avoid changing existing text selectors used by tests.
- Prefer data-testid for new UI controls.

---

# S4-US1 - Pomodoro per Task (overrides)

## User story
As a user, I want optional Pomodoro durations per task, so I can adapt focus to each task.

## Acceptance criteria
- In task edit:
  - Toggle "Use custom Pomodoro"
  - Override fields (nullable):
    - work / short break / long break / long break every
  - "Reset to defaults" clears overrides (null)
- Focus uses:
  - Task overrides when a task is selected and overrides exist
  - Otherwise Settings defaults (S3-US1)
- Validation: same bounds as Settings
- pnpm lint, pnpm typecheck, pnpm build pass
- Playwright stable

## DB (manual SQL - user executes)
Option A (simple): add nullable override columns on tasks (idempotent).
Include optional CHECK constraints that only validate when value is not null.

## Implementation notes
- Extend TaskRow in app/actions/tasks.ts to include override fields (additive).
- Add server action updateTaskPomodoroOverrides(taskId, overrides|null).
- In Focus, compute effective minutes using:
  - task override if not null else settings default

## Manual tests
- Create task with overrides, start focus with that task, verify countdown uses override work minutes.
- Reset overrides, verify focus uses settings defaults.

---

# S4-US2 - Music tagging (manual link)

## User story
As a user, I want to attach a music/playlist link to a focus session.

## Acceptance criteria
- Optional music URL input (can be empty)
- Saved on the work session
- Displayed in today's sessions list as a clickable link
- No OAuth
- No regressions in start/stop

## DB (manual SQL - user executes)
- Add sessions.music_url text null (optional length constraint)

## Implementation notes
- Prefer a separate update action after start_session to avoid RPC signature churn.
- Ensure updates do not alter started_at/ended_at.

## Manual tests
- Start session -> set music link -> stop -> verify link appears.

---

# S4-US3 - Notion integration (one-way export + Sync now)

## User story
As a user, I want to connect Notion and sync my Projects/Tasks into a Notion database.

## Subscription note (practical)
- Notion has a Free plan and official docs describe creating internal integrations and using the API without stating a paid requirement. Treat this as available on Free unless your workspace restrictions say otherwise. References: Notion Help + Dev docs + Pricing. 

## Acceptance criteria (MVP)
- Settings -> Integrations -> Notion:
  - Inputs: notion token, notion database id
  - Actions: Connect, Disconnect, Sync now
  - Show: last sync time + status + last error
- One-way sync: App -> Notion
- Idempotent:
  - If already exported, update same Notion page (no duplicates)
- Token never sent to client (server actions only)

## DB (manual SQL - user executes)
Tables (with RLS owner-only):
- notion_connections (unique by user)
- notion_task_map (task_id -> notion_page_id)
- notion_project_map (project_id -> notion_page_id)
Also store last_synced_at, last_status, last_error on connection.

## Sync algorithm (MVP)
- Load projects/tasks from DB
- For each project/task:
  - If mapping exists -> update page
  - Else -> create page, store mapping
- Update last sync status and timestamps
- Use batching and clear errors; do not spam logs with secrets.

## Manual tests
- Connect -> Sync now -> verify created pages
- Sync again -> verify no duplicates
- Disconnect -> verify token removed and UI resets.

---

# S4-US4 - Calendar read-only via iCal URL (P1)

## User story
As a user, I want to see today's calendar events inside the app.

## Acceptance criteria
- User can add an iCal feed URL (read-only)
- Manual Refresh
- Show today's events (respect timezone)
- Handle invalid URL gracefully

## DB (manual SQL - user executes)
- calendar_feeds table with RLS owner-only

## Manual tests
- Add feed URL -> refresh -> events show
- Invalid feed -> error shown, app still works

---

# S4-US5 - Sync foundation improvements (P1)

## Goals
- Improve idempotency and reliability of sync actions.
- Better error surfacing in UI.
- Safe logging (redact tokens/urls if sensitive).

## Done checklist (DoD)
- Migrations added and idempotent (if not exists, create or replace).
- RLS policies correct (owner-only).
- Validations + errors handled (no token leaks).
- pnpm lint + pnpm typecheck + pnpm build pass.
- Playwright suite passes (--workers=1) when configured.
- Manual checklist executed for each implemented US.
