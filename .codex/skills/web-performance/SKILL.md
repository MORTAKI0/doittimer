---
name: web-performance
description: Improves Next.js performance across rendering, bundle size, and data paths. Use when a page is slow, reviewing client JS, or optimizing rendering strategy.
---

# Objective

Improve real and perceived performance with changes that are simple, measurable, and architecture-aware.

# Performance Priorities
1. too much client JavaScript
2. unnecessary rendering work
3. slow data paths
4. asset inefficiency
5. cache/revalidation mistakes
6. poor loading states

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
Return Biggest Wins, Medium Wins, Fine Tuning — each with: current problem | user impact | fix.

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
