# Sprint ExecPlan Template

## Sprint header
- Sprint ID:
- Phase:
- Owner:
- Status:
- Source spec:
- Last updated:

## Scope
- Goals:
- Non-goals:
- Out of scope:

## Dependency tracker (status: BLOCKED | READY | DONE)
| Dependency | Status | Owner | Notes |
| --- | --- | --- | --- |
| Example: Spec confirmed | BLOCKED | TBD | Awaiting input |

## Story-by-story AC -> tasks mapping
### Story 1: <title>
| Acceptance Criteria | Tasks |
| --- | --- |
| AC-1 | Task list |
| AC-2 | Task list |

### Story 2: <title>
| Acceptance Criteria | Tasks |
| --- | --- |
| AC-1 | Task list |

### Story 3: <title>
| Acceptance Criteria | Tasks |
| --- | --- |
| AC-1 | Task list |

### Story 4: <title>
| Acceptance Criteria | Tasks |
| --- | --- |
| AC-1 | Task list |

## Milestones and exit criteria
- Milestone 0: Discovery and plumbing
  - Exit: repo tooling verified, commands confirmed, feature flag path known
- Milestone 1: Story 1 foundations
  - Exit: DB changes applied, basic wiring behind flag
- Milestone 2: Story 1 behavior complete
  - Exit: cycle behavior correct, refresh safe, tests pass
- Milestone 3: Story 2 completion stats
  - Exit: events/stats path complete, UI connected, tests pass
- Milestone 4: Story 3 presets
  - Exit: presets stored, UI workflow complete, tests pass
- Milestone 5: Story 4 focus queue
  - Exit: queue stored, UI workflow complete, tests pass
- Milestone 6: Hardening and rollout
  - Exit: verification commands pass, docs updated, rollout staged

## DB plan (backward compatible only)
- Additive schema changes only (nullable columns or new tables).
- RLS-first: define policies before data access.
- Provide rollback strategy for each change.

## Security plan
- Ownership enforcement and least-privilege RLS.
- Server timestamps only (no client-supplied timestamps).
- Validate active session ownership for writes.

## Testing plan
- Unit tests for core logic and RPCs.
- Playwright E2E for user flows.
- Manual smoke for edge cases.

## Verification commands (fill with repo-specific commands)
- discover commands (inspect package.json scripts)
- pnpm lint
- pnpm typecheck
- pnpm test (or repo equivalent)
- pnpm playwright test (or repo equivalent)

## Rollout plan
- Feature flag gated rollout.
- Enable for internal user first, then widen.

## Failure protocol
Stop -> capture evidence -> revert smallest unit -> update plan -> re-approve if material.

## Skills to invoke
- sprint-2026-02
- pomodoro-v2-spec
- db-rls-check
- codex-review-gate

## Update cadence
- After each story completion
- End of day summary
- On blocker
- On scope change
- On failed verification
- After each milestone

## Approval
APPROVED: ____________________ — __________

## Progress log
| Date | Update |
| --- | --- |
| YYYY-MM-DD | Initialized plan |
