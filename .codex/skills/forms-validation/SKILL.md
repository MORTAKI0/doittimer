---
name: forms-validation
description: Enforces robust, accessible form and validation patterns. Use when building or reviewing forms, server actions, error states, field validation, or mutation UX.
---

# Objective

Build forms that are easy to use, hard to break, and consistent across the app.

# Core Rules
- Validate on the server.
- Use schema-driven validation.
- Keep form state explicit.
- Accessibility is mandatory.

# Standard Form Result Shape
```ts
type FormResult<T = unknown> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};
```

# Field Rules

## Text fields

Support:

* label
* placeholder only as a hint, not replacement for label
* helper text when needed
* inline error text
* disabled state

## Selects and checkboxes

* use clear labels
* ensure keyboard usability
* make default value states explicit

## File uploads

* validate type
* validate size
* validate count if multiple
* show upload errors clearly

# Multi-Step Forms

For multi-step flows:

* validate each step enough to continue
* revalidate everything on final submit
* persist step state intentionally
* show progress clearly
* support back navigation safely

# Review Checklist

Flag:

* missing server validation
* inconsistent error shapes
* no loading state
* inaccessible labels
* hidden required rules
* duplicate validation logic in many places
* weak file validation
* submit buttons that do not reflect progress

# Output Style

When asked for form help:

1. define validation strategy
2. define field and error model
3. generate accessible markup
4. separate UI concerns from mutation logic
5. keep the submit flow predictable
