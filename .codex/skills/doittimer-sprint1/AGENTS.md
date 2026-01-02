# DoItTimer Sprint 1 - AGENTS Context File

## Sprint Identity
Sprint: S1 - Core MVP Loop (Tasks + Focus Sessions + Dashboard)
Duration: January 5-16, 2026 (2 weeks)
Team: Abdelhak (Product Owner / Full-Stack Engineer)
Capacity: 72 net hours
Target Velocity: 20 story points

## Sprint Goal
Deliver the first complete "daily focus loop" for authenticated users: they can create and manage tasks, start and stop focus sessions (optionally linked to a task), and see simple daily totals on the dashboard. This sprint transforms the authenticated shell into a usable product representing 50% of the MVP.

## Critical Context from Sprint 0
The foundation is already in place:
- Supabase SSR authentication with email/password works
- Protected app layout with server-side auth gate validated
- Server actions pattern established and proven
- Database tables exist: public.tasks and public.sessions
- RLS policies are in place for user-scoped access
- UI atoms and component patterns validated
- Quality gates: pnpm lint and pnpm typecheck must pass

## Database Schema Context

### Table: public.tasks
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- title: text (not null)
- completed: boolean (default false)
- created_at: timestamptz
- RLS: Users can only access their own tasks

### Table: public.sessions
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- task_id: uuid (nullable, references public.tasks)
- started_at: timestamptz (not null)
- ended_at: timestamptz (nullable)
- duration_seconds: integer (nullable)
- created_at: timestamptz
- RLS: Users can only access their own sessions

## User Stories - Full Requirements

### S1-US1: Tasks create and view (5 SP, High Priority)
As an authenticated user, I want to create tasks and view my task list, so that I can plan what I will work on today.

ACCEPTANCE CRITERIA:
1. User can create task by entering title and submitting ? new task appears immediately in list
2. System saves task to public.tasks with user_id = auth.uid() and created_at timestamp
3. Task list shows ONLY current user's tasks (never other users' tasks)
4. Error message appears when creation fails (validation or network), no duplicate tasks created
5. Interface shows clear empty state when no tasks exist

TECHNICAL REQUIREMENTS:
- Server action for create task with validation (title required, non-empty)
- Server action for list tasks (filtered by auth.uid())
- Optimistic UI update or instant server revalidation
- Error boundaries and user-friendly error messages
- Empty state component with helpful message

### S1-US2: Tasks complete, edit, delete (5 SP, High Priority)
As an authenticated user, I want to complete, edit, and delete tasks, so that my list stays accurate and reflects my progress.

ACCEPTANCE CRITERIA:
1. User can toggle task completion state ? interface updates without full refresh
2. System persists completion changes to public.tasks.completed ? reload shows correct state
3. User can edit task title ? updated title is saved and displayed
4. User can delete task ? removed from list and database
5. Invalid edits (empty title) show validation message and do not change saved data

TECHNICAL REQUIREMENTS:
- Server action: toggle completion (optimistic or revalidate)
- Server action: update title with validation
- Server action: delete task
- UI: inline edit or modal for title editing
- UI: delete confirmation to prevent accidents
- Handle race conditions if user edits/deletes quickly

### S1-US3: Focus start and stop session (8 SP, High Priority)
As an authenticated user, I want to start and stop a focus session, so that I can track my focused time accurately.

ACCEPTANCE CRITERIA:
1. User can start focus session from UI ? interface shows running timer state
2. When user stops session ? system saves ended_at and duration_seconds in public.sessions
3. Duration computed using TIMESTAMPS (not client timer ticks) so refresh/drift doesn't corrupt totals
4. If stop request fails ? error message appears, interface remains consistent with server state after retry
5. User can view today's sessions list (start time and duration) ? includes only their sessions

TECHNICAL REQUIREMENTS:
- Server action: start session (creates record with started_at, ended_at null)
- Server action: stop session (updates ended_at, computes duration_seconds = ended_at - started_at)
- Server action: list today's sessions (filtered by user and date boundary)
- Timer UI component showing elapsed time
- On page load: check if active session exists ? resume timer UI
- Duration calculation MUST use server timestamps, not client elapsed ticks
- Timezone handling: define "today" using Africa/Casablanca consistently

