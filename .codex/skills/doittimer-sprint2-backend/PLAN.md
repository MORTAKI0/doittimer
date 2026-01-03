# Sprint 2 Backend — Execution Plan (Settings + Database)

## Phase 1 (Day 1—2): Add user settings table
1) Migration: create `public.user_settings`
2) RLS enablement + owner-only policies
3) FK default task with `on delete set null`

## Phase 2 (Day 2—3): Settings RPC
1) Add `get_user_settings()`
2) Add `upsert_user_settings(p_timezone, p_default_task_id)`

## Phase 3 (Day 3—4): Timezone correctness
1) Update `get_today_sessions()` internals:
   - read timezone from settings
   - fallback to 'Africa/Casablanca' if missing

## Phase 4 (Day 4): Reproducibility for dashboard stats
1) Add migration for `get_dashboard_today_stats`
2) Make it timezone-aware
3) Match the expected return type in app code

## Exit criteria
- Settings exist and are user-scoped
- Today computations are timezone-correct
- Dashboard RPC is versioned and reproducible
- No RPC name changes
