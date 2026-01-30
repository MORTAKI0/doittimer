# Sprint 2026-02 ExecPlan
Spec: sprint/2026-02/SPEC.md

Source spec: "Pomodoro Improvements � Implementation Spec (4 Small User Stories)"
Status: READY (spec linked; migration workflow confirmed; feature flag column pending).

## Scope
- Story 1: Pomodoro Cycle Engine (Work/Short/Long)
- Story 2: Completion Stats (events table preferred; minimal alternative noted)
- Story 3: Presets
- Story 4: Focus Queue

## Non-goals
- Any work outside the four stories in the spec
- Breaking changes to existing data or APIs
- Notion or other integration changes

## Dependency tracker (status: BLOCKED | READY | DONE)
| Dependency | Status | Owner | Notes |
| --- | --- | --- | --- |
| Spec details for Stories 1-4 | READY | TBD | Linked in sprint/2026-02/SPEC.md |
| Feature flag: user_settings.pomodoro_v2_enabled (default false) | BLOCKED | TBD | Not deployed on Supabase yet; will add via separate migration before enabling flag-gated UI |
| Migration/tooling commands confirmed | READY | TBD | Manual SQL apply per README; no Supabase CLI config in repo |

## Feature flag plan
- Add or reuse user_settings.pomodoro_v2_enabled with default false.
- All new behavior gated behind the flag.
- Rollout: enable for @ega first, then widen.

## DB plan (backward compatible only)
- Additive changes only (nullable columns or new tables).
- Prefer events table for completion stats; document minimal alternative from spec if used.
- All new tables must include user_id and RLS policies.
- Migrations must be reversible with minimal risk.

## DB Workflow
Status: CONFIRMED (manual SQL apply; no Supabase CLI config in repo).
Workflow:
- Apply SQL files in `supabase/migrations` to your Supabase project in filename order.
- Use the Supabase Dashboard SQL editor (repo has no `supabase/config.toml` or CLI scripts).
- Create new migrations as timestamped SQL files in `supabase/migrations` following existing naming pattern.
Current-state mirror:
- `20260129_s2026_02_story1_pomodoro_v2.sql` mirrors live Supabase state:
  - sessions: add pomodoro_* columns (phase, phase_started_at, is_paused, paused_at, cycle_count)
  - function: `get_active_session_v2()`
  - function: `upsert_user_settings(p_timezone, p_default_task_id, p_pomodoro_work_minutes, p_pomodoro_short_break_minutes, p_pomodoro_long_break_minutes, p_pomodoro_long_break_every)`
Note: This migration mirrors current prod Supabase state; it does NOT include pomodoro_v2_enabled or pomodoro RPCs yet.
Next migration needed (added for Milestone 1/2):
- `20260130_s2026_02_story1_pomodoro_v2_enable_and_rpcs.sql` (flag + constraints + pomodoro RPC skeletons)
- `20260131_s2026_02_story1_pomodoro_phase_engine.sql` (phase engine behavior)
Manual apply steps:
1) Open Supabase Dashboard -> SQL Editor for the project.
2) Paste the full contents of `supabase/migrations/20260129_s2026_02_story1_pomodoro_v2.sql`.
3) Run the query and confirm success in the SQL editor output.
4) Paste the full contents of `supabase/migrations/20260130_s2026_02_story1_pomodoro_v2_enable_and_rpcs.sql`.
5) Run the query and confirm success in the SQL editor output.
6) Paste the full contents of `supabase/migrations/20260131_s2026_02_story1_pomodoro_phase_engine.sql`.
7) Run the query and confirm success in the SQL editor output.
8) Record the apply time in your migration log.

## RLS-first security plan
- Define RLS policies before exposing any data access.
- Owner-only policies for all new tables.
- Validate active session ownership for any write.
- Server timestamps only (no client-supplied timestamps).

## Testing plan
- Unit tests for core logic and RPCs.
- Playwright E2E coverage for each story flow.
- Manual smoke for edge cases called out in spec.

## Verification commands
- pnpm lint
- pnpm typecheck
- pnpm test:e2e
  - Prereqs: `E2E_EMAIL` and `E2E_PASSWORD` set; app running or `PLAYWRIGHT_BASE_URL` set
- pnpm test:e2e:ui
  - Prereqs: `E2E_EMAIL` and `E2E_PASSWORD` set; app running or `PLAYWRIGHT_BASE_URL` set

