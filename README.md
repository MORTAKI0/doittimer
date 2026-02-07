# DoItTimer

DoItTimer is a Next.js App Router app for planning tasks, running focus sessions,
and viewing simple daily stats. It uses Supabase for auth and data, with
server-first pages and server actions for mutations.

## Features
- Public marketing home page and offline fallback.
- Email/password auth with Supabase; protected app routes.
- Tasks: create, edit, toggle complete, delete.
- Focus sessions: start/stop with a single active session guard and optional task link.
- Dashboard: today's focus time, sessions count, tasks completed/total.
- Settings: timezone + default task, theme toggle stored in cookies.
- Optional service worker + web app manifest.

## Tech stack
- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4
- Supabase (auth + Postgres + RPC)
- Playwright e2e tests

## Project structure
- `app/(public)` marketing + offline
- `app/(auth)` login/signup
- `app/(app)` dashboard, tasks, focus, settings (auth gated)
- `app/actions` server actions for auth, tasks, sessions, settings
- `components/ui` shared UI primitives
- `lib` env validation, Supabase clients, validation, logging
- `supabase/migrations` SQL schema and RPCs
- `tests/e2e` Playwright specs

## Getting started
Requirements:
- Node 24.x
- pnpm 10.x

Install:
```bash
pnpm install
```

Env (create `.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Optional env:
- `NEXT_PUBLIC_SITE_URL` (defaults to http://localhost:3000 for metadata)
- `NEXT_PUBLIC_ENABLE_SW=1` (register service worker in dev)
- `SETTINGS_RPC_DIAG_TIMEOUT_MS` (diagnostic timeout for settings RPC)
- `PLAYWRIGHT_BASE_URL` (for Playwright, defaults to http://localhost:3000)
- `E2E_EMAIL`, `E2E_PASSWORD` (required for Playwright auth)

Database:
- Apply SQL in `supabase/migrations` to your Supabase project (tables + RPCs).

Run:
```bash
pnpm dev
```

## Production run (clean build)
Always rebuild before `pnpm start` after code changes:
```bash
# PowerShell
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
pnpm build
pnpm start
```

If you previously enabled the service worker and see stale client behavior (for example Server Action mismatch), clear service workers + cache once in browser DevTools Console:
```js
await navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister())));
await caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
location.reload();
```

## Import API smoke test
The importer supports **merge mode only** with `.xlsx` and `.zip` (Schema v1):
```bash
# PowerShell
curl.exe -i -X POST "http://localhost:3000/api/data/import" `
  -F "mode=merge" `
  -F "file=@C:\path\to\doittimer-export.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

Expected error shape:
```json
{ "success": false, "code": "some_code", "message": "Some message", "details": {} }
```

## Scripts
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format`
- `pnpm test:e2e`
- `pnpm test:e2e:ui`
