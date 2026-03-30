---
name: doittimer-supabase
description: use the doittimer Supabase workflow for schema changes, migrations, SQL inspection, RLS policy work, migration verification, and local seeding against the doittimer Supabase project. trigger when Codex is asked to inspect Supabase schema, write or apply migration SQL, verify Supabase changes, generate RLS policies, run safe one-off data queries, or seed the doittimer database.
---

# Objective

Use the DoItTimer-specific Supabase workflow without leaking secrets into the repo and without treating production inspection as generic guidance.

# Project Scope

Apply this skill only to the DoItTimer Supabase project at `https://blwcedhzlrwlnnixtwpi.supabase.co`.

Treat this as a project-specific workflow. Do not generalize it to other Supabase projects unless the user explicitly changes the target.

# Secrets Rule

Do not write the live database password or raw connection string into repo files, commits, or user-visible code blocks unless the user explicitly asks for that and accepts the risk.

When direct database access is needed, prefer a local secret-backed command such as:

```powershell
psql "$env:DOITTIMER_SUPABASE_DB_URL"
```

Assume `DOITTIMER_SUPABASE_DB_URL` points to the real DoItTimer Postgres connection unless the user explicitly overrides it.

If the variable is missing, say so clearly and continue by providing the SQL and exact command shape needed.

# Workflow
- Inspect with `psql` for rows, tables, and one-off queries.
- For schema or durable policy changes, write a migration and apply with the Supabase CLI.
- For verification, confirm schema, policies, indexes, triggers, and functions directly.
- Report only what command output or inspection confirms.

# Repo Discovery

Before running commands, inspect the repo for:

- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/seed.sql`
- `package.json`
- `Makefile`
- `.env*` files that indicate local or linked project setup
- docs describing the team Supabase workflow

Prefer repo conventions over generic defaults.

# Workflow Decision Tree

## Schema Change Or Durable Policy Change

1. Inspect existing migrations first.
2. Read the most recent related migrations before writing a new one.
3. Generate raw SQL before execution.
4. Create a focused migration.
5. Put the SQL into the migration file.
6. Apply with `supabase db push` when the user asks to execute or apply.
7. Verify resulting schema, policies, indexes, triggers, and functions.

For migration names, prefer concise names such as:

- `create-users-table`
- `add-user-timezone-column`
- `enable-rls-on-users`
- `add-users-select-policy`
- `add-tasks-table`

## SQL Inspection Or One-Off Data Operation

Use `psql` directly for inspection queries and clearly bounded one-off data operations.

Common examples:

```sql
\dt
SELECT * FROM public.projects LIMIT 10;
INSERT INTO public.projects (name) VALUES ('test');
UPDATE public.projects SET name = 'x' WHERE id = '...';
DELETE FROM public.projects WHERE id = '...';
\q
```

Interpret them this way:

- `\dt` lists tables
- `SELECT` is inspection
- `INSERT`, `UPDATE`, and `DELETE` are direct data changes
- `\q` exits `psql`

For schema changes, durable fixes, or policy changes, do not prefer ad hoc direct execution over a migration.

## RLS Generation Or Review

1. Inspect current table definition and current policies.
2. Confirm whether RLS is already enabled.
3. Infer the access model from ownership, team membership, public-read intent, or admin-only intent.
4. Write separate policies for `select`, `insert`, `update`, and `delete` unless a broader rule is clearly justified.
5. Verify `using` and `with check` behavior independently.

Avoid permissive policies such as `using (true)` unless the table is intentionally public.

Use this ownership pattern by default only when the table design shows the authenticated user owns rows by `id`:

```sql
alter table public.users enable row level security;

create policy "users_select_own"
on public.users
for select
using (auth.uid() = id);

create policy "users_update_own"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

Adjust the owner column or access model when the schema shows a different design.

# Guardrails
- Prefer migration files over ad hoc production changes whenever schema or durable policy changes are involved.
- Show the SQL before execution unless the user explicitly asks for direct execution.
- Keep SQL idempotent when practical.
- Qualify database objects with `public.` unless another schema is intentionally required.
- Never claim a command succeeded unless the output confirms it.
- If `supabase` CLI or `psql` is missing, explain the blocker and still provide the SQL and exact commands.
- If live verification is not possible, say so explicitly and limit claims to file inspection or local inference.
- For destructive changes such as `drop table`, `drop column`, `truncate`, broad deletes, or policy rewrites that may lock users out, pause and flag the risk before continuing.

# Verification Checklist

When inspecting schema or verifying a change, check as many of these as the environment allows:

- tables and columns
- primary keys and foreign keys
- unique constraints
- indexes
- default values
- triggers
- functions
- enums
- views
- RLS enabled status
- existing policies
- recent migrations touching the same objects

Use [references/inspection-checklist.md](references/inspection-checklist.md) when a fuller inspection or verification pass is needed.
