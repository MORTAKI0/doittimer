---
name: db-rls-check
description: "Review DB changes for RLS, constraints, and backward compatibility with structured output."
metadata:
  short-description: "RLS and migration safety checklist."
  version: "1.0.0"
---

# DB RLS Check

## Purpose
- Review database changes for RLS correctness, constraints, and backward compatibility.

## Output format
- P0 issues (must fix)
- P1 issues (should fix)
- P2/P3 issues (nice to fix)
- Recommended policy patterns

## Checklist
- All new tables have RLS enabled.
- Owner-only policies exist for select/insert/update/delete.
- Foreign keys and constraints are backward compatible.
- New columns are nullable or have safe defaults.
- No breaking changes to existing RPCs.

## Recommended policy patterns (examples)
- select: auth.uid() = user_id
- insert: auth.uid() = user_id
- update: auth.uid() = user_id
- delete: auth.uid() = user_id

## Notes
- Call out missing indexes for common query paths.
- Flag any use of client-supplied timestamps.
