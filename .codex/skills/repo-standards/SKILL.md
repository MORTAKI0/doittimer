---
name: repo-standards
description: enforce repository-wide engineering standards for modern web applications including naming, folder structure, imports, typing, linting, formatting, pull request hygiene, and repeatable code conventions. use when chatgpt is asked to set project conventions, clean up inconsistency, scaffold features, standardize patterns, or review whether a codebase follows clean and scalable team practices.
---

# Objective

Make the codebase predictable so new code looks like it belongs immediately.

# Standards

## Naming
- use descriptive names
- prefer kebab-case file names
- avoid vague names like `misc`, `helpers`, `common`, `temp`, `new`
- name by responsibility, not by habit

## Imports
- prefer absolute imports or clear aliases where configured
- keep deep relative import chains minimal
- avoid circular dependencies
- do not import feature internals from unrelated features unless explicitly allowed

## File Size
Flag for refactor when:
- components become too large to scan comfortably
- files hold multiple unrelated responsibilities
- route files become orchestration + validation + rendering + mutation all at once

## Typing
- avoid `any`
- encode nullable and optional states honestly
- prefer explicit domain types and result shapes
- avoid passing huge untyped objects through many layers

## Shared Code
Before adding shared code, ask:
1. is this reused already?
2. is it truly cross-feature?
3. does it belong in the feature instead?

Do not move code to shared folders too early.

# Pull Request Standards

A good PR should:
- have a focused scope
- use clear names
- avoid unrelated cleanup mixed with feature work
- include edge case handling
- preserve or improve readability
- mention follow-up work if intentionally deferred

# Feature Scaffold Guidance

For new features, suggest a standard internal structure like:

```text
features/payments/
  components/
  actions/
  server/
  schemas/
  types/
  utils/
```

Use only folders the feature actually needs.

# Review Checklist

Flag:

* inconsistent naming
* dumping grounds like giant utils files
* unclear folder placement
* weak type boundaries
* duplicated patterns solved three different ways
* unrelated changes in one PR
* premature abstraction
* hidden conventions that are not documented

# Output Style

When asked to standardize a repo:

1. define the conventions clearly
2. show a recommended structure
3. give examples of good vs bad naming
4. prefer a small number of strong rules
5. optimize for consistency and onboarding ease
