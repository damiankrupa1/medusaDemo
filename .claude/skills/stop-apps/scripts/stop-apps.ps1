$ErrorActionPreference = 'Stop'

$processPatterns = @(
    'pnpm backend:dev',
    'medusa develop',
    'turbo dev --filter=@dtc/backend'
)

$allPids = New-Object System.Collections.Generic.HashSet[int]

foreach ($pattern in $processPatterns) {
    $matches = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and $_.CommandLine -match [regex]::Escape($pattern)
    }

    foreach ($match in $matches) {
        [void]$allPids.Add([int]$match.ProcessId)
    }
}

if ($allPids.Count -eq 0) {
    Write-Host 'No matching backend dev processes were found.'
    exit 0
}

Write-Host 'Stopping backend processes.'
foreach ($processId in $allPids | Sort-Object) {
    Write-Host "Stopping PID $processId"
    Stop-Process -Id $processId -Force
}

Write-Host 'Done.'
