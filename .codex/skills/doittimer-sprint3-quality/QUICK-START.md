# Quick Start — Sprint 3 Quality

## Before coding
- Confirm baseline:
  - pnpm lint
  - pnpm typecheck

## During coding (per US)
- Prefer stable selectors for E2E (data-testid if needed)
- Avoid time-based sleeps; wait for UI conditions
- Keep server actions typed + Zod validated

## After coding
- pnpm lint
- pnpm typecheck
- (Optional but recommended) pnpm build
- Run Playwright if present:
  - pnpm test:e2e (or npx playwright test)

## DB quality checks
- RLS enabled on new tables
- Owner-only policies tested
- `on delete set null` for FKs that must not break existing rows