CRITICAL TIMER CORRECTNESS:
- Client timer is for DISPLAY ONLY
- Duration is ALWAYS computed from (ended_at - started_at) on server
- On refresh: fetch active session, calculate elapsed from started_at to now
- This prevents drift and ensures accuracy

### S1-US4: Attach session to task (3 SP, Medium Priority)
As an authenticated user, I want to link a focus session to a task, so that I can see what I spent time working on.

ACCEPTANCE CRITERIA:
1. User can select task when starting session ? system saves task_id on session
2. Starting session without task is allowed ? saves task_id as null
3. Sessions list shows linked task title when task is attached
4. If linked task is deleted ? existing sessions remain visible and don't break UI

TECHNICAL REQUIREMENTS:
- Modify start session action to accept optional task_id parameter
- Task selector UI (dropdown/list) on focus page
- Sessions list query joins with tasks table (LEFT JOIN to handle null task_id)
- Handle deleted task gracefully: show "Task deleted" or task title placeholder

MANUAL TEST CHECKLIST:
- Start session with no task selected -> task_id is null in DB, UI shows no task label
- Start session with a selected task -> task_id saved, sessions list shows task title
- Delete linked task -> session stays visible, shows "Tache supprimee"
- Spoof another user's task_id -> task_id not linked (null or error), no cross-user access
- Refresh /focus during active session -> running state persists, task label safe

### S1-US5: Prevent multiple active sessions (3 SP, High Priority)
As an authenticated user, I want the system to prevent multiple active sessions running at the same time, so that my tracking remains accurate and unambiguous.

ACCEPTANCE CRITERIA:
1. User cannot start new session if active session already exists ? interface shows clear message
2. System enforces rule SERVER-SIDE (not only UI)
3. Refreshing page while session active ? keeps correct active state
4. System provides safe recovery: user can stop active session then start new one

TECHNICAL REQUIREMENTS:
- Server action: before starting session, check if active session exists (ended_at IS NULL)
- If active session found ? return error, do not create new session
- Optional: add partial unique index on sessions (user_id) WHERE ended_at IS NULL
- UI: on page load, fetch active session and show running state
- UI: if start fails due to active session, show "You have an active session" with link to stop it

CRITICAL CONCURRENCY HANDLING:
- Check for active session in same transaction as insert
- Consider database-level constraint for absolute guarantee
- Handle double-click / multiple tabs scenario

MANUAL TEST CHECKLIST:
- Start session with no active session -> timer runs, stop button visible, session row created
- Attempt start in another tab while active -> clear error, no new session created
- Refresh /focus while active -> running state and elapsed time persist
- Stop active session -> ended_at + duration_seconds saved, start enabled again
- Verify other users cannot see or affect sessions (RLS isolation)

### S1-US6: Dashboard simple daily totals (5 SP, Medium Priority)
As an authenticated user, I want the dashboard to show today's focus time and task progress, so that I can understand my day at a glance.

ACCEPTANCE CRITERIA:
1. Dashboard displays today's total focused time (sum of sessions for today) in minutes/hours
2. Dashboard displays today's number of sessions
3. Dashboard displays number of tasks completed and total tasks
4. Values consistent after refresh and match saved database state
5. When no sessions exist today ? dashboard shows zeros and friendly empty hint

TECHNICAL REQUIREMENTS:
- Server action: aggregate today's sessions (SUM(duration_seconds), COUNT(*))
- Server action: count tasks (total and completed)
- Dashboard UI: cards/metrics displaying totals
- Format duration nicely (e.g., "2h 45m" or "165 minutes")
- Empty state: "No focus time yet today. Start your first session!"
- Timezone consistency: use Africa/Casablanca for "today" boundary

### S1-US7: Navigation to app routes (3 SP, Medium Priority)
As an authenticated user, I want clear navigation to Tasks, Focus, Dashboard, and Settings, so that I can move through the app quickly and predictably.

ACCEPTANCE CRITERIA:
1. App navigation shows links to Dashboard, Tasks, Focus, Settings
2. Current route is visually indicated
3. Navigation usable on mobile (320px+) without layout breakage
4. User remains protected by server-side auth gate on all app routes

TECHNICAL REQUIREMENTS:
- Update protected app layout navigation component
- Add route links with active state styling
- Responsive navigation (mobile-friendly)
- All routes already protected by Sprint 0 auth gate
