---
name: doittimer-sprint4-quality
description: Quality skill for Sprint 4. Prevent regressions, keep e2e stable, enforce server-only secrets, and ensure sync is idempotent and retry-safe.
---

# DoItTimer - Sprint 4 Quality Guardrails

## Why this skill exists
Sprint 4 adds integration surfaces that can easily introduce regressions (selectors, async sync flows, secrets). This skill forces safe patterns.

## Hard rules
1) No secrets in client:
- Notion token and database id must never be passed to client components.
- No secret values in logs.
2) No breaking e2e:
- Keep existing labels/aria-labels stable.
- Add data-testid for new controls.
3) No background jobs required:
- MVP uses manual "Sync now" buttons.
4) Idempotency by design:
- Sync can be retried without duplicates.

## Notion references
- Notion docs describe creating internal integrations and using the API.
- Notion pricing includes a Free plan.
These official sources do not state API usage requires a paid plan.
(Use workspace permissions and limits as the practical constraint.) 

## Code quality checklist
- Types are additive; do not break existing TaskRow/session types.
- Zod validation for all user inputs.
- Server actions return consistent result shapes.
- Minimal diffs; avoid refactors unrelated to the US.

## Verification checklist
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm test:e2e -- --workers=1
- Manual smoke:
  - Tasks: create/edit/toggle/delete
  - Focus: start/stop, prevent 2 active sessions
  - Dashboard: session updates stats
