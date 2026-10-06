# Starts Shop AI (development mode: the sample restaurant and demo logins are created on the first start) and opens the browser.
#   -CheckOnly   run the checks and stop (for tests)
#   -NoBrowser   do not open the browser
param([switch]$CheckOnly, [switch]$NoBrowser, [switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')

$base = 'http://localhost:' + $script:Port
$diner = $base + '/r/golden-lotus?t=5'
$code = 0
try {
    if (-not (Test-NodeOk)) { throw 'Node.js 22.13 or newer is not installed. Double-click setup-windows.bat first.' }
    if (-not (Test-Path (Join-Path $script:AppDir 'node_modules'))) { throw 'The app packages are not installed yet. Double-click setup-windows.bat first.' }

    if (Test-PortBusy $script:Port) {
        Ok ('Shop AI (or another program) is already using port ' + $script:Port + '.')
        if (-not $CheckOnly -and -not $NoBrowser) { Start-Process $diner }
        Say ('  Opened ' + $diner)
        Say '  If the page does not load, double-click stop.bat and start.bat again.'
        Wait-ForExit -NoPause:$NoPause
        exit 0
    }

    # The AI is optional: try to start Ollama if it is installed but not running.
    if (Test-Cmd 'ollama') {
        if (-not (Test-OllamaUp)) {
            Say '  Starting Ollama (the AI)...'
            if (-not $CheckOnly) {
                Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden
                for ($i = 0; $i -lt 10 -and -not (Test-OllamaUp); $i++) { Start-Sleep -Seconds 1 }
            }
        }
        if (Test-OllamaUp) { Ok 'The AI (Ollama) is running' } else { Warn 'The AI is not running. The app still works; open questions will say "AI unavailable".' }
    } else {
        Warn 'Ollama (the AI) is not installed. The app still works; open questions will say "AI unavailable".'
    }

    if ($CheckOnly) { Ok 'Checks passed. Would start the app now.'; Wait-ForExit -NoPause:$NoPause; exit 0 }

    Say ''
    Say 'Starting Shop AI. The first start takes about a minute. Keep this window open;'
    Say 'close it (or double-click stop.bat) to stop the app.'
    Say ''
    Say ('  Diner page : ' + $diner)
    Say ('  Owner      : ' + $base + '/login      demo@shop.ai / demo1234')
    Say ('  Staff      : ' + $base + '/staff      restaurant golden-lotus, PIN 1111 (waiter) or 2222 (chef)')
    Say '  (These demo logins exist only in this development mode.)'
    Say ''

    if (-not $NoBrowser) {
        # A small hidden helper waits until the page answers, then opens the browser.
        $waiter = "for (`$i = 0; `$i -lt 240; `$i++) { try { Invoke-WebRequest -Uri '$base/' -UseBasicParsing -TimeoutSec 2 | Out-Null; Start-Process '$diner'; break } catch { Start-Sleep -Seconds 1 } }"
        $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($waiter))
        Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', $enc)
    }

    Push-Location $script:AppDir
    try { & npm run dev } finally { Pop-Location }
} catch {
    $code = 1
    Write-Host ''
    Write-Host ('  [FIX]   ' + $_.Exception.Message) -ForegroundColor Red
}
Wait-ForExit -NoPause:$NoPause
exit $code
