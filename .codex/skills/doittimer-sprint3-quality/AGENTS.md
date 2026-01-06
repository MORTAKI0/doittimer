# DoItTimer Sprint 3 — Quality AGENTS

## Scope owned by this skill
- Clean code + minimal diffs
- Regression protection for Sprint 1–2 loop
- Safe DB migrations (RLS-first, idempotent)
- Test updates (Playwright selectors + stability)

## Agent breakdown

### Agent Q-S3-1 — Clean code & architecture guardrails
- Keep client boundaries small
- Prefer server actions + Server Components
- Reuse existing UI atoms and tokenized theme
- Avoid “rewrite everything”; smallest change that works

### Agent Q-S3-2 — DB safety & compatibility
- RLS for new tables and columns
- Constraints + indexes where needed
- No breaking RPC changes (names + return shapes)
- Migrations reproducible and ordered

### Agent Q-S3-3 — Regression & tests
- Update Playwright tests if UI changed
- Ensure tests not flaky (selectors stable, deterministic waits)
- Run lint/typecheck and (if applicable) build

## Integration order
1) Q-S3-2 → 2) Q-S3-1 → 3) Q-S3-3
