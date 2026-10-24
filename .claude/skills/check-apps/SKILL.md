---
name: check-apps
description: 'Check whether the local Medusa backend is running and responding over HTTP. Use to diagnose backend startup; the Nuxt storefront is in a separate repository.'
user-invocable: true
disable-model-invocation: false
---

# Check the local Medusa backend

## When to use

- check whether the backend is running;
- verify that the backend responds over HTTP;
- diagnose backend startup before testing or browser work.

The Nuxt storefront is a separate application in the `nuxt-starter-medusa` repository. This skill only checks the backend in this repository. Check the storefront from its own checkout using that repository's instructions.

## Procedure

1. Run the helper script:

```powershell
powershell.exe -NoProfile -File .claude/skills/check-apps/scripts/check-apps.ps1
```

2. The script reports matching backend development processes and HTTP availability at `http://localhost:9000/health`.
3. If the backend is unavailable, inspect its launch terminal and check the required environment and dependencies. The backend requires reachable PostgreSQL and Redis.

The script exits with code `1` if the backend is unavailable and code `0` when it responds successfully or redirects.

## Script reference

The companion checker is here: [check-apps.ps1](./scripts/check-apps.ps1)
