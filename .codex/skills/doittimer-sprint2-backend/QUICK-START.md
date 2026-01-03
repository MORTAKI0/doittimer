# Quick Start — Sprint 2 Backend

## What to validate after implementing DB changes
- User can read settings (default returned)
- User can upsert timezone + default task
- `get_today_sessions()` respects timezone (boundary shift)
- Dashboard stats RPC exists in migrations and returns expected fields
- RLS: User A cannot access User B settings

## Compatibility constraints
- Keep RPC names unchanged:
  - `get_active_session()`, `get_today_sessions()`, `start_session()`, `stop_session()`, `get_dashboard_today_stats()`
- Keep return shapes stable for existing server actions
