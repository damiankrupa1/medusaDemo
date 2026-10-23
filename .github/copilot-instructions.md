# Copilot instructions

[CLAUDE.md](../CLAUDE.md) is this repository's canonical guide for AI
assistants: the project, its commands and the rules for changing it. Read it
before working on a task and follow it. This file only summarizes what
matters most, for contexts that don't open linked files. If the two ever
disagree, CLAUDE.md wins.

## Project

- Backend of an e-commerce store on **Medusa v2** (TypeScript, Node.js
  v22.13+, PostgreSQL 15+, Redis, pnpm 11) in a pnpm/turbo monorepo:
  `apps/backend`, `apps/storefront`. The Nuxt 4 storefront is a separate
  application that consumes the Medusa APIs.
- PostgreSQL and Redis must already be running. Check before running
  migrations, the dev server or integration tests.

## Commands

Use pnpm and the package scripts - never npm, yarn, or `next`/`medusa`/`jest`
through npx.

| Purpose | Command |
|---|---|
| Install | `pnpm install` |
| Backend dev server | `pnpm backend:dev` |
| Backend unit tests | `cd apps/backend && pnpm test:unit` |
| Backend integration tests | `cd apps/backend && pnpm test:integration:http` or `pnpm test:integration:modules` |
| Type check | `cd apps/backend && pnpm build`, or `tsc --noEmit` there (no `typecheck` script) |
| Migrations | `cd apps/backend && pnpm medusa db:generate <module>`, then `pnpm medusa db:migrate` |

The backend has no lint script; `pnpm lint` at the root only lints the
storefront.

## Rules that are easy to get wrong

- Medusa v2 only: no v1 services in `src/services`, no TypeORM entities, no
  `@medusajs/workflows-sdk`.
- Keep the layers: a thin API route in `src/api` (`MedusaRequest` /
  `MedusaResponse`, input validated at the boundary) invokes a workflow made
  of small steps with compensation where a step has side effects; domain
  data and services live in modules under `src/modules` (Medusa data models,
  `MedusaService`). Subscribers and scheduled jobs stay thin and call
  workflows.
- Reuse Medusa's commerce modules and core workflows before writing custom
  ones. Relate modules through module links and read across them with Query,
  not raw SQL.
- Schema changes only through generated Medusa migrations; never edit or
  delete existing migrations.
- External services (InPost, ERP, CMS, ...) stay behind a module or provider.
- Never hardcode or log secrets, never commit `.env` files, and keep Admin
  functionality out of Store routes.
- Ask before destructive or irreversible operations: dropping tables,
  resetting the database, `git reset --hard`, `git push`, deployments.

## Workflows

These are written as Claude Code commands; follow them in Copilot too. When
the user invokes one of them, its rules take precedence over the General
Behavior section of CLAUDE.md for the duration of that task. The
[commands index](../.claude/README.md) lists all of them - also reviews
of changes, architecture and deploy readiness, systematic debugging, Medusa
feature work, accessibility and Figma-to-code. The two that apply most often:

- [controlled-work](../.claude/commands/controlled-work.md): when the
  user asks for it, agree on the planned changes and on every verification
  command (tests, lint, typecheck, build) before running anything.
- [safe-commit](../.claude/commands/safe-commit.md): commit only when
  the user asks, stage files by explicit path (never `git add .`, `git add
  -A` or `git commit -a`), and commit only after the user approves the exact
  files and message. Never push without a separate approval.
