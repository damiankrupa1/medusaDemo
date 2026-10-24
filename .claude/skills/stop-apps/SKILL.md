---
name: stop-apps
description: 'Stop the local Medusa backend dev process. Use when you need to shut down the backend or free its port; the Nuxt storefront is in a separate repository.'
user-invocable: true
disable-model-invocation: false
---

# Stop the local Medusa backend

## When to use

- stop the Medusa backend;
- free local ports after debugging or testing.

The Nuxt storefront is a separate application in the `nuxt-starter-medusa` repository. This skill only stops the backend in this repository. Stop the storefront from its own checkout using that repository's instructions.

## Procedure

1. Run the helper script:

```powershell
powershell.exe -NoProfile -File .claude/skills/stop-apps/scripts/stop-apps.ps1
```

2. Confirm the backend process closed and its port is released.
3. If the backend still appears active, inspect the running process list and repeat the check.

## Direct command

```powershell
# Stop the backend
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'pnpm backend:dev|medusa develop|turbo dev --filter=@dtc/backend' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## Script reference

The companion launcher is here: [stop-apps.ps1](./scripts/stop-apps.ps1)
