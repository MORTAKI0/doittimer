This document defines **4 small user stories** to improve Pomodoro in DoItTimer. It is written to keep scope controlled, preserve existing behavior, and follow clean-code, quality, and security practices.

**Goals**

- Add real Pomodoro cycle behavior while keeping the existing *focus sessions* model.
- Keep the changes **backward-compatible** (no breaking schema changes, no breaking UI flows).
- Maintain **RLS-first security** and server-only secrets.
- Keep code maintainable: small modules, clear responsibilities, good tests.

**Non-goals (for these stories)**

- Background/cron sync or notifications.
- Complex conflict UIs.
- Mobile native integrations.

---

## Current Baseline (what we already have)

- `sessions` table with: `started_at`, `ended_at`, `duration_seconds`, `task_id`, `music_url`, plus **one active session per user**.
- `user_settings` stores timezone, default_task_id, and pomodoro defaults.
- `tasks` support **per-task pomodoro overrides**.
- Focus UI shows a timer and “effective pomodoro settings” based on overrides → settings.

The additions below must **not** break:

- `start_session()` / `stop_session()` RPC behavior
- session uniqueness constraints
- dashboard “today” RPCs
- Notion integration

---

# Story 1 — Pomodoro Cycle Engine (Work → Break → Long Break)

## User Story

**As a user**, when I start focusing, I want the timer to automatically progress through **Work / Short Break / Long Break** so I don’t manage it manually.

## UX Requirements

- Focus view shows **Current phase**: `Work` / `Short Break` / `Long Break`.
- When a phase ends, the UI:
    - automatically transitions to the next phase
    - shows a subtle toast (e.g., “Break started”)
- Controls:
    - **Pause / Resume**
    - **Skip phase**
    - **Restart phase**
- Refresh-safe: phase state persists after reload.

## Data Model (backward-compatible)

Add nullable columns to `sessions` (safe default behavior when null):

- `pomodoro_phase text null` — enum-like values: `work`, `short_break`, `long_break`
- `pomodoro_phase_started_at timestamptz null`
- `pomodoro_is_paused boolean not null default false`
- `pomodoro_paused_at timestamptz null`
- `pomodoro_cycle_count int not null default 0` — count completed **work** phases in this session

**Compatibility rule**

- If `pomodoro_phase` is NULL, the focus page behaves exactly as today (simple elapsed timer).

## Server Responsibilities

Create a small set of RPCs or server actions that:

- `pomodoro_init(session_id)` sets phase to `work` and sets `pomodoro_phase_started_at=now()` if null.
- `pomodoro_pause(session_id)` / `pomodoro_resume(session_id)` updates pause fields.
- `pomodoro_skip_phase(session_id)` transitions to next phase.
- `pomodoro_restart_phase(session_id)` sets `pomodoro_phase_started_at=now()`.

**Transition logic**

- Work ends → break begins
- After each completed work phase: increment `pomodoro_cycle_count`
- If `pomodoro_cycle_count % longEvery == 0` then next break is `long_break`, else `short_break`
- Break ends → next is always `work`

## Client Responsibilities

- The client should compute “time remaining” as:
    - `remaining = phaseDurationSeconds - (now - pomodoro_phase_started_at - pausedDuration)`
- Client must not “fake” transitions locally; it should call server action/RPC for state changes.

## Security & Integrity

- All writes must use RLS-protected updates where `user_id = auth.uid()`.
- Never trust client-sent durations; server sets timestamps.
- Validate `session_id` is owned by the user and active.

## Testing

### Unit tests

- Phase transition table test (work→short, work→long, break→work)
- Pause/resume time accounting

### E2E tests (Playwright)

- Start focus session → init pomodoro → shows Work.
- Fast-forward in test (mock time) → auto transition occurs.
- Pause prevents transitions until resume.

## Rollout Plan

- Behind a feature flag `pomodoro_v2_enabled` in `user_settings` (boolean default false).
- Enable for your user first; then for all users.

---

# Story 2 — Pomodoro Completion Stats (Plan vs Reality)

## User Story

**As a user**, I want to see how many **work pomodoros** I completed today (and per task) so I can track progress.

## UX Requirements

- Dashboard shows:
    - `Work pomodoros completed today`
    - `Top tasks today` by pomodoros (max 5)
