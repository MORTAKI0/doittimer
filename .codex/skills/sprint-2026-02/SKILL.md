---
name: sprint-2026-02
description: Phase-gated Plan -> Approve -> Execute workflow for sprint/2026-02. Enforces PHASE header, planning-only edits, approval gate, and progress updates.
metadata:
  short-description: Sprint 2026-02 guardrails and workflow.
  version: "1.0.0"
---

# Sprint 2026-02 Workflow

## Phase gating (mandatory)
- Every operator prompt must include a PHASE header.
- If missing, respond: "I need a PHASE header to proceed."

## Planning constraints
- In PLANNING, only edit these files:
  - AGENTS.md (repo root)
  - PLANS.md (repo root)
  - sprint/2026-02/BACKLOG.md
  - sprint/2026-02/EXECPLAN.md
  - sprint/2026-02/DECISIONS.md (optional)
  - sprint/2026-02/RETROSPECTIVE.md
  - sprint/2026-02/METRICS.json (optional)
  - .codex/skills/** (skill files only)
  - .codex/review_prompt.md (optional)
- Do not modify product code, migrations, CI, dependencies, or non-sprint docs.

## Execution gate
- EXECUTION is blocked until sprint/2026-02/EXECPLAN.md contains:
  - APPROVED: <name/handle> — <YYYY-MM-DD>
- If missing, refuse to execute and request approval.

## ExecPlan generation
- Always generate or update sprint/2026-02/EXECPLAN.md from PLANS.md.
- Keep dependency tracker and AC -> tasks mapping in sync.

## Progress log and cadence
- Update sprint/2026-02/EXECPLAN.md:
  - After each story
  - End of day
  - When blockers appear/clear
  - On scope change
  - After failed verification
  - After each milestone
