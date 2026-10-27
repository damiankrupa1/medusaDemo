# Medusa Backend Instructions

## Project overview

This repository contains the Medusa v2 backend. The maintained Nuxt storefront is a separate application in the `nuxt-starter-medusa` repository.

Core stack:

- Medusa v2
- TypeScript
- Node.js 22.13+
- PostgreSQL 15+
- Redis
- pnpm 11

Relevant folders:

- `apps/backend`

This checkout may also contain an old/template `apps/storefront` directory. It is not the maintained storefront, even if its files or package scripts describe a different framework. Do not use it as the source of truth or change it for storefront requests unless the user explicitly asks to work on that legacy/template code.

For storefront or full-stack tasks, first establish whether the `nuxt-starter-medusa` checkout is available. Make frontend changes only in that repository, and read its own agent instructions and package scripts before editing or validating it. If its checkout is not available, do not substitute `apps/storefront` or infer the external app's implementation; ask the user for the checkout path or clearly limit work to this backend.

Notes:

- PostgreSQL and Redis must be running before backend startup, migrations, or integration tests.
- Prefer project scripts and package-level workflows over ad-hoc commands.

---

## Required operating rules

These are the highest-priority rules. Follow them before anything else.

1. Use Medusa v2 patterns only.
   - No legacy `src/services/*.ts` patterns.
   - No TypeORM entities.
   - No Medusa v1 workflows.
   - No `@medusajs/workflows-sdk`-style architecture unless Medusa explicitly requires it.

2. Keep layers clean.
   - HTTP handler in `src/api` validates input and invokes a workflow.
   - Workflow owns orchestration and business logic.
   - Module / commerce module owns persistence and domain logic.
   - External systems remain behind a module or provider boundary.

3. Reuse before adding custom logic.
   - Check existing commerce modules and Medusa core workflows first.
   - Prefer module links and query APIs over raw SQL when combining domains.

4. Protect architecture from “quick fix” shortcuts.
   - Prefer maintainable Medusa patterns over the fastest local workaround.

5. Treat infrastructure and data as production-grade.
   - Use env vars, never hardcode secrets.
   - Only use Medusa-generated migrations.
   - Do not silently modify production data.

6. Verify before claiming success.
   - Run the smallest relevant validation.
   - Fix the root cause, not just the symptom.

---

## Local environment

This repo is a pnpm/turbo monorepo. PostgreSQL and Redis must already be running before relying on DB- or queue-related commands.

Typical setup:

```bash
pnpm install
cp apps/backend/.env.template apps/backend/.env
# set DATABASE_URL and REDIS_URL in apps/backend/.env
cd apps/backend
pnpm medusa db:migrate
pnpm medusa user -e admin@test.com -p supersecret
```

Never assume Postgres/Redis are ready. Check before running migrations, the dev server, or integration tests.

---

## Commands

Run from repo root unless noted otherwise.

| Purpose | Command |
|---|---|
| Install deps | `pnpm install` |
| Run backend only | `pnpm backend:dev` |
| Build configured workspace packages | `pnpm build` |
| Lint configured workspace packages | `pnpm lint` |
| Seed backend data | `pnpm backend:seed` |
| Backend unit tests | `cd apps/backend && pnpm test:unit` |
| Backend integration tests (HTTP) | `cd apps/backend && pnpm test:integration:http` |
| Backend integration tests (modules) | `cd apps/backend && pnpm test:integration:modules` |
| Run migration script | `cd apps/backend && pnpm medusa exec ./src/migration-scripts/<file>.ts` |
| Generate/run migrations | `cd apps/backend && pnpm medusa db:generate <module>` / `pnpm medusa db:migrate` |

Notes:

- The backend package has no standalone lint script. Root lint/build/dev behavior is controlled by the packages currently configured in this checkout; it does not operate on the external Nuxt storefront.
- There is no root/backend typecheck script; use `pnpm build` or `tsc --noEmit` in `apps/backend`.
- Prefer `pnpm` scripts over `npm`, `yarn`, or direct `jest`/`medusa`/`next` invocation.
- Root workspace commands may operate on a legacy/template storefront directory in this checkout, but do not start, build, or lint the separately checked-out Nuxt storefront.
- Do not use this repository's scripts or packages, including the legacy/template storefront, to infer the Nuxt app's commands, framework setup, ports, or implementation details.

---

## Decision guide

Use this mental model when deciding where logic belongs.

### API route (`src/api`)
Use for:

- request validation
- auth/authorization checks at the boundary
- calling a workflow
- returning an HTTP response

Do not do:

- business orchestration
- multi-step transactional logic
- database/domain logic

### Workflow
Use for:

- data changes
- multiple modules or services interacting
- external integrations
- compensation / rollback logic
- long multi-step business flows

Prefer small, composable steps over a single large workflow.

### Module / commerce module
Use for:

- domain data and persistence
- service logic tied to one concern
- integration with external providers
- encapsulated reusable behavior

Prefer Medusa modules and commerce modules over custom ad-hoc code.

### Module link / query
Use for:

- relationships between domains
- reading across modules without bypassing architecture

Prefer this instead of direct cross-table hacks.

### Service
Use only inside a module, and only for focused domain logic. Do not use services as a place to hide workflow orchestration.

---

## Hard requirements

