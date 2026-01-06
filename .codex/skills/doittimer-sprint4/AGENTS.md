# DoItTimer — Codex Agents Guide (Sprint 4)

## What this sprint is
Sprint S4 = Integrations + Advanced Control.
We ship user-controlled MVP integrations without breaking Sprint 1–3 loops.

## Non-negotiables
- Do NOT break existing RPC names or session truth model:
  - DB remains source of truth: started_at / ended_at / duration_seconds.
- Playwright must stay stable:
  - Run E2E with `--workers=1`.
- Avoid changing existing UI text that tests rely on.
- Any new UI selectors must use `data-testid`.

## How to work (per user story)
1) ANALYZE the repo:
   - Identify impacted files.
   - Identify DB migrations / RLS needs.
   - Identify E2E risks.
2) PLAN (no code):
   - Step-by-step plan
   - Files to touch
   - Manual test list + regression checklist
3) IMPLEMENT:
   - Minimal changes
   - Keep types strict
   - Map errors with existing conventions
4) VERIFY:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm test:e2e -- --workers=1` (when env is available)

## Security rules (integrations)
- Never expose secrets (Notion token, calendar feed URL if private) to the client.
- All integration calls must happen in server actions only.
- Redact secrets in logs.
