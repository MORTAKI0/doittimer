# Review Prompt

## Severity
- P0: security/auth regressions, RLS failures, secrets/PII exposure, breaking DB changes
- P1: backward-compat risks, missing tests for critical paths, contract changes without notes
- P2: correctness risks, edge cases, performance regressions
- P3: style, clarity, minor cleanup

## Required fields per finding
- Severity (P0-P3)
- Evidence (file/line or command output)
- Impact
- Fix
- Verify commands

## Focus areas
- Auth and permissions
- RLS and policies
- Migrations and backward compatibility
- Breaking API/contract changes
- Missing tests

## Output limits
- Top 10 findings unless operator requests deeper coverage