## Milestones (sequenced)
### Milestone 0: Repo/tooling discovery + flag plumbing
- Confirm test/lint/typecheck commands and migration workflow.
- Verify feature flag path and default behavior.
- Update dependency tracker statuses.
- Exit criteria: commands confirmed, flag path known, spec details linked.

### Milestone 1: Story 1 DB columns + RPC skeleton + minimal UI wiring behind flag
- Add required schema changes for cycle engine (per spec).
- Create RPC or server actions skeletons.
- Wire minimal UI behind feature flag.
- Exit criteria: schema in place, flag gating works, no regressions.

### Milestone 2: Story 1 full phase engine behavior + pause/skip/restart + refresh-safe
- Implement full cycle logic per spec.
- Ensure pause/skip/restart behavior per spec.
- Ensure refresh-safe resume behavior.
- Exit criteria: unit tests for engine logic pass, E2E happy path passes.

### Milestone 3: Story 2 events table + stats RPC + dashboard UI
- Implement completion events table (preferred) with RLS.
- Add stats RPC or query path.
- Wire stats to UI surfaces per spec.
- Exit criteria: stats correct, UI displays, tests pass.

### Milestone 4: Story 3 presets (lib + UI) + tests
- Add presets storage and UI flows per spec.
- Ensure apply preset behavior per spec.
- Exit criteria: preset create/apply flows pass, tests pass.

### Milestone 5: Story 4 focus queue table + RPCs + UI + tests
- Add queue storage and operations per spec.
- Wire queue interactions to UI.
- Exit criteria: queue behavior correct, tests pass.

### Milestone 6: Hardening, docs, rollout widening
- Run full verification commands.
- Update user-facing docs if any.
- Stage rollout: enable for @ega, then broaden.
- Exit criteria: all checks green, rollout staged.

## Story-by-story AC -> tasks mapping
### Story 1: Pomodoro Cycle Engine
| Acceptance Criteria | Tasks |
| --- | --- |
| Phase label, auto transitions with toast; compatibility when phase is null | Add session columns; phase engine logic; UI phase label + toast; tests |
| Pause/resume/skip/restart controls; refresh-safe state | Add RPC/actions; wire controls; unit + E2E coverage |

AC checklist
- [ ] Focus view shows current phase (Work/Short/Long) and auto transitions with toast
- [ ] Pause/Resume, Skip, Restart controls work and are consistent with phase state
- [ ] Refresh-safe persistence of phase state and remaining time
- [ ] Compatibility: when pomodoro_phase is NULL, focus behaves exactly as today
- [ ] Server-only timestamps, ownership checks, and RLS-protected updates

Task breakdown
- DB: add nullable session columns (`pomodoro_phase`, `pomodoro_phase_started_at`, `pomodoro_is_paused`, `pomodoro_paused_at`, `pomodoro_cycle_count`)
- Server: RPC/actions for init/pause/resume/skip/restart; transition logic; validate active session ownership
- Client: phase label, toast, control buttons, time-remaining computation; no local state faking
- Tests: unit transition table + pause accounting; Playwright phase transitions and pause behavior

Risks + rollout notes
- Feature flag `pomodoro_v2_enabled` default off; gate all new behavior
- Backward-compatible schema: nullable columns; no change to existing focus flow when null
- RLS-first and owner-only updates for any new writes
- Server timestamps only; ignore client-supplied durations/timestamps

### Story 2: Completion Stats
| Acceptance Criteria | Tasks |
| --- | --- |
| Dashboard shows work pomodoros today + top tasks (max 5) | Add timezone-aware stats RPC + dashboard UI |
| Task details show pomodoros today and total | Extend task detail queries/UI to show counts |
| Work completion recorded (events table preferred; minimal alternative documented) | Add events table + RLS and write `work_completed` on transitions |

AC checklist
- [ ] Dashboard shows work pomodoros completed today and top tasks (max 5)
- [ ] Task detail shows pomodoros today and total
- [ ] Work completion events recorded on each completed work phase (preferred table)
- [ ] Timezone-aware stats via RPC (`get_dashboard_pomodoro_stats`)
- [ ] Owner-only access for events and aggregates

