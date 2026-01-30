---
name: pomodoro-v2-spec
description: "Planner skill to translate the Pomodoro Improvements spec (4 stories) into engineering tasks, risks, and acceptance criteria without implementing code."
metadata:
  short-description: "Spec-to-plan translator for Pomodoro v2."
  version: "1.0.0"
---

# Pomodoro Improvements - Planner Skill

## Purpose
- Convert the four user stories into acceptance criteria, task breakdowns, and risk notes.
- Feed sprint/2026-02/EXECPLAN.md and sprint/2026-02/BACKLOG.md.

## Strict boundary
- Planning only. No code implementation details beyond plan/checklists.
- Do not modify product code or migrations in PLANNING.

## Data model checklist
- New tables: define user_id ownership, timestamps, and indexes.
- New columns: nullable and backward compatible.
- RLS policies for every new table.
- RPCs or server actions: list inputs/outputs and required validations.

## Security checklist
- Ownership enforcement on every read/write.
- Validate active session ownership for write operations.
- Server timestamps only (no client timestamps).
- No secrets/PII in logs.

## Testing checklist
- Unit tests for business logic and RPCs.
- E2E for full user flows (Playwright).
- Negative cases for auth and RLS.

## Rollout checklist
- Feature flag default off: user_settings.pomodoro_v2_enabled = false.
- Staged rollout: enable for @ega first, then widen.
- Document rollback path.
