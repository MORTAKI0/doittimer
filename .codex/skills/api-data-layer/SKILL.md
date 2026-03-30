---
name: api-data-layer
description: Designs clean API and data access layers with service/repository separation. Use when structuring fetch logic, route handlers, server actions, or backend integration.
---

# Objective

Prevent data access sprawl by introducing clear boundaries, predictable contracts, and reusable server-side data flows.

# Layering Model

Use this default layering:

```text
ui
  -> action / route / loader
    -> service
      -> repository / client
        -> external api / database
```

# Responsibilities
- UI: render state and trigger reads/mutations
- Actions/Route Handlers/Loaders: parse, validate, invoke services, map response shapes
- Services: enforce business rules
- Repositories/Clients: isolate transport and data access

# Folder Pattern

```text
src/features/orders/
  server/
    get-orders.ts
    create-order.ts
  actions/
    create-order-action.ts
  services/
    order-service.ts
  repositories/
    order-repository.ts
  mappers/
    order-dto.ts
  types/
    order.ts
```

Adjust naming to fit the repo, but keep responsibilities separate.

# Review Checklist
Flag raw backend calls in UI, duplicated request logic, leaked entities, and inconsistent error handling.

# Output Style

When asked to design or refactor data layer:

1. show the proposed layers
2. define responsibility per layer
3. suggest file placement
4. provide example data flow
5. point out where to validate and map data
