# Medusa Backend Instructions

## Project

This is the backend of an e-commerce application built with Medusa v2.

Technology stack:

- Medusa v2
- TypeScript
- Node.js
- PostgreSQL
- Redis
- pnpm

The frontend is a separate Nuxt 4 application.

---

# Local Environment

This is a pnpm/turbo monorepo (`apps/backend`, `apps/storefront`). There is
no docker-compose setup in this repo — PostgreSQL and Redis must already be
running locally (or reachable) before starting the backend.

Prerequisites:

- Node.js v22.13+ (see root `engines`)
- PostgreSQL v15+
- Redis (required — `REDIS_URL` is used for the event bus module)
- pnpm v11 (`pnpm@11.5.0`, matches `packageManager` in `package.json`)

Setup:

```bash
pnpm install
cp apps/backend/.env.template apps/backend/.env
# then set DATABASE_URL and REDIS_URL in apps/backend/.env
cd apps/backend
pnpm medusa db:migrate
pnpm medusa user -e admin@test.com -p supersecret
```

Do not assume Postgres/Redis are already running — check before relying on
DB/queue-dependent commands (migrations, dev server, integration tests).

---

# Commands

Run from the repo root unless noted otherwise.

| Purpose | Command |
|---|---|
| Install deps | `pnpm install` |
| Run everything (backend + storefront) | `pnpm dev` |
| Run only backend | `pnpm backend:dev` (or `cd apps/backend && pnpm dev`) |
| Run only storefront | `pnpm storefront:dev` |
| Build everything | `pnpm build` |
| Lint everything | `pnpm lint` |
| Seed backend data | `pnpm backend:seed` |
| Backend unit tests | `cd apps/backend && pnpm test:unit` |
| Backend integration tests (HTTP) | `cd apps/backend && pnpm test:integration:http` |
| Backend integration tests (modules) | `cd apps/backend && pnpm test:integration:modules` |
| Run a migration script | `cd apps/backend && pnpm medusa exec ./src/migration-scripts/<file>.ts` |
| Generate/run DB migrations | `cd apps/backend && pnpm medusa db:generate <module>` / `pnpm medusa db:migrate` |

Notes:

- The backend `package.json` has no standalone `lint` script — `pnpm lint`
  from the root effectively only lints the storefront (`next lint`).
- There is no root/backend `typecheck` script; use `pnpm build` (which runs
  `medusa build`, a full TS compile) to catch type errors, or run `tsc
  --noEmit` inside `apps/backend` directly.
- Always use pnpm through these scripts/turbo — do not call `next`, `medusa`,
  or `jest` through npm/npx.

---

# General Behavior

Act as a senior Medusa v2 backend developer.

When given a task:

1. Inspect the existing implementation first.
2. Understand how the existing Medusa architecture handles the problem.
3. Reuse existing Medusa functionality whenever possible.
4. Implement the solution directly.
5. Run relevant checks and tests.
6. Fix errors you encounter.
7. Continue until the task is complete.

Do not stop at an explanation of what should be done.

Do not ask for confirmation before:

- reading files
- creating files
- editing files
- running pnpm commands
- running tests
- running TypeScript checks
- running migrations when they are required by the requested change
- running the Medusa development server
- inspecting the database schema
- inspecting git status/diff

If the task is clear, execute it.

Only ask for confirmation before destructive or potentially irreversible operations.

Examples:

- dropping database tables
- deleting production data
- resetting the database
- `git reset --hard`
- `git push`
- production deployment
- destructive migrations

---

# Medusa Version

This project uses Medusa v2.

Do NOT use Medusa v1 architecture or patterns.

Do not create:

- `src/services/*.ts` legacy Medusa v1 services
- TypeORM entities
- Medusa v1 workflows
- `@medusajs/workflows-sdk`
- v1-style dependency injection patterns

Use the Medusa v2 framework APIs and conventions.

Medusa v2 uses modules, workflows, API routes, subscribers, scheduled jobs and the Medusa container.

---

# Architecture

Follow this general architecture:

HTTP/API
↓
Workflow
↓
Module / Commerce Module
↓
PostgreSQL / external service

API routes should generally be thin.

Business logic should generally live in workflows.

Domain-specific persistence and service logic should live in modules.

Do not put substantial business logic directly inside API route handlers.

---

# API Routes

Custom API routes belong under:

src/api/

Use:

- `MedusaRequest`
- `MedusaResponse`

Example structure:

src/api/
└── some-feature/
└── route.ts

Prefer:

API Route
→ validate input
→ invoke workflow
→ return response

Do not implement large business processes directly in route handlers.

Use existing Medusa API conventions for:

- authentication
- authorization
- validation
- pagination
- error handling

Do not invent a parallel API architecture.

---

# Workflows

Workflows are the preferred place for business processes that:

- modify data
- interact with multiple modules
- interact with external systems
- require rollback/compensation
- contain multiple business steps

