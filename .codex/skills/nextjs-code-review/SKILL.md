---
name: nextjs-code-review
description: Reviews Next.js code for correctness, security, architecture, and App Router patterns. Use when reviewing a PR, auditing a feature, or identifying code smells.
---

# Objective

Review code like a senior engineer: identify concrete issues, explain why they matter, and suggest the safest high-value fixes.

# Output Format
Severity order: Critical → Important → Nice to Improve
For each item: what is wrong | why it matters | fix

# What To Check

## 1) Correctness
- broken logic
- wrong conditions
- race conditions
- invalid async handling
- missing null checks
- unsafe assumptions
- wrong dependency use
- stale data flows
- invalid mutation behavior

## 2) Next.js boundaries
- server code inside client components
- unnecessary `"use client"`
- route files doing too much
- misuse of server actions
- misuse of route handlers
- poor caching assumptions
- missing loading or error states

## 3) Readability
- misleading names
- giant components
- mixed concerns
- nested conditionals
- duplicated logic
- weak file structure
- magic strings and unexplained constants

## 4) Types
- `any`
- weak inferred contracts
- missing return types where clarity helps
- leaking backend/database models into UI
- nullable states not modeled explicitly

## 5) React quality
- unnecessary client state
- derived state stored instead of computed
- overuse of effects
- effects doing data-fetch work that belongs on the server
- memoization without evidence
- components that re-render due to poor structure

## 6) Accessibility
- unlabeled inputs
- non-semantic clickable divs
- missing button types
- focus trap issues
- poor error messaging
- missing keyboard support

## 7) Performance
- too much client JS
- heavy components marked client unnecessarily
- duplicate fetches
- waterfall fetching
- expensive rendering in client components
- weak suspense splitting
- large page components

# Refactor Guidance

When suggesting a refactor:
- minimize blast radius
- preserve behavior unless the user wants redesign
- propose stepwise changes
- mention tradeoffs when relevant

# Anti-Patterns To Flag

- page files containing business logic, validation, and UI all together
- giant client components used only for convenience
- generic `utils.ts` dumping ground
- passing entire data objects through many layers unnecessarily
- form logic tightly coupled to layout markup
- server actions returning inconsistent shapes
- duplicated fetch calls across routes and components
