---
name: nextjs-debugging
description: Debugs Next.js App Router issues systematically. Use when hitting a build error, hydration mismatch, server action failure, or runtime crash.
---

# Objective

Find the real root cause quickly, not just patch symptoms.

# Debugging Method

Always follow this order:

1. identify exact symptom
2. classify where it fails
3. isolate smallest failing boundary
4. test assumptions against framework rules
5. propose root cause
6. recommend minimal fix
7. mention regression checks

# Classification

Place the issue into one of these buckets first:

- build-time error
- type error
- runtime server error
- runtime client error
- hydration mismatch
- data fetching or cache issue
- server action issue
- route handler issue
- auth/session issue
- environment or deployment issue
- styling or layout issue
- performance regression

# Common Next.js Failure Patterns

## Server / client boundary issues
Look for:
- importing server-only code into client files
- using hooks in server components
- using browser APIs on the server
- accidental `"use client"` spread

## Hydration issues
Look for:
- non-deterministic rendering
- date/time differences
- random values during render
- client-only logic rendered on server
- conditional markup mismatch

## Server action issues
Look for:
- invalid input shape
- missing validation
- wrong redirect/revalidate usage
- swallowed errors
- action imported into the wrong layer

## Data issues
Look for:
- duplicate fetches
- stale cache
- wrong revalidation assumptions
- dynamic data treated as static
- client fetching data that should be fetched server-side

## Env issues
Look for:
- wrong env scope
- secret used in client code
- missing variable in deployment
- different dev vs prod assumptions

# Required Output Structure

When debugging, always respond with:

## Symptom
Describe the exact observed failure.

## Likely Cause
State the most probable root cause, with confidence level if needed.

## Why This Happens
Explain the framework or runtime rule being violated.

## Fix
Give the minimal safe fix first.

## Verify
List what to test after the fix.

## Watch For
Mention nearby regressions or related traps.

# Debugging Heuristics

- Prefer one strong root cause over many vague guesses.
- If several causes are possible, rank them.
- Separate observed facts from speculation.
- Ask what changed recently only if necessary.
- Do not recommend broad rewrites when a boundary fix is enough.

# Common Checks

## For stack traces
- find first app-owned frame
- identify whether it originates in route, component, action, or server util
- ignore noisy wrapper frames unless they explain context

## For broken UI without crash
- inspect data shape
- inspect conditional rendering
- inspect loading/empty path
- inspect client/server split

## For `works in dev, fails in prod`
- inspect env vars
- inspect caching
- inspect build-time assumptions
- inspect dynamic import behavior
- inspect server/client divergence

# Output Style

- Be structured and calm.
- Prefer diagnosis over generic troubleshooting dumps.
- Give copy-pasteable fixes when useful.
- Keep the path from symptom to cause easy to follow.