Prefer existing Medusa workflows and steps when they already solve the problem.

Before creating a new workflow:

1. Search the existing project.
2. Check Medusa core workflows.
3. Reuse existing steps where possible.
4. Only create custom logic when necessary.

Workflows should be composed of clear steps.

Prefer small, reusable steps over one huge workflow.

When a step performs a reversible side effect, consider implementing
a compensation function.

---

# Modules

Custom domain functionality should normally be implemented as a module.

Custom modules belong under:

src/modules/

Example:

src/modules/
└── brand/
├── index.ts
├── service.ts
└── models/
└── brand.ts

A module should encapsulate a specific domain or integration.

Examples:

- reviews
- brands
- product translations
- ERP integration
- CMS integration
- external fulfillment integration

Do not create a module simply to move arbitrary code into another directory.

A module should represent a meaningful domain or integration boundary.

---

# Data Models

Use Medusa v2 Data Models.

Do not use TypeORM entities.

Data models belong inside modules:

src/modules/<module>/models/

Use Medusa's data modeling APIs.

Before creating a new model:

1. Check whether an existing Medusa commerce module already provides the data.
2. Check whether the existing model can be extended.
3. Check whether a module link is more appropriate.
4. Only then create a new model.

Avoid duplicating existing Medusa entities.

---

# Services

In Medusa v2, services belong to modules.

Do not create legacy Medusa v1 services under:

src/services/

A module service should manage the module's data models
or encapsulate communication with an external system.

Prefer extending `MedusaService` when appropriate.

Keep services focused on domain/data access.

Do not move business workflows into services merely because the service
is convenient.

Business orchestration belongs in workflows.

---

# Module Links

When two separate modules need a relationship, prefer a Module Link
when appropriate instead of tightly coupling the modules.

Before adding a direct database relationship between domains:

1. Check whether a Module Link is more appropriate.
2. Check existing Medusa patterns.
3. Preserve module boundaries.

Do not bypass Medusa's module architecture just to make querying easier.

---

# Commerce Modules

Before implementing custom functionality, check whether Medusa already
provides a relevant commerce module.

Relevant modules may include:

- Product
- Cart
- Order
- Customer
- Pricing
- Promotion
- Inventory
- Fulfillment
- Payment
- Region
- Sales Channel
- Stock Location
- Tax
- User
- API Key
- Store

Prefer extending or composing existing functionality rather than
duplicating it.

---

# Querying Data

Prefer Medusa's supported data/query mechanisms.

Do not access PostgreSQL directly from API routes unless there is a
specific architectural reason.

Do not bypass modules simply because direct SQL appears easier.

When data from multiple modules is required, investigate whether
Medusa's Query / Module Links / workflows provide a better solution.

---

# Database

PostgreSQL is the primary database.

Do not introduce MongoDB.

Do not create ad-hoc database tables outside Medusa's module/data-model
architecture.

Database schema changes must be represented by proper Medusa migrations.

Never silently modify production data.

Never execute destructive database operations unless explicitly requested.

---

# Migrations

When a data model changes:

1. Inspect the current model.
2. Determine whether a migration is required.
3. Generate the appropriate Medusa migration.
4. Inspect the generated migration.
5. Run it locally when appropriate.
6. Verify the resulting schema.

Do not manually modify migration history to hide problems.

Do not delete existing migrations just to make the migration system pass.

---

# Validation

Validate external input at the API boundary.

Use the project's existing validation approach.

Do not trust request bodies.

Do not duplicate validation in every layer unnecessarily.

Keep domain/business validation inside the appropriate workflow/domain layer
when it is not specific to HTTP.

---

# Authentication and Authorization

Respect Medusa's existing authentication and authorization mechanisms.

Do not implement custom authentication if Medusa already provides the
required mechanism.

Do not expose admin functionality through public/store routes.

Before creating a custom endpoint, determine whether it should be:

- Store API
- Admin API
- authenticated custom API
- public API
- internal-only functionality

Security takes priority over convenience.

---

# Admin

The Medusa Admin is separate from the storefront.

Do not modify the Admin unless the task explicitly concerns Admin
functionality.

For Admin customizations, follow Medusa v2 Admin extension conventions.

Do not implement Admin functionality inside Store API routes.

---

# Subscribers

Subscribers should react to Medusa events.

Prefer:

Event
→ Subscriber
→ Workflow

instead of putting substantial business logic directly into a subscriber.

Subscribers should remain thin.

If an operation can benefit from workflow rollback/retry semantics,
implement the operation as a workflow and invoke it from the subscriber.

---

# Scheduled Jobs

Use scheduled jobs for recurring background operations.

Examples:

- synchronization
- cleanup
- periodic imports
- external API synchronization
- scheduled notifications

Do not implement recurring tasks using setInterval or similar mechanisms
inside arbitrary application code.

---

# External Integrations

External services should be isolated behind a module when appropriate.

Examples:

