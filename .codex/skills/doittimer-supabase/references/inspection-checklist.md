# Inspection Checklist

Use this checklist when the user asks to inspect schema, debug a migration, verify a policy change, or confirm a seed.

## Repo Inspection

- confirm whether `supabase/config.toml` exists
- inspect `supabase/migrations/`
- inspect `supabase/seed.sql`
- inspect helper scripts, Make targets, and package scripts
- inspect `.env*` usage without echoing secrets

## Schema Inspection

- list tables
- inspect columns and data types
- inspect primary keys
- inspect foreign keys
- inspect unique constraints
- inspect indexes
- inspect defaults
- inspect generated columns if present
- inspect triggers
- inspect functions used by policies or writes
- inspect enums and views

## RLS Inspection

- confirm whether RLS is enabled
- list existing policies
- review `select`, `insert`, `update`, and `delete` separately
- verify owner or membership predicates match the table design
- verify `with check` clauses for inserts and updates
- look for broad allow-all predicates

## Migration Review

- identify the most recent related migration
- confirm the new change is minimal and focused
- look for backward-compatibility risks
- prefer explicit object qualification with `public.`
- make SQL idempotent when practical
- call out destructive steps before execution

## Verification After Apply

- confirm migration is listed
- confirm expected tables or columns exist
- confirm expected constraints and indexes exist
- confirm triggers and functions compile and are attached as intended
- confirm RLS state and policies match the planned access model
- confirm representative reads or writes behave as expected

## Seeding Verification

- confirm the seed path is rerunnable
- confirm representative rows were inserted
- confirm required foreign keys resolve
- confirm auth-dependent rows use the intended ids
- confirm no production-only data was introduced
