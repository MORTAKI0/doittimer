#!/bin/bash
# Run after meaningful changes to verify the project is clean
set -e
echo "→ Linting..."
pnpm lint
echo "→ Type checking..."
pnpm typecheck
echo "→ Build check..."
pnpm build --dry-run 2>/dev/null || pnpm build
echo "✓ All checks passed."
