---
name: nextjs-testing
description: Defines testing strategy for Next.js App Router features. Use when adding tests, improving coverage, or testing server actions, forms, route handlers, or user flows.
---

# Objective

Create a balanced testing strategy that protects behavior without wasting effort on low-value tests.

# Testing Priorities
1. critical user flows
2. business logic
3. data validation
4. mutations and permissions
5. rendering branches
6. reusable UI primitives

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
