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

## UI

* render state
* trigger reads and mutations
* should not know backend implementation details

## Actions / Route Handlers / Loaders

* parse request/form data
* call validation
* invoke service
* map response shape for caller

## Services

* enforce business rules
* coordinate repositories
* handle domain logic
* should not contain UI formatting concerns

## Repositories / Clients

* talk to database or external APIs
* keep transport details isolated
* return raw or semi-raw data suitable for mapping

# Core Rules

## 1) Centralize fetching

* do not scatter raw fetch calls across many components
* prefer feature server functions or repository modules

## 2) Map contracts explicitly

* raw backend shape is not always UI shape
* use DTOs or mapping helpers
* keep UI from depending on unstable external fields

## 3) Normalize errors

Translate low-level failures into stable app-facing categories:

* validation
* unauthorized
* forbidden
* not found
* conflict
* unexpected failure

## 4) Keep auth near the server boundary

* do not trust client-supplied ownership or role claims
* derive user context server-side where possible

## 5) Make pagination, sort, and filter contracts explicit

* define expected params
* validate them
* keep response metadata consistent

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

Flag:

* UI components calling raw backend everywhere
* duplicated request logic
* mixed transport and business rules
* leaking database entities into UI
* inconsistent error handling
* no contract around pagination or filter params

# Output Style

When asked to design or refactor data layer:

1. show the proposed layers
2. define responsibility per layer
3. suggest file placement
4. provide example data flow
5. point out where to validate and map data
