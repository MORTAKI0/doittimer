# DoItTimer Sprint 4 - QUALITY (PLAN)

## Quality gates (must pass)
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm test:e2e -- --workers=1 (when E2E_EMAIL/E2E_PASSWORD are set)

## Security gates (Integrations)
- No secrets in:
  - React component props
  - client components
  - console logs
  - error messages returned to client
- Server actions may store secrets in DB (MVP) but must only return safe status fields.

## Idempotency requirements
- Notion Sync now:
  - Second run must not create duplicates
  - Use mapping tables as source of truth
  - Update pages rather than recreate

## Selector stability
- Keep existing text that tests rely on:
  - "Task title"
  - "Add task"
  - aria-label: `Mark ${task.title} as completed`
- Add data-testid for new integration controls and filters.

## Error handling standards
- Map known errors to friendly messages.
- Store last sync error in DB (safe string), show in UI.
- Avoid throwing raw errors that leak internals; log on server with redaction.

## Verify checklist per US
- US1: overrides do not break tasks edit/toggle/delete, focus still starts/stops
- US2: music url does not affect session timestamps
- US3: Notion connect/sync/disconnect works, token not exposed
- US4: iCal fetch failures do not break dashboard/focus
