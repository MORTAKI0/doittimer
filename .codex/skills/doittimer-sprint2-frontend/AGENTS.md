# DoItTimer Sprint 2 — Frontend AGENTS

## Sprint scope owned by this skill
- S2-US1 Theming (dark mode)
- S2-US2 PWA installability
- S2-US3 Offline fallback

## Agent breakdown

### Agent F1 — Token Architect
**Goal:** Expand CSS tokens safely for Tailwind v4
**Tasks:**
- Edit `app/globals.css` tokens + dark override
- Extend `@theme inline` mappings
**Output:** token classes usable (`bg-background`, `text-foreground`, `border-border`)

### Agent F2 — SSR Theme + Server Actions
**Goal:** Persist theme + avoid flash
**Tasks:**
- SSR cookie read in `app/layout.tsx`
- `app/actions/theme.ts` set/get theme
**Output:** theme persisted and applied on first paint

### Agent F3 — Toggle UI + Minimal Migration
**Goal:** integrate a toggle without breaking layout
**Tasks:**
- `ThemeToggle` client component (no lucide dependency)
- integrate in `app/(app)/layout.tsx`
- minimal class migration to tokens
**Output:** header toggle works and core pages look correct

### Agent F4 — PWA + Offline
**Goal:** installability + safe offline
**Tasks:**
- `app/manifest.ts` + icons
- offline page + service worker + registration
**Output:** Lighthouse installability + offline fallback without caching private SSR HTML

## Integration order
1) F1 â†’ 2) F2 â†’ 3) F3 â†’ 4) F4
