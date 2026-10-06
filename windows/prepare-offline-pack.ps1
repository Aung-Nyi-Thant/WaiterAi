# Run ONCE on a computer with a good internet connection. It collects everything the other laptops need into the
# folder "offline-pack" (next to the app folder), so they can be set up from a USB stick without downloading 9 GB each:
#   - the Node.js installer, the Ollama installer
#   - the AI model files (the model must already be downloaded on this computer: setup-windows.bat, or "ollama pull gemma4:12b")
#   - optionally the app packages (node_modules) from this computer (-IncludeNodeModules; same Windows type only)
# Then copy the WHOLE project folder (with offline-pack inside) to the USB stick.
#   -DryRun   only check that the downloads exist and the model is found (downloads nothing, copies nothing)
param([string]$Out, [switch]$IncludeNodeModules, [switch]$DryRun, [switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')
if (-not $Out) { $Out = Join-Path $script:RepoRoot 'offline-pack' }
$code = 0
try {
    Say ''
    Say 'Shop AI - prepare the offline pack'
    Say '=================================='
    if ($DryRun) { Warn 'Dry run: nothing is downloaded or copied.' }
    Say ('  Output folder: ' + $Out)

    # ---- Node.js installer (the newest 22.x for 64-bit Windows)
    Step 'Step 1 of 4: the Node.js installer'
    $sums = (Invoke-WebRequest -Uri 'https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt' -UseBasicParsing).Content
    $m = [regex]::Match($sums, 'node-v22\.\d+\.\d+-x64\.msi')
    if (-not $m.Success) { throw 'Could not find the Node.js 22 installer name on nodejs.org.' }
    $nodeName = $m.Value
    $nodeUrl = 'https://nodejs.org/dist/latest-v22.x/' + $nodeName
    Ok ('Found ' + $nodeName)
    if (-not $DryRun) {
        New-Item -ItemType Directory -Force -Path $Out | Out-Null
        if (Test-Path (Join-Path $Out $nodeName)) { Info 'Already downloaded.' } else { Invoke-WebRequest -Uri $nodeUrl -OutFile (Join-Path $Out $nodeName) -UseBasicParsing }
    }

    # ---- Ollama installer
    Step 'Step 2 of 4: the Ollama installer'
    $ollamaUrl = 'https://ollama.com/download/OllamaSetup.exe'
    if ($DryRun) {
        $head = Invoke-WebRequest -Uri $ollamaUrl -Method Head -UseBasicParsing
        Ok ('OllamaSetup.exe is available (HTTP ' + $head.StatusCode + ')')
    } else {
        if (Test-Path (Join-Path $Out 'OllamaSetup.exe')) { Info 'Already downloaded.' }
        else { Say '  Downloading (this is a large file)...'; Invoke-WebRequest -Uri $ollamaUrl -OutFile (Join-Path $Out 'OllamaSetup.exe') -UseBasicParsing }
        Ok 'OllamaSetup.exe is in the pack'
    }

    # ---- model files
    Step ('Step 3 of 4: the AI model ' + $script:Model)
    $modelsRoot = if ($env:OLLAMA_MODELS) { $env:OLLAMA_MODELS } else { Join-Path $env:USERPROFILE '.ollama\models' }
    $parts = $script:Model.Split(':')
    $name = $parts[0]; $tag = if ($parts.Count -gt 1) { $parts[1] } else { 'latest' }
    $manifest = Join-Path $modelsRoot ('manifests\registry.ollama.ai\library\' + $name + '\' + $tag)
    if (-not (Test-Path $manifest)) {
        Warn ('The model ' + $script:Model + ' is not downloaded on this computer yet (looked in ' + $modelsRoot + ').')
        Info ('Download it first:  ollama pull ' + $script:Model + '   then run this script again.')
        if (-not $DryRun) { throw 'Model not found on this computer.' }
    } else {
        $json = Get-Content -Raw -Path $manifest | ConvertFrom-Json
        $digests = @($json.config.digest) + @($json.layers | ForEach-Object { $_.digest })
        $digests = $digests | Where-Object { $_ } | Select-Object -Unique
        $sizeGB = [math]::Round((($digests | ForEach-Object { (Get-Item (Join-Path $modelsRoot ('blobs\' + ($_ -replace ':', '-')))).Length } | Measure-Object -Sum).Sum) / 1GB, 1)
        Ok ('Found the model: ' + $digests.Count + ' files, about ' + $sizeGB + ' GB')
        if (-not $DryRun) {
            $dest = Join-Path $Out 'ollama-models'
            $destManifest = Join-Path $dest ('manifests\registry.ollama.ai\library\' + $name)
            New-Item -ItemType Directory -Force -Path $destManifest, (Join-Path $dest 'blobs') | Out-Null
            Copy-Item -Path $manifest -Destination (Join-Path $destManifest $tag) -Force
            foreach ($d in $digests) {
                $file = $d -replace ':', '-'
                Say ('  Copying ' + $file.Substring(0, [math]::Min(20, $file.Length)) + '...')
                Copy-Item -Path (Join-Path $modelsRoot ('blobs\' + $file)) -Destination (Join-Path $dest 'blobs') -Force
            }
            Ok 'Model files are in the pack'
        }
    }

    # ---- app packages
    Step 'Step 4 of 4: the app packages (optional)'
    if (-not $IncludeNodeModules) { Info 'Skipped. The other laptops will download them with npm (about 400 MB). Add -IncludeNodeModules to put them in the pack instead.' }
    else {
        $nm = Join-Path $script:AppDir 'node_modules'
        if (-not (Test-Path $nm)) { throw 'app\node_modules was not found: run setup-windows.bat on this computer first.' }
        if ($DryRun) { Info 'Would pack app\node_modules into node_modules.zip' }
        else {
            $zip = Join-Path $Out 'node_modules.zip'
            if (Test-Path $zip) { Remove-Item -Force $zip }
            & tar.exe -a -c -f $zip -C $script:AppDir node_modules
            if ($LASTEXITCODE -ne 0) { throw 'Could not create node_modules.zip (tar.exe failed).' }
            Ok 'node_modules.zip is in the pack'
        }
    }

    Say ''
    if ($DryRun) { Ok 'Dry run finished.' }
    else {
        Ok 'The offline pack is ready.'
        Say '  Copy the WHOLE project folder (it now contains "offline-pack") to a USB stick.'
        Say '  On each other laptop: double-click  install-from-offline-pack.bat  (in the windows folder), then start.bat.'
    }
} catch {
    $code = 1
    Write-Host ('  [FIX]   ' + $_.Exception.Message) -ForegroundColor Red
}
Wait-ForExit -NoPause:$NoPause
exit $code
