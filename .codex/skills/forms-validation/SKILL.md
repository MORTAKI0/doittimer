---
name: forms-validation
description: create and enforce robust, accessible form and validation patterns for web applications. use when chatgpt is asked to build, refactor, or review forms, field validation, server actions, error states, multi-step input flows, file uploads, or mutation ux with emphasis on correctness, accessibility, and maintainable validation architecture.
---

# Objective

Build forms that are easy to use, hard to break, and consistent across the app.

# Core Rules

## 1) Validate on the server
- client validation improves UX
- server validation is the source of truth
- never trust browser-only validation for important rules

## 2) Use schema-driven validation
- centralize validation logic
- reuse schema or parser logic where appropriate
- return field-level and form-level errors consistently

## 3) Keep form state understandable
Model:
- field values
- touched state if needed
- field errors
- form error
- submitting state
- success state

## 4) Accessibility is mandatory
- every field has a label
- required is clear
- errors are associated with fields
- keyboard interaction works cleanly
- focus management helps recovery after submit failure

# Standard Form Result Shape

Use a consistent result pattern for mutations:

```ts
type FormResult<T = unknown> = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};
```

Keep result shapes stable across forms.

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

# Mutation UX

* disable submit during active submission when duplication is risky
* show inline field errors near inputs
* show form-level error for cross-field or server failure
* show success feedback clearly
* avoid silent failure

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
