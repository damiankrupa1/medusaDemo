$ErrorActionPreference = 'Stop'

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw 'pnpm is not installed or not available on PATH.'
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Set-Location $repoRoot

Write-Host 'Launching the Medusa backend'
Write-Host "Repo root: $repoRoot"

$backendArgs = @('-NoLogo', '-NoExit', '-Command', "Set-Location '$repoRoot'; pnpm backend:dev")
Start-Process powershell.exe -ArgumentList $backendArgs | Out-Null
Write-Host 'Backend started in a separate PowerShell window.'
