# Sets up this laptop from the "offline-pack" folder made by prepare-offline-pack.bat: no big downloads.
#   -Pack     path of the pack (default: the offline-pack folder next to the app folder)
#   -DryRun   only report what the pack contains and what would be done
param([string]$Pack, [switch]$DryRun, [switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')
if (-not $Pack) { $Pack = Join-Path $script:RepoRoot 'offline-pack' }
$code = 0
try {
    Say ''
    Say 'Shop AI - install from the offline pack'
    Say '======================================='
    if ($DryRun) { Warn 'Dry run: nothing is installed or copied.' }
    if (-not (Test-Path $Pack)) { throw ('The offline pack folder was not found: ' + $Pack + '. Copy the whole project folder from the USB stick.') }
    $ram = Get-RamGB
    Ok ("Pack found. This computer has $ram GB of memory.")

    # ---- Node.js
    Step 'Step 1 of 4: Node.js'
    if (Test-NodeOk) { Ok ('Node.js ' + (Get-NodeVersion).ToString() + ' is already installed') }
    else {
        $msi = Get-ChildItem -Path $Pack -Filter 'node-v22*-x64.msi' -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $msi) { throw 'No Node.js installer (node-v22...msi) in the pack.' }
        if ($DryRun) { Info ('Would install ' + $msi.Name) }
        else {
            Say '  Installing Node.js (Windows will ask you to allow it; click Yes)...'
            Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ('"' + $msi.FullName + '"'), '/passive', '/norestart') -Verb RunAs -Wait
            Update-SessionPath
            if (Test-NodeOk) { Ok ('Node.js ' + (Get-NodeVersion).ToString() + ' installed') } else { throw 'Node.js is still not available. Close this window, open it again and run this script once more.' }
        }
    }

    # ---- Ollama and the model
    Step 'Step 2 of 4: the AI (Ollama and the model)'
    $setup = Join-Path $Pack 'OllamaSetup.exe'
    $models = Join-Path $Pack 'ollama-models'
    if (-not (Test-Path $setup) -or -not (Test-Path $models)) { Info 'The pack has no AI files: skipping. The app works without the AI.' }
    elseif ($ram -lt 16) { Warn "This computer has $ram GB of memory: skipping the AI (it would be slow). Use the AI on a laptop with 16 GB or more." }
    else {
        if (-not (Test-Cmd 'ollama')) {
            if ($DryRun) { Info 'Would run OllamaSetup.exe' }
            else { Say '  Installing Ollama...'; Start-Process -FilePath $setup -ArgumentList '/SILENT' -Wait; Update-SessionPath }
        } else { Ok 'Ollama is already installed' }
        $dest = if ($env:OLLAMA_MODELS) { $env:OLLAMA_MODELS } else { Join-Path $env:USERPROFILE '.ollama\models' }
        if ($DryRun) { Info ('Would copy the model files to ' + $dest) }
        else {
            New-Item -ItemType Directory -Force -Path $dest | Out-Null
            Copy-Item -Path (Join-Path $models '*') -Destination $dest -Recurse -Force
            Ok ('Model files copied to ' + $dest)
        }
    }

    # ---- app packages
    Step 'Step 3 of 4: the app packages'
    $zip = Join-Path $Pack 'node_modules.zip'
    $nm = Join-Path $script:AppDir 'node_modules'
    if (Test-Path $nm) { Ok 'App packages are already installed' }
    elseif (Test-Path $zip) {
        if ($DryRun) { Info 'Would unpack node_modules.zip' }
        else { Say '  Unpacking the app packages...'; & tar.exe -x -f $zip -C $script:AppDir; if ($LASTEXITCODE -ne 0) { throw 'Could not unpack node_modules.zip.' }; Ok 'App packages unpacked' }
    } else {
        if ($DryRun) { Info 'Would run: npm ci (needs internet, about 400 MB)' }
        else {
            Say '  The pack has no app packages: downloading them with npm (needs internet, about 400 MB)...'
            Push-Location $script:AppDir
            try { & npm ci --no-audit --no-fund | Out-Host; if ($LASTEXITCODE -ne 0) { throw 'npm could not install the app packages.' } } finally { Pop-Location }
            Ok 'App packages installed'
        }
    }

    Step 'Step 4 of 4: done'
    if ($DryRun) { Ok 'Dry run finished.' } else { Ok 'Finished.'; Say '  Next: double-click  start.bat'; }
} catch {
    $code = 1
    Write-Host ('  [FIX]   ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host '          Send a screenshot of this window to your team.' -ForegroundColor Gray
}
Wait-ForExit -NoPause:$NoPause
exit $code
