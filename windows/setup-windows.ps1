# One-time setup for Windows: installs Node.js, (optionally) Ollama and the AI model, and the app's packages.
#   -SkipAI    do not install Ollama or the model (the app still works; open questions show "AI unavailable")
#   -WithAI    install Ollama and the model without asking
#   -DryRun    only check and print what would be done (changes nothing)
#   -NoPause   do not wait for Enter at the end (for scripts and tests)
param([switch]$SkipAI, [switch]$WithAI, [switch]$DryRun, [switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')

$ExitCode = 0
Say ''
Say 'Shop AI - Windows setup'
Say '======================='
if ($DryRun) { Warn 'Dry run: nothing will be installed or downloaded.' }

function Install-WithWinget ([string]$Id, [string]$Label) {
    if ($DryRun) { Info ('Would run: winget install -e --id ' + $Id); return }
    if (-not (Test-Cmd 'winget')) { throw ($Label + ' is missing and winget (the Windows installer tool) was not found. See windows\README-WINDOWS.md for the download link.') }
    Say ('  Installing ' + $Label + ' (Windows may ask you to allow it; click Yes)...')
    & winget install -e --id $Id --silent --accept-package-agreements --accept-source-agreements | Out-Host
    Update-SessionPath
}

try {
    # ------------------------------------------------------------------ 1. computer
    Step 'Step 1 of 5: checking your computer'
    $ram = Get-RamGB
    $free = Get-FreeGB $script:RepoRoot
    Ok "Memory $ram GB, free disk space $free GB"
    if ($free -lt 6 -and -not $SkipAI) { Warn 'Less than 6 GB free: the AI model (about 9 GB) will not fit. Choose "no" for the AI below.' }

    # ------------------------------------------------------------------ 2. node
    Step 'Step 2 of 5: Node.js (runs the app)'
    if (Test-NodeOk) { Ok ('Node.js ' + (Get-NodeVersion).ToString() + ' is already installed') }
    else {
        Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js (LTS)'
        if (-not $DryRun) {
            if (Test-NodeOk) { Ok ('Node.js ' + (Get-NodeVersion).ToString() + ' installed') }
            else { throw 'Node.js 22.13 or newer is still not available. Close this window, open it again and run setup-windows.bat once more.' }
        }
    }

    # ------------------------------------------------------------------ 3. ai
    Step ('Step 3 of 5: the AI (Ollama and the model ' + $script:Model + ')')
    $wantAI = $false
    if ($SkipAI) { Info 'Skipping the AI (-SkipAI).' }
    elseif ($WithAI) { $wantAI = $true }
    elseif ($DryRun -or $NoPause) { Info 'Not asking in dry-run or no-pause mode: skipping the AI.' }
    else {
        Say '  The AI waiter answers open questions. It needs about 9 GB of download and a laptop with 16 GB of memory.'
        Say '  Rule-based answers (allergens, prices, orders) work without it.'
        if ($ram -lt 16) { Warn "This computer has $ram GB. The AI would be slow here; the usual answer is no." }
        $wantAI = Confirm-Choice '  Install the AI on this computer?' ($ram -ge 16)
    }
    if ($wantAI) {
        if (-not (Test-Cmd 'ollama')) {
            Install-WithWinget 'Ollama.Ollama' 'Ollama'
            if (-not $DryRun -and -not (Test-Cmd 'ollama')) {
                $guess = Join-Path $env:LOCALAPPDATA 'Programs\Ollama'
                if (Test-Path (Join-Path $guess 'ollama.exe')) { $env:Path = $env:Path + ';' + $guess }
            }
        } else { Ok 'Ollama is already installed' }
        if (-not $DryRun) {
            if (-not (Test-Cmd 'ollama')) { throw 'Ollama is still not available. Close this window, open it again and run setup-windows.bat once more.' }
            if (-not (Test-OllamaUp)) {
                Say '  Starting Ollama...'
                Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Hidden
                for ($i = 0; $i -lt 20 -and -not (Test-OllamaUp); $i++) { Start-Sleep -Seconds 1 }
            }
            if (-not (Test-OllamaUp)) { throw 'Ollama did not start. Open "Ollama" from the Start menu, then run setup-windows.bat again.' }
            if (Test-ModelPulled $script:Model) { Ok ('The model ' + $script:Model + ' is already downloaded') }
            else {
                Say ('  Downloading the model ' + $script:Model + ' (about 9 GB, this can take a long time; you can leave it running)...')
                & ollama pull $script:Model | Out-Host
                if ($LASTEXITCODE -ne 0) { throw ('The model download failed. Check your internet connection and run: ollama pull ' + $script:Model) }
                Ok 'Model downloaded'
            }
        } else { Info ('Would run: ollama pull ' + $script:Model) }
    }

    # ------------------------------------------------------------------ 4. app packages
    Step 'Step 4 of 5: the app packages (npm)'
    if (-not (Test-Path (Join-Path $script:AppDir 'package.json'))) { throw ('The app folder was not found: ' + $script:AppDir + '. Run this from the downloaded project folder.') }
    if ($DryRun) { Info 'Would run: npm ci (in the app folder)' }
    else {
        Push-Location $script:AppDir
        try {
            & npm ci --no-audit --no-fund | Out-Host
            if ($LASTEXITCODE -ne 0) {
                Warn 'npm ci failed; trying npm install instead...'
                & npm install --no-audit --no-fund | Out-Host
                if ($LASTEXITCODE -ne 0) { throw 'The app packages could not be installed. Check your internet connection and run setup-windows.bat again.' }
            }
        } finally { Pop-Location }
        Ok 'App packages installed'
    }

    # ------------------------------------------------------------------ 5. done
    Step 'Step 5 of 5: done'
    if ($DryRun) { Ok 'Dry run finished.' }
    else {
        Ok 'Setup finished.'
        Say ''
        Say '  Next: double-click  start.bat  (in the same folder). It opens the app in your browser.'
        Say '  Something wrong? Double-click  check-windows.bat  and send a screenshot to your team.'
    }
} catch {
    $ExitCode = 1
    Write-Host ''
    Write-Host ('  [FIX]   ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host '          Send a screenshot of this window to your team.' -ForegroundColor Gray
}
Wait-ForExit -NoPause:$NoPause
exit $ExitCode
