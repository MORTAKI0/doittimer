---
name: web-performance
description: improve frontend and next.js performance with practical recommendations around server-first rendering, bundle size, client javascript reduction, route composition, suspense, caching, image and font strategy, and core web vitals. use when chatgpt is asked to optimize a page, investigate slowness, reduce client overhead, review rendering strategy, or improve perceived and measured web performance.
---

# Objective

Improve real and perceived performance with changes that are simple, measurable, and architecture-aware.

# Performance Priorities

Evaluate in this order:
1. too much client javascript
2. large or unnecessary rendering work
3. slow data paths
4. image and asset inefficiency
5. cache and revalidation mistakes
6. poor loading-state experience

# Core Rules

## 1) Reduce client work
- prefer server rendering
- keep client components small
- avoid hydrating static content
- move data fetching off the client where possible

## 2) Split responsibly
- use suspense boundaries for meaningful chunks
- avoid one giant page that waits on everything
- stream where it improves experience

## 3) Keep pages thin
- large page components often hide wasted work
- move expensive logic into server utilities or feature loaders

## 4) Control assets
- optimize images
- avoid oversized icons or media
- load fonts intentionally
- avoid piling on third-party scripts

## 5) Make loading feel fast
- use skeletons where helpful
- avoid blank pages during fetch
- provide stable layout during loading

# What To Inspect

## Rendering strategy
- does this need to be a client component?
- can this be split into server + interactive leaf?
- are there redundant providers at high levels?

## Data path
- duplicate fetches
- waterfall requests
- over-fetching
- missing cache boundaries
- expensive serialization

## UI path
- heavy lists without pagination or virtualization
- giant tables rendered eagerly
- expensive derived calculations in render
- unnecessary state causing re-renders

## Assets
- large images
- unoptimized SVG usage
- too many web fonts or weights
- large third-party script footprint

# Review Format

When asked to optimize performance, return:

## Biggest Wins
High-impact changes worth doing first.

## Medium Wins
Useful improvements with moderate effort.

## Fine Tuning
Lower-impact cleanup or polish.

For each issue include:
- current problem
- user impact
- recommended change
- why it helps

# Anti-Patterns To Flag

- app-wide `"use client"` patterns
- fetching in `useEffect` for data needed at first render
- global providers wrapping everything unnecessarily
- huge page-level client components
- loading entire datasets when a paginated slice is enough
- hiding poor performance behind spinners only

# Output Style

- prioritize top 3 wins first
- keep recommendations measurable
- prefer architecture fixes over micro-optimizations
- mention expected tradeoffs if relevant
