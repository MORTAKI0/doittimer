# DoItTimer Sprint 4 - QUALITY (AGENTS)

## What this quality skill protects
- Sprint 1-3 behavior must remain stable.
- Secrets must never leak to the client.
- Sync must be idempotent and safe to retry.
- Playwright should remain stable (run with --workers=1).

## Agents

### Agent Q1 - Regression Guardian
- Keep existing selectors stable (text + aria-labels used by e2e).
- Add data-testid for new UI instead of changing existing labels.
- Ensure Tasks/Focus/Dashboard flows still work end-to-end.

### Agent Q2 - Security + Secrets (Integrations)
- Token/database id are server-only.
- No token in client props, no token in logs.
- DB tables storing tokens are RLS-protected and read/write only via server actions.

### Agent Q3 - Sync Reliability
- "Sync now" must be retry-safe (idempotent).
- Mapping tables prevent duplicates.
- Clear user-facing errors with last status and last error.

### Agent Q4 - DX + Clean Code
- Small diffs, no broad refactors.
- Strong typing + zod validation.
- Keep shared action patterns consistent (success/error shapes).
