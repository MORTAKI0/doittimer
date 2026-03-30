---
name: frontend-ui-system
description: Creates consistent, accessible UI components and design-system patterns. Use when building components, pages, forms, tables, or reviewing UI conventions.
---

# Objective

Produce clean, consistent, accessible UI that scales across features without visual drift or messy component duplication.

# Principles

## 1) Consistency beats novelty
- Reuse patterns before inventing new ones.
- Similar user tasks should look and behave similarly.
- Build from established primitives and shared patterns.

## Required states and accessibility
Always include semantic HTML, labels, keyboard support, focus states, clear error text, and loading/empty/success/error states.

Use page composition in this order:
1. heading
2. supporting text
3. primary actions
4. filters/search
5. main content
6. empty/loading/error handling

## 3) Separate primitives from feature UI
Recommended structure:

```text
src/shared/ui/
  button.tsx
  input.tsx
  select.tsx
  dialog.tsx
  table.tsx
  badge.tsx

src/shared/components/
  app-header.tsx
  page-shell.tsx
  empty-state.tsx
  section-header.tsx

src/features/*/components/
  user-filter-bar.tsx
  booking-table.tsx
  profile-form.tsx
```

* `shared/ui`: small reusable building blocks
* `shared/components`: reusable compositions
* `features/*/components`: business-specific UI

## 4) Design tokens first

Use standardized tokens for:

* spacing
* radius
* typography
* color roles
* elevation
* container widths

Do not hardcode arbitrary values repeatedly.

## 5) Prefer composable APIs

Good:

* `Button`
* `Input`
* `FormField`
* `Card`
* `Modal`

Avoid giant kitchen-sink components with too many boolean props.

# Component Rules

## Buttons

Support clear variants:

* primary
* secondary
* ghost
* destructive
* link

Do not overload one button style for all actions.

## Inputs

All inputs should support:

* label
* placeholder when useful
* helper text
* error text
* disabled state
* required marker if needed

## Forms

* Group related fields clearly.
* Put validation messages next to fields.
* Do not rely on color alone for error states.
* Show submit loading state.
* Prevent duplicate submission when needed.

## Tables

Default table support:

* loading state
* empty state
* row actions
* responsive fallback strategy
* pagination or infinite load if required
* clear headings

## Cards and panels

* Use cards for grouped content, not everything.
* Keep spacing consistent.
* Prefer visual hierarchy through typography and spacing over excessive borders.

## Navigation

* Show active state clearly.
* Keep labels short and explicit.
* Use breadcrumb only when hierarchy helps.

# Responsive Rules

* Design mobile-first.
* Collapse complex controls into simple stacks on small screens.
* Avoid horizontal scroll except where truly necessary.
* Tables should have a small-screen strategy:

  * stacked cards
  * priority columns
  * horizontal container only as fallback

# State Patterns

Always account for:

* initial loading
* background loading
* empty state
* success feedback
* inline validation
* destructive confirmation where needed

# Copy Rules

* Use concise labels.
* Prefer verbs for actions.
* Avoid vague CTA text like `Submit` if a clearer action exists.
* Use plain language over internal jargon unless the user requests technical wording.

# Review Checklist

When reviewing UI:

* inconsistent spacing
* duplicated components
* inaccessible fields
* missing labels
* unclear hierarchy
* overloaded cards
* poor empty/loading states
* buttons with inconsistent meaning
* mobile layout issues
* weak destructive action patterns

# Output Style

When asked to generate UI:

1. define reusable primitives first if needed
2. compose page-level sections cleanly
3. include accessibility considerations
4. keep component props minimal and purposeful
5. explain reusable patterns, not just one-off styling
