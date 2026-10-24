$ErrorActionPreference = 'Stop'

$check = @{
    Url = 'http://localhost:9000/health'
    ProcessPatterns = @(
        'pnpm backend:dev',
        'medusa develop',
        'turbo dev --filter=@dtc/backend'
    )
}

Add-Type -AssemblyName System.Net.Http
$httpClient = [System.Net.Http.HttpClient]::new()
$httpClient.Timeout = [TimeSpan]::FromSeconds(3)
$failed = $false

try {
    $processes = Get-CimInstance Win32_Process
    $matchingProcesses = @($processes | Where-Object {
        $commandLine = $_.CommandLine
        $commandLine -and ($check.ProcessPatterns | Where-Object {
            $commandLine -match [regex]::Escape($_)
        })
    })

    if ($matchingProcesses.Count -gt 0) {
        $processIds = ($matchingProcesses | ForEach-Object { $_.ProcessId }) -join ', '
        Write-Host "[backend] Development process: found (PID $processIds)"
    }
    else {
        Write-Host '[backend] Development process: not found'
    }

    $port = ([uri]$check.Url).Port
    $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    $listenerFound = @($listeners | Where-Object { $_.Port -eq $port }).Count -gt 0

    if (-not $listenerFound) {
        Write-Host "[backend] HTTP: unavailable (no listener on port $port)"
        $failed = $true
    }
    else {
        try {
            $response = $httpClient.GetAsync($check.Url).GetAwaiter().GetResult()
            $statusCode = [int]$response.StatusCode
            $response.Dispose()

            if ($statusCode -ge 200 -and $statusCode -lt 400) {
                Write-Host "[backend] HTTP: available ($statusCode) at $($check.Url)"
            }
            else {
                Write-Host "[backend] HTTP: unavailable (HTTP $statusCode) at $($check.Url)"
                $failed = $true
            }
        }
        catch [System.Net.Http.HttpRequestException] {
            Write-Host "[backend] HTTP: unavailable at $($check.Url) ($($_.Exception.Message))"
            $failed = $true
        }
        catch [System.Threading.Tasks.TaskCanceledException] {
            Write-Host "[backend] HTTP: timed out at $($check.Url)"
            $failed = $true
        }
    }
}
finally {
    $httpClient.Dispose()
}

if ($failed) {
    exit 1
}
