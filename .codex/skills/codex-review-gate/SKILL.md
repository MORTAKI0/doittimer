---
name: codex-review-gate
description: "Run review gates (pre-commit, pre-PR, PR) with structured findings output. Review-only unless explicitly asked to apply fixes."
metadata:
  short-description: "Structured review gate orchestrator."
  version: "1.0.0"
---

# Codex Review Gate

## Purpose
- Run review gates and provide structured review output.
- Review-only by default; do not apply fixes unless explicitly asked.

## Gates
- Pre-commit: quick safety scan and lint/test spot checks.
- Pre-PR: full verification commands.
- PR review: code review findings with severity ranking.

## Output structure
- Findings (P0 -> P3)
- Evidence (file/line or command output)
- Impact
- Fix guidance
- Verify commands

## Guidance
- Prioritize auth, RLS, migrations, breaking changes, and missing tests.
- Keep to top 10 findings unless asked for more.
- Use .codex/review_prompt.md rubric if present.
