# DoItTimer Sprint 3 — Pomodoro + Projects — AGENTS

## Sprint scope owned by this skill
- S3-US1 Pomodoro preferences (Settings)
- S3-US2 Focus: New Pomodoro + optional Task (or no task)
- S3-US3 Projects: CRUD minimal (create/list/rename/archive)
- S3-US4 Tasks under Project (project_id nullable) + UI selector
- S3-US5 Filters & sort by Project (P1)

## Agent breakdown

### Agent S3-A1 — Settings + DB/RPC extensions
- Add pomodoro fields to `public.user_settings`
- Extend RPCs: `get_user_settings`, `upsert_user_settings` (keep names stable)
- Update `app/actions/settings.ts` + SettingsForm UI
- Ensure validations + RLS remain correct

### Agent S3-A2 — Focus Pomodoro UX
- Implement “New Pomodoro” flow on `/focus`
- Optional task selection (pick existing task or “No task”)
- Work countdown computed from session start time + settings
- Auto-stop session when work reaches 0 (guard against double-stop)
- Break is UI-only (no DB sessions for breaks)

### Agent S3-A3 — Projects + Tasks integration
- Create `public.projects` table + RLS
- Add `project_id` nullable FK on `public.tasks`
- Server actions in `app/actions/projects.ts`
- Update Tasks UI to select project on create/edit, show project badge

### Agent S3-A4 — Filters & polish (P1)
- Add Tasks filter: All / No project / Project X
- Minimal sorting improvements
- Keep UI consistent with existing atoms + tokenized theme

## Integration order (safe)
1) S3-A1 → 2) S3-A3 → 3) S3-A2 → 4) S3-A4