Task breakdown
- DB: add `session_pomodoro_events` table + RLS (preferred) or document minimal alternative
- Server: write `work_completed` event on transition; stats RPC with timezone handling
- Client: dashboard widgets + task detail display
- Tests: SQL/RPC count tests; Playwright completes cycles and verifies dashboard

Risks + rollout notes
- Feature flag `pomodoro_v2_enabled` default off; dashboard stats behind flag
- Backward-compatible: no breaking changes to existing session flow or dashboards
- RLS-first for events table and aggregation queries
- Server timestamps only for events; avoid client-provided times

### Story 3: Presets
| Acceptance Criteria | Tasks |
| --- | --- |
| Presets (Classic/Deep Work/Sprint) visible on task edit and apply overrides | Add presets module; wire task edit UI to apply values |
| Preset apply matches save behavior and remains accessible | Ensure save flow consistency; keyboard-navigable buttons; tests |

AC checklist
- [ ] Task edit shows Classic, Deep Work, Sprint with correct values
- [ ] Clicking a preset fills override fields and persists per existing save pattern
- [ ] Accessible keyboard navigation for preset actions
- [ ] Focus page reflects updated effective settings after preset apply

Task breakdown
- DB: none
- Server: reuse existing validation/actions for task override updates
- Client: presets UI and apply behavior on task edit
- Tests: unit mapping of preset values; Playwright apply preset and verify focus settings

Risks + rollout notes
- Feature flag `pomodoro_v2_enabled` default off if presets are v2-only UI
- Backward-compatible: no schema changes; only override fields updated
- RLS-first for task updates via existing policies
- Server timestamps only (no new time fields introduced)

### Story 4: Focus Queue
| Acceptance Criteria | Tasks |
| --- | --- |
| Today queue add/remove + Next up on focus | Add queue table/actions; tasks/focus UI sections |
| Reorder up/down + max items enforced server-side | Implement reorder logic; enforce max (e.g., 7); tests |

AC checklist
- [ ] Tasks page “Today queue” add/remove works
- [ ] Focus page shows “Next up” with one-tap switch
- [ ] Reorder via Up/Down buttons (no drag)
- [ ] Max items enforced on server
- [ ] Owner-only RLS for queue table

Task breakdown
- DB: add `task_queue_items` table with PK `(user_id, task_id)` and RLS
- Server: add/remove/move_up/move_down/list actions; enforce max items
- Client: tasks page queue section; focus “Next up” + reorder controls
- Tests: unit reorder logic; Playwright queue add/reorder/switch

Risks + rollout notes
- Feature flag `pomodoro_v2_enabled` default off if queue is v2-only
- Backward-compatible: additive table only; existing flows unchanged
- RLS-first for queue table and mutations
- Server timestamps only for created_at

## Failure protocol
Stop -> capture evidence -> revert smallest unit -> update plan -> re-approve if material.

## Skills to invoke
- sprint-2026-02
- pomodoro-v2-spec
- db-rls-check
- codex-review-gate

## Update cadence
- After each story completion
- End of day summary
- On blocker
- On scope change
- On failed verification
- After each milestone

