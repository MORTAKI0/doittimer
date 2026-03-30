---
name: repo-standards
description: Enforces naming, folder structure, typing, and PR hygiene. Use when scaffolding features, reviewing conventions, or standardizing repository patterns.
---

# Objective

Make the codebase predictable so new code looks like it belongs immediately.

# Repository Standards
- Use descriptive names and clear imports.
- Keep file responsibilities narrow.
- Avoid `any` and weak type boundaries.
- Keep PRs focused, readable, and free of unrelated cleanup.

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
