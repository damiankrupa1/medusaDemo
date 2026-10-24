---
name: launch-apps
description: 'Start the Medusa backend in this repository. Use to launch or verify backend startup; the Nuxt storefront is in a separate repository.'
user-invocable: true
disable-model-invocation: false
---

# Launch the Medusa backend

## When to use

- start the Medusa backend locally;
- verify the project boots before testing or debugging.

The Nuxt storefront is a separate application in the `nuxt-starter-medusa` repository. It is not part of this repository or workspace. Do not use this skill to start or manage the storefront; open its checkout and follow its own instructions.

## Prerequisites

- PostgreSQL and Redis must already be running.
- `pnpm` must be installed.
- Environment variables for the backend must be configured, especially `DATABASE_URL` and `REDIS_URL`.

## Procedure

1. Run the helper script:

```powershell
powershell.exe -NoProfile -File .claude/skills/launch-apps/scripts/start-apps.ps1
```

2. Keep the process open; it is a long-running development server.
3. If the app fails to boot, inspect the terminal output and verify:
   - Postgres is reachable;
   - Redis is reachable;
   - `.env` values are present and valid;
   - dependencies are installed with `pnpm install`.

## Direct command

If you prefer to run without the helper script:

```powershell
pnpm backend:dev
```

## Script reference

The companion launcher is here: [start-apps.ps1](./scripts/start-apps.ps1)
