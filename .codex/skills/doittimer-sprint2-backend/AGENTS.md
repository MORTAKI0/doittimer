# DoItTimer Sprint 2 — Backend AGENTS

## Sprint scope owned by this skill
- S2-US5 Settings MVP (timezone + default task)
- DB reproducibility for dashboard stats RPC

## Agent breakdown

### Agent B1 — Schema + RLS
- Create `public.user_settings`
- Enable RLS
- Add owner-only policies
- Add FK `default_task_id` → `tasks(id)` with `on delete set null`

### Agent B2 — RPC + Timezone correctness
- Implement `get_user_settings` + `upsert_user_settings`
- Update `get_today_sessions()` internals to use user timezone (fallback preserved)

### Agent B3 — Dashboard stats migration
- Add migration for `get_dashboard_today_stats`
- Match return shape expected by `app/actions/dashboard.ts`

## Integration order
1) B1 → 2) B2 → 3) B3