- Task details show:
    - `Pomodoros today` and `Pomodoros total`

## Data Model Options

### Preferred (accurate)

Add `session_pomodoro_events` table:

- `id uuid pk`
- `user_id uuid`
- `session_id uuid`
- `task_id uuid null`
- `event_type text` (`work_completed`, `break_started`, etc.) — minimal: just `work_completed`
- `occurred_at timestamptz default now()`

**Why:** Accurate counts and future-proof.

### Minimal (no new table)

Store only `pomodoro_cycle_count` on sessions and compute daily counts by session start date.

**Tradeoff:** Harder to report “when” each pomodoro happened, and timezone splits can be tricky.

## Server Logic

- On each completed work phase transition, write an event `work_completed`.
- New RPC: `get_dashboard_pomodoro_stats()` timezone-aware:
    - total work_completed today
    - top tasks

## Security

- RLS owner-only.
- Aggregations must filter by user_id.

## Testing

- SQL/RPC test: counts match inserted events.
- E2E: complete 2 work cycles → dashboard shows 2.

---

# Story 3 — Pomodoro Presets (Quick Apply)

## User Story

**As a user**, I want to apply a preset (Deep Work, Classic, Sprint) to a task so I don’t manually set overrides.

## UX Requirements

- On task edit UI, show presets:
    - **Classic:** 25/5, long 15, longEvery 4
    - **Deep Work:** 50/10, long 20, longEvery 2
    - **Sprint:** 15/3, long 10, longEvery 4
- Clicking a preset:
    - fills override fields
    - saves immediately (or requires explicit Save if you already have that pattern)

## Implementation

- No DB changes.
- Create `lib/pomodoro/presets.ts` exporting typed presets.
- Reuse existing validation.

## Quality

- Ensure preset application only updates override columns (no unrelated fields).
- Keep UI accessible: keyboard navigable buttons.

## Testing

- Unit: preset values map correctly to override payload.
- E2E: apply preset → focus page shows new effective settings.

---

# Story 4 — Focus Queue (Next Tasks)

## User Story

**As a user**, I want a small queue of tasks for today so when a pomodoro ends I can pick the next task fast.

## UX Requirements

- Tasks page: “Today queue” section with add/remove.
- Focus page: shows “Next up” with one-tap switch.
- Reorder with Up/Down buttons (drag later).

## Data Model

Add table `task_queue_items`:

- `user_id uuid`
- `task_id uuid`
- `sort_order int`
- `created_at timestamptz default now()`
- PK: `(user_id, task_id)`

RLS: owner-only.

## Server Logic

- Actions: add, remove, move_up, move_down, list.
- Enforce max items (e.g., 7) server-side.

## Testing

- Unit: reorder logic.
- E2E: add tasks → focus shows next up → reorder updates display.

---

# Engineering Guidelines (Clean Code + Quality + Security)

## Design Principles

- **Single responsibility:**
    - `lib/pomodoro/*` for pure logic
    - `app/actions/pomodoro.ts` for server orchestration
    - UI components only render + call actions
- **Backwards compatibility:**
    - new columns default to null / safe values
    - old focus session flow still works
- **Feature flag:** new behavior gated by `user_settings.pomodoro_v2_enabled`

## Validation & Safety

- Always validate:
    - session ownership (`user_id`)
    - session active state (`ended_at is null`) before pomodoro updates
- Never accept client-provided timestamps.
- Avoid logging sensitive user content; never log tokens.

## Performance

- Keep Notion sync unaffected.
- Use pagination and small concurrency limits as currently.
- For pomodoro updates, use small single-row updates.

## Observability

- Extend `logServerError` contexts for pomodoro actions:
    - action name, session_id, phase
- Store sanitized errors in UI.

---

# Suggested Delivery Plan (low risk)

1. Add feature flag + DB columns for Story 1.
2. Implement phase engine with minimal UI.
3. Add events table + dashboard stats (Story 2).
4. Add presets (Story 3) — quick win.
5. Add queue (Story 4) — polish.

---

# Acceptance Checklist (Definition of Done)

- ✅ No existing E2E tests break.
- ✅ New E2E tests added for pomodoro v2.
- ✅ RLS policies added for new tables/columns.
- ✅ Feature flag default off.
- ✅ No secrets in logs.
- ✅ Type-safe shared pomodoro logic (pure functions tested).