### Architecture

- Keep API routes thin.
- Keep orchestration in workflows.
- Keep domain logic in modules.
- Keep subscribers and scheduled jobs thin; they should call workflows, not contain business logic.

### Data and schema

- Use Medusa v2 data models.
- Do not create TypeORM entities.
- Do not create ad-hoc DB tables outside the Medusa module/data-model model.
- Use generated Medusa migrations for schema changes.
- Do not delete or rewrite migration history to hide problems.
- Do not introduce MongoDB or other non-project database patterns.

### Product and commerce data

- Prefer existing Medusa commerce modules before creating custom domains.
- Before adding a custom table, check whether a custom field, module link, or custom module is more appropriate.
- Do not duplicate product, variant, price, or inventory data across custom tables.

### Integrations and external systems

- Isolate provider logic behind modules.
- Do not spread provider-specific code through product/order/cart APIs.
- Keep external callers behind a module boundary.

### Security and configuration

- Never hardcode API keys, passwords, tokens, or DB credentials.
- Never commit `.env` files or secrets.
- Respect Medusa auth/authorization conventions.
- Do not expose admin functionality on public/store routes.

### Admin customizations (`apps/backend/src/admin`)

- Call this backend's API from widgets and routes with `sdk.client.fetch` from `src/admin/lib/sdk.ts` (`@medusajs/js-sdk`). Do not write a bare `fetch` or a local `fetchJson` helper.
- Import across admin folders with the root alias (`@/admin/lib/sdk` = `src/admin/lib/sdk`) instead of `../../`. It is configured in `tsconfig.json`, `src/admin/tsconfig.json` and `admin.vite` in `medusa-config.ts`. It works only in admin code: server code (`src/api`, `workflows`, `modules`, ...) is compiled by plain `tsc`, which does not rewrite aliases, so it keeps relative imports. Existing files are migrated gradually.
- Keep endpoint paths, query keys and cache options out of components: wrap them in a hook in `src/admin/hooks/` (e.g. `usePayloadSsoUrl`) and let the component only render. No extra service/repository layer on top of the SDK.
- Pass `body` and `query` as objects (the SDK encodes them); errors surface as `FetchError` with the API's message.
- In new code, read data with `useQuery` and write with `useMutation` from `@tanstack/react-query`. The localized-slugs widget still uses `useEffect` + `useState` with its paths inline; move it to hooks only when it is changed for another reason.
- Put user-facing strings in `src/admin/i18n/json/en.json` and `pl.json` (same keys in both) and read them with `useTranslation()`.
- Add admin dependencies to `apps/backend/package.json` from the repo root (`pnpm --filter=@dtc/backend add <pkg>@<exact version>`). The root `pnpm-lock.yaml` is the one the Docker build uses.

### Validation and error handling

- Validate inputs at the API boundary.
- Do not trust request bodies.
- Prefer Medusa error handling patterns.
- Do not silently swallow errors.
- Do not return HTTP 200 for failed operations.

---

## Must vs should

### Must

- Preserve Medusa v2 architecture and layering.
- Reuse existing Medusa capabilities before creating new custom code.
- Keep routes thin and workflows explicit.
- Use generated migrations for schema changes.
- Validate input at the boundary.
- Verify relevant tests/builds before completion.

### Should

- Prefer small, readable modules and steps.
- Prefer query/module links instead of raw SQL if it preserves architecture.
- Prefer existing modules and utilities before new abstractions.
- Prefer simple code over speculative design.

---

## Before creating anything

Before adding a new:

- module
- model
- service
- workflow
- API route
- subscriber
- job
- migration

check:

1. whether the project already has equivalent functionality;
2. whether Medusa already provides the capability;
3. whether a module link or existing module can solve the problem;
4. whether the design preserves the request → workflow → module architecture.

---

## Testing and verification

When changing backend functionality:

1. Determine the smallest relevant test scope.
2. Run the matching backend command (`unit`, `integration:http`, or `integration:modules`).
3. Add or update tests for new business logic when practical.
4. Run a TypeScript/build check when needed.
5. Run storefront checks only in the separate `nuxt-starter-medusa` checkout, and only when the requested change touches that application.

Prefer workflow/domain-level validation over HTTP-only checks.

---

## Debugging

Do not rewrite blindly when a bug appears. Follow a root-cause flow:

1. Read the full error.
2. Locate the failing layer.
3. Inspect the relevant Medusa code and configuration.
4. Check registrations, inputs, outputs, and state.
5. Reproduce or validate the problem.
6. Fix the root cause.
7. Verify the final behavior.

Do not hide errors with broad `try/catch` blocks.

---

## Operational safety

Only ask for confirmation before destructive or irreversible operations, such as:

- dropping database tables
- deleting production data
- resetting the database
- `git reset --hard`
- `git push`
- production deployment
- destructive migrations

For regular file edits, reads, tests, or migrations required by the task, do not stop to ask for approval unless the task is otherwise unclear.

---

## Completion criteria

A task is complete only when:

- the implementation is present;
- the architecture remains consistent with Medusa v2;
- TypeScript/build checks pass where relevant;
- relevant tests pass;
- necessary migrations are handled correctly;
- the final behavior has been verified in context.

If verification fails, investigate and fix the root cause instead of reporting a false success.
