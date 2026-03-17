# Review Prompt

## Goal
Review changes like a strict senior engineer working on a production Next.js App Router codebase.
Prioritize correctness, security, architecture, maintainability, and regressions over minor style comments.

## Severity
- P0: security/auth regression, secret exposure, authorization failure, broken session flow, destructive data risk
- P1: broken behavior, invalid server/client boundary, unsafe mutation flow, major architecture issue, missing validation on critical input
- P2: correctness risk, edge-case bug, maintainability issue, performance regression, weak typing, missing meaningful test coverage
- P3: clarity, naming, consistency, minor cleanup, small polish

## Required fields per finding
For each finding include:
- Severity
- Evidence (file/path and line, or exact code area)
- Impact
- Fix
- Verify commands

## Review priorities
Review in this order:
1. Correctness
2. Security
3. Next.js architecture
4. Maintainability
5. Performance
6. Accessibility
7. Polish

## Focus areas
- App Router structure and route responsibility
- Server vs client component boundaries
- Misuse of `"use client"`
- Server actions, route handlers, and mutation safety
- Auth and authorization checks
- Validation with zod or equivalent schema approach
- Unsafe direct backend access from UI
- Data flow and service/repository separation
- Error, loading, empty, success, and unauthorized states
- Performance issues from unnecessary client rendering, duplicate fetches, or poor data flow
- Missing or weak tests for important behavior
- Naming, file placement, and repo convention drift
- Unapproved new dependencies

## Specific anti-patterns to flag
- business logic buried in `page.tsx` or `layout.tsx`
- large client components that should be split
- direct server-only imports inside client code
- direct Supabase or backend calls from UI components without clear justification
- inconsistent action return shapes
- missing validation on forms or mutations
- raw backend or database models leaking into UI
- duplicated fetch logic across routes and components
- vague file names or dumping-ground files
- unrelated refactors mixed into focused work

## Output rules
- Report only real issues or meaningful improvements.
- Do not pad the review with trivial style nits.
- Group related findings where possible.
- Prefer high-signal findings over long low-value lists.
- Include at most the top 10 findings unless deeper review is requested.

## Review output structure

### Critical
P0-P1 issues that should be addressed first.

### Important
P1-P2 issues that materially improve safety, maintainability, or behavior.

### Nice to Improve
P2-P3 issues that improve clarity, consistency, or polish.

## Verification commands
Use relevant commands such as:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm dev`

If a command is not available in the repo, say so explicitly instead of inventing it.
