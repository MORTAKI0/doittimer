# Sprint 3 — Quality Plan (Clean code + Regression)

## Rules (non-negotiable)
- Minimal changes: small diffs, localized edits
- No breaking API/RPC changes
- Keep existing UX stable unless story requires change
- Every DB change must be RLS-safe and reproducible via migrations

## Quality gates (every PR / every US)
1) pnpm lint
2) pnpm typecheck
3) Manual smoke:
   - Login
   - Tasks: create/edit/toggle/delete
   - Focus: start/stop session
   - Dashboard: stats render
   - Settings: save works

## Regression checklist (post-sprint)
- “Core loop” still works end-to-end
- Existing Playwright smoke tests pass (update selectors only when required)
- No new production deps without approval
- No secrets in repo