- InPost
- ERP
- CMS
- payment provider
- shipping provider
- external product database

Do not scatter external API calls throughout workflows and API routes.

Prefer:

Workflow
→ Module
→ External API

The module should encapsulate authentication, API communication and
provider-specific details.

---

# Error Handling

Use Medusa's existing error handling mechanisms.

Do not silently swallow errors.

Do not return HTTP 200 for failed operations.

Errors should contain useful information for debugging without exposing
secrets or internal credentials.

---

# Environment Variables

Never hardcode:

- API keys
- passwords
- tokens
- database credentials
- private URLs containing credentials
- secrets

Use environment variables.

Never commit `.env` files or secrets.

Do not print secrets to logs.

---

# Logging

Use the Medusa logger/container logging facilities.

Logs should help diagnose:

- external API failures
- synchronization problems
- workflow failures
- unexpected states

Do not log:

- passwords
- API tokens
- access tokens
- payment information
- other secrets

---

# Testing

When changing backend functionality:

1. Identify the appropriate test level (unit vs. integration:http vs.
   integration:modules — see the [Commands](#commands) section).
2. Run the relevant `pnpm test:*` script inside `apps/backend`.
3. Add tests for new business logic when practical.
4. Run `pnpm build` inside `apps/backend` (or `tsc --noEmit`) to catch
   TypeScript errors — there is no separate `typecheck` script.
5. Run `pnpm lint` when the change touches the storefront (the backend has
   no lint script configured).

Prefer testing workflows and domain behavior rather than only HTTP
implementation details.

---

# Debugging

When something fails:

Do not immediately rewrite the implementation.

First:

1. Read the complete error.
2. Locate the failing layer.
3. Inspect relevant Medusa code.
4. Check configuration.
5. Check module registration.
6. Check workflow inputs/outputs.
7. Check database state if relevant.
8. Reproduce the problem.
9. Fix the root cause.
10. Verify the fix.

Do not hide errors by adding broad try/catch blocks.

---

# Dependencies

Use pnpm.

Do not use npm or yarn.

Before adding a dependency:

1. Check whether the project already has equivalent functionality.
2. Check whether Medusa provides the functionality.
3. Prefer existing dependencies.
4. Add a new dependency only when justified.

---

# Code Quality

Prefer simple code over unnecessary abstractions.

Do not introduce:

- generic repositories without a concrete need
- unnecessary factories
- unnecessary service layers
- excessive utility functions
- speculative abstractions
- duplicate API clients

Follow the existing project structure.

Do not refactor unrelated code while implementing a feature.

---

# Repository Pattern

Do not introduce a repository pattern automatically.

Medusa modules and services already provide the primary data-access
abstraction.

Only introduce a repository abstraction if there is a concrete,
documented architectural reason.

---

# Product Data

Product-related functionality should first use Medusa's Product Module.

Before creating custom product tables:

1. Inspect Medusa's Product Module.
2. Determine whether custom fields can solve the requirement.
3. Consider a custom module if the data represents a separate domain.
4. Consider a module link if the data belongs to another domain.

Do not duplicate products, variants, prices or inventory in custom tables.

---

# Translations

For product/content translations:

First inspect the existing Medusa Translation Module and current project
architecture.

Do not create arbitrary translation columns for every language unless
there is a clear architectural reason.

Keep translation data separated from the core product model when the
translation represents an independent concern.

---

# Sales Channels

Respect Medusa's Sales Channel model.

Do not assume a product belongs to one global sales channel.

When working with carts, products, inventory or pricing, inspect the
existing Sales Channel relationships and workflows.

---

# InPost / Shipping

If integrating InPost or another shipping provider:

Do not spread provider-specific logic through:

- API routes
- products
- orders
- carts

Keep provider-specific functionality isolated behind the appropriate
Medusa module/provider architecture.

---

# Frontend Integration

The frontend is Nuxt 4.

The backend should expose clean, predictable APIs.

Do not introduce frontend-specific hacks into the backend.

Do not return data in a format designed only to accommodate a particular
Vue component unless there is a strong API design reason.

The Nuxt application should consume Medusa APIs rather than bypassing
the public API architecture.

---

# Before Creating Anything

Before creating a new:

- module
- model
- service
- workflow
- API route
- subscriber
- job
- migration

search the project first.

Then check Medusa's existing capabilities.

Prefer reuse over duplication.

---

# Important Rule

When there is a conflict between:

"quickly make this work"

and

"preserve Medusa's architecture"

prefer preserving the architecture.

The backend should remain understandable and maintainable as the
e-commerce system grows.

---

# Completion Criteria

A task is not complete merely because code was written.

A task is complete when:

- the implementation is present
- the architecture is consistent with Medusa v2
- TypeScript errors are resolved
- relevant tests pass
- relevant linting passes
- migrations are handled when required
- the resulting behavior has been verified

If verification fails, investigate and fix the problem rather than
simply reporting the failure.
