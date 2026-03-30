---
name: nextjs-security
description: Audits and hardens Next.js security across auth, actions, route handlers, and input validation. Use when reviewing sensitive code paths or adding auth boundaries.
---

# Objective

Catch practical security risks early and recommend safe, maintainable fixes without unnecessary fear or noise.

# Output Format
Severity order: Critical → Important → Nice to Improve
For each item: what is wrong | why it matters | fix

# What To Check

## 1) Authentication
- unauthenticated access to sensitive routes
- missing session checks in server actions
- assuming client-side guards are enough
- broken sign-out or session invalidation paths

## 2) Authorization
- missing role checks
- user can mutate another user's data
- action or handler trusts client-provided identifiers
- admin UI hidden but server path still open

## 3) Input validation
- missing schema validation
- unsafe parsing
- unchecked query params
- weak file upload validation
- unsanitized user-controlled strings when relevant

## 4) Secrets and env
- secret imported into client code
- unsafe logging of tokens or credentials
- overexposed environment variables
- confusion between public and server-only env usage

## 5) Server Actions and Route Handlers
- action callable without permission checks
- inconsistent error handling leaking internals
- missing CSRF considerations where relevant to the stack
- returning too much sensitive data

## 6) Cookies and session state
- insecure cookie defaults
- session stored or exposed unsafely
- auth checks performed only in UI
- sensitive state cached incorrectly

## 7) Redirect and request safety
- open redirects
- trusting external URLs directly
- SSRF-like proxy patterns
- webhook endpoints without validation

# Anti-Patterns To Flag

- trusting hidden form fields for authorization
- checking roles only in client components
- returning stack traces or internal messages to clients
- using raw request params in redirects
- broad data fetches without ownership checks
- mixing auth logic across many scattered helpers