## Approval
APPROVED: @ega — 2026-01-29
## Progress log
| Date | Update |
| --- | --- |
| 2026-01-29 | ExecPlan created; pending spec details |
| 2026-01-29 | Milestone 0: verified "SPEC REQUIRED" still present (blocker pending spec details). Added DB Workflow discovery checklist. Ran `pnpm lint` and `pnpm typecheck` (both OK). |
| 2026-01-29 | Milestone 0: ran `pnpm lint` and `pnpm typecheck` (both OK). Confirmed manual SQL apply workflow (README; no `supabase/config.toml`). Blocker: `user_settings.pomodoro_v2_enabled` not present; needs migration. |
| 2026-01-29 | Milestone 1: added pomodoro v2 migration + RPC skeletons, server actions, and focus UI wiring behind flag. Updated settings/user session types and focus/settings pages. Commands: `pnpm lint` OK, `pnpm typecheck` OK. Files: `supabase/migrations/20260129_s2026_02_story1_pomodoro_v2.sql`, `app/actions/pomodoro.ts`, `app/actions/sessions.ts`, `app/actions/settings.ts`, `app/(app)/focus/FocusPanel.tsx`, `app/(app)/focus/page.tsx`, `app/(app)/settings/page.tsx`, `sprint/2026-02/EXECPLAN.md`. |
| 2026-01-29 | Milestone 1: verified RPC usages (get_user_settings/upsert_user_settings/get_active_session) and updated migration to keep return shapes additive while adding pomodoro_v2_enabled. Added upsert_user_settings v2 overload (with default) to avoid breaking existing parameters. Commands: `pnpm lint` OK, `pnpm typecheck` OK. Files: `supabase/migrations/20260129_s2026_02_story1_pomodoro_v2.sql`, `sprint/2026-02/EXECPLAN.md`. |
| 2026-01-29 | Milestone 1: per request, moved new settings return shape to `get_user_settings_v2()` to avoid touching existing `get_user_settings`. Updated migration only. |
| 2026-01-29 | Milestone 1: fixed migration for 42P13 by keeping `get_user_settings()` untouched, adding `get_user_settings_v2()`, and adding `upsert_user_settings` overloads with a v1 wrapper. Removed explicit `updated_at` assignment. Updated DB workflow note. |
| 2026-01-29 | Milestone 1: synced migration to current Supabase state; removed pomodoro_v2_enabled flag changes, sessions CHECK constraints, get_user_settings_v2(), pomodoro_* RPCs, and extra upsert overloads. Migration now only adds sessions pomodoro columns and defines get_active_session_v2() + 6-arg upsert_user_settings(). Updated DB workflow and dependency tracker. |
| 2026-01-29 | Milestone 1: added `20260130_s2026_02_story1_pomodoro_v2_enable_and_rpcs.sql` for pomodoro_v2_enabled flag, sessions CHECK constraints, and pomodoro RPC skeletons. Updated DB workflow to apply migrations in order. |
| 2026-01-29 | Milestone 2: implemented phase engine (DB RPC updates) + client auto-transition/timer/paused handling + toast, added unit tests and E2E spec (flag-gated). Updated settings fetch to read pomodoro_v2_enabled and sessions RPC to v2. Added migration `20260131_s2026_02_story1_pomodoro_phase_engine.sql` and DB workflow updates. Commands: `pnpm lint` OK, `pnpm typecheck` OK, `pnpm test:e2e` failed (missing E2E_EMAIL/E2E_PASSWORD). Files: `supabase/migrations/20260131_s2026_02_story1_pomodoro_phase_engine.sql`, `lib/pomodoro/phaseEngine.ts`, `tests/unit/pomodoro-phase-engine.test.ts`, `tests/e2e/pomodoro.spec.ts`, `app/actions/settings.ts`, `app/actions/sessions.ts`, `app/(app)/focus/FocusPanel.tsx`, `sprint/2026-02/EXECPLAN.md`. |
| 2026-01-29 | Milestone 2: fixed Playwright strict mode locator in pomodoro E2E by asserting exact "Work" phase badge text. Suggested: `pnpm exec playwright test tests/e2e/pomodoro.spec.ts --workers=1` (expect pass with E2E_POMODORO_V2=1 and creds). Files: `tests/e2e/pomodoro.spec.ts`, `sprint/2026-02/EXECPLAN.md`. |
| 2026-01-30 | Milestone 3 (Story 2): added `session_pomodoro_events` table + RLS + stats RPCs and idempotent event insert in `pomodoro_skip_phase`; wired dashboard + tasks pomodoro stats; added pomodoro stats E2E. Files: `supabase/migrations/20260202_s2026_02_story2_pomodoro_stats.sql`, `app/actions/dashboard.ts`, `app/actions/tasks.ts`, `app/(app)/dashboard/page.tsx`, `app/(app)/tasks/page.tsx`, `app/(app)/tasks/components/TaskList.tsx`, `tests/e2e/pomodoro.spec.ts`, `sprint/2026-02/EXECPLAN.md`. |
| 2026-01-30 | Milestone 4 (Story 3): added pomodoro presets module + task edit quick-apply UI + unit test + E2E preset flow. Tests: `node --test tests/unit` failed (EPERM spawn); `pnpm test:e2e -- tests/e2e/pomodoro.spec.ts --workers=1` failed (missing `E2E_EMAIL`/`E2E_PASSWORD`). Files: `lib/pomodoro/presets.ts`, `app/(app)/tasks/components/TaskList.tsx`, `tests/unit/pomodoro-presets.test.ts`, `tests/e2e/pomodoro.spec.ts`, `sprint/2026-02/EXECPLAN.md`. |
