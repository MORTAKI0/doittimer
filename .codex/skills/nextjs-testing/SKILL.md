---
name: nextjs-testing
description: define and generate practical testing strategy for next.js 16+ applications across unit, integration, component, and end-to-end testing. use when chatgpt is asked to create tests, improve coverage, design test architecture, choose what to test, review flaky tests, or add reliable testing to app router features, forms, server actions, route handlers, and user flows.
---

# Objective

Create a balanced testing strategy that protects behavior without wasting effort on low-value tests.

# Testing Priorities

Test in this order:
1. critical user flows
2. business logic
3. data validation
4. mutations and permissions
5. rendering branches
6. reusable UI primitives

# Test Pyramid Guidance

## End-to-end
Use for:
- sign in / sign out
- create / update / delete flows
- checkout / booking / submission flows
- permission and role-sensitive routes
- cross-page user journeys

## Integration
Use for:
- server actions with validation and service calls
- route handlers
- feature-level form flows
- repository/service boundaries
- data mapping functions with real contracts

## Unit
Use for:
- pure utilities
- schema helpers
- formatting logic
- reducers
- policy functions
- deterministic domain logic

Do not over-invest in shallow tests for trivial wrappers.

# What To Test In Next.js Apps

## Server Actions
Test:
- valid submission
- invalid submission
- permission failure
- service failure
- revalidation or redirect branch if applicable

## Route Handlers
Test:
- success response
- invalid payload
- auth failure
- unexpected failure
- response shape

## Forms
Test:
- field validation
- error rendering
- disabled/loading state
- successful submit behavior

## Pages and Features
Prefer integration or e2e over brittle implementation-detail tests.
Focus on:
- key branch rendering
- auth gating
- data states
- destructive confirmations
- navigation outcomes

# Test Organization

Recommended:

```text
src/
  features/
    users/
      __tests__/
        create-user-action.test.ts
        users-route.test.ts
        user-form.integration.test.tsx

tests/
  e2e/
    auth.spec.ts
    booking-flow.spec.ts
```

* keep tests close to feature code when practical
* keep broad flow tests in a dedicated e2e area

# Writing Rules

* test behavior, not private implementation details
* avoid over-mocking
* use realistic fixtures
* prefer explicit test names
* keep one reason to fail per test when possible

# Naming Rules

Use patterns like:

* `returns validation errors when email is missing`
* `creates booking and revalidates dashboard data`
* `denies access when user lacks admin role`

Avoid vague names like:

* `works correctly`
* `should handle case`
* `test form`

# Flaky Test Checklist

Flag:

* time-dependent assertions
* random data without control
* shared mutable fixtures
* network dependence in non-e2e tests
* broad selectors in e2e
* assertions before UI settles

# Output Style

When asked for test help:

1. identify the correct test level first
2. explain why that level fits
3. generate clean test cases
4. include realistic edge cases
5. avoid excessive mocking unless necessary
