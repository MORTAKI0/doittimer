# DoItTimer Sprint 4 - QUALITY QUICK START

Use with:
- $doittimer-sprint4
- $doittimer-sprint4-quality

## Verify prompt template
Using $doittimer-sprint4 + $doittimer-sprint4-quality.

Task: VERIFY the repo after implementing S4-USX.
Steps:
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm test:e2e -- --workers=1 (if configured)
Also:
- Ensure no secrets are passed to client components.
- Ensure no existing e2e selectors broke.
Return:
- Commands output summary
- Any regressions found and exact fix suggestions

## Secrets check reminder
- Notion token must stay server-side.
- If you must store tokens in DB for MVP, keep it behind RLS and server actions only.
- Never return token to the UI.
