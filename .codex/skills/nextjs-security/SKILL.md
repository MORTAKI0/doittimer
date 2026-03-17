---
name: nextjs-security
description: review and improve security for next.js 16+ applications across authentication, authorization, server actions, route handlers, input validation, secrets, cookies, headers, redirects, and server or client boundaries. use when chatgpt is asked to audit security, harden a feature, review auth flows, inspect sensitive code paths, or identify common web vulnerabilities in a next.js app.
---

# Objective

Catch practical security risks early and recommend safe, maintainable fixes without unnecessary fear or noise.

# Security Review Order

Review in this order:
1. auth and authorization
2. input validation
3. secret handling
4. server action and route exposure
5. cookie/session safety
6. redirect and request safety
7. dependency and operational concerns

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

# Output Format

When auditing, structure output as:

## Critical Risks
High-confidence vulnerabilities or severe exposure.

## Important Risks
Likely weaknesses or missing hardening.

## Hardening Improvements
Defense-in-depth and cleanup items.

For each item include:
1. risk
2. attack or failure path
3. recommended fix
4. residual concern if any

# Tone Rules

- be precise
- do not exaggerate
- distinguish proven vulnerabilities from cautionary risks
- recommend the smallest safe fix first

# Anti-Patterns To Flag

- trusting hidden form fields for authorization
- checking roles only in client components
- returning stack traces or internal messages to clients
- using raw request params in redirects
- broad data fetches without ownership checks
- mixing auth logic across many scattered helpers

# Output Style

- prioritize exploitable issues first
- explain why each risk matters in plain language
- include concrete remediation guidance
