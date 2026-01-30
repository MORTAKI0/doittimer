# Sprint 2026-02 Backlog

Source spec: "Pomodoro Improvements — Implementation Spec (4 Small User Stories)"
Status: BLOCKED (spec text not provided in repo). Fill acceptance criteria once spec is provided.

---

# Story 1: Pomodoro Cycle Engine (Work/Short/Long)
- Owner: TBD
- Risk: MEDIUM

## Acceptance Criteria (from spec)
- [ ] SPEC REQUIRED: work/short/long cycle behavior (fill exact rules)
- [ ] SPEC REQUIRED: long break cadence (fill exact rules)
- [ ] SPEC REQUIRED: pause/skip/restart behavior (fill exact rules)
- [ ] SPEC REQUIRED: refresh-safe resume behavior (fill exact rules)
- [ ] SPEC REQUIRED: settings compatibility and defaults

## Dependencies
| Dependency | Status | Notes |
| --- | --- | --- |
| Spec details for Story 1 | BLOCKED | Required to finalize AC and tasks |
| Feature flag plumbing | READY | user_settings.pomodoro_v2_enabled default false |

## Notes
- Feature flag: user_settings.pomodoro_v2_enabled default false
- Backward compatibility: additive changes only
- RLS: required for any new tables/RPCs
- Notion: no impact

---

# Story 2: Completion Stats (events table preferred; minimal alternative noted)
- Owner: TBD
- Risk: MEDIUM

## Acceptance Criteria (from spec)
- [ ] SPEC REQUIRED: completion events table fields and semantics
- [ ] SPEC REQUIRED: stats aggregation/query requirements
- [ ] SPEC REQUIRED: UI surfaces for stats
- [ ] SPEC REQUIRED: minimal alternative behavior (if events table not used)

## Dependencies
| Dependency | Status | Notes |
| --- | --- | --- |
| Spec details for Story 2 | BLOCKED | Required to finalize AC and tasks |
| RLS patterns for events/stats | READY | Use owner-only policies |

## Notes
- Feature flag: user_settings.pomodoro_v2_enabled default false
- Backward compatibility: additive changes only
- RLS: required for events/stats
- Notion: no impact

---

# Story 3: Presets
- Owner: TBD
- Risk: LOW

## Acceptance Criteria (from spec)
- [ ] SPEC REQUIRED: preset fields, defaults, and limits
- [ ] SPEC REQUIRED: create/edit/delete flows
- [ ] SPEC REQUIRED: apply preset to current session/settings

## Dependencies
| Dependency | Status | Notes |
| --- | --- | --- |
| Spec details for Story 3 | BLOCKED | Required to finalize AC and tasks |
| Feature flag plumbing | READY | user_settings.pomodoro_v2_enabled default false |

## Notes
- Feature flag: user_settings.pomodoro_v2_enabled default false
- Backward compatibility: additive changes only
- RLS: required for preset storage
- Notion: no impact

---

# Story 4: Focus Queue
- Owner: TBD
- Risk: MEDIUM

## Acceptance Criteria (from spec)
- [ ] SPEC REQUIRED: queue item fields and ordering
- [ ] SPEC REQUIRED: enqueue/dequeue behavior
- [ ] SPEC REQUIRED: UI interactions and persistence

## Dependencies
| Dependency | Status | Notes |
| --- | --- | --- |
| Spec details for Story 4 | BLOCKED | Required to finalize AC and tasks |
| RLS patterns for queue storage | READY | Use owner-only policies |

## Notes
- Feature flag: user_settings.pomodoro_v2_enabled default false
- Backward compatibility: additive changes only
- RLS: required for queue storage
- Notion: no impact
