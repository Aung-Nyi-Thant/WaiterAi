# "Check my computer": prints OK / NOTE / FIX lines in plain words. Safe to run any time; it changes nothing.
param([switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')

$fixes = 0
Say ''
Say 'Shop AI - check my computer'
Say '==========================='

Step '1. Your computer'
$os = [Environment]::OSVersion.Version
if ($os.Major -ge 10) { Ok ('Windows version ' + $os.ToString()) } else { Fix 'Windows 10 or 11 is needed.'; $fixes++ }
$ram = Get-RamGB
if ($ram -ge 16) { Ok ("Memory: $ram GB (enough for the AI model)") }
elseif ($ram -ge 8) { Warn "Memory: $ram GB. The app works, but the AI model will be slow. Best: use the AI on a laptop with 16 GB or more." }
else { Warn "Memory: $ram GB. Do not install the AI model on this computer; the app still works without it." }
$free = Get-FreeGB $script:RepoRoot
if ($free -ge 15) { Ok "Free disk space: $free GB" } else { Warn "Free disk space: $free GB. The AI model needs about 9 GB; Node and the app need about 2 GB." }
if (Test-Cmd 'winget') { Ok 'winget (the Windows installer tool) is available' } else { Warn 'winget was not found. setup-windows.bat will show you the download links instead.' }

Step '2. Node.js (runs the app)'
$nv = Get-NodeVersion
if (Test-NodeOk) { Ok ('Node.js ' + $nv.ToString()) }
elseif ($null -ne $nv) { Fix ('Node.js ' + $nv.ToString() + ' is too old. Run setup-windows.bat to install Node.js 22 or newer.'); $fixes++ }
else { Fix 'Node.js is not installed. Run setup-windows.bat.'; $fixes++ }

Step '3. The app'
if (Test-Path (Join-Path $script:AppDir 'package.json')) { Ok 'App folder found' } else { Fix ('The app folder was not found next to this script: ' + $script:AppDir); $fixes++ }
if (Test-Path (Join-Path $script:AppDir 'node_modules')) { Ok 'App packages are installed' } else { Fix 'App packages are not installed yet. Run setup-windows.bat.'; $fixes++ }
if (Test-PortBusy $script:Port) { Warn "Something is already using port $script:Port. If it is Shop AI that is fine; otherwise run stop.bat." } else { Ok "Port $script:Port is free" }

Step '4. The AI (optional: the app works without it)'
if (Test-Cmd 'ollama') {
    Ok 'Ollama is installed'
    if (Test-OllamaUp) { Ok 'Ollama is running' } else { Warn 'Ollama is not running. Open "Ollama" from the Start menu (start.bat also tries to start it).' }
    if (Test-ModelPulled $script:Model) { Ok ('AI model ' + $script:Model + ' is downloaded') } else { Warn ('AI model ' + $script:Model + ' is not downloaded. Run setup-windows.bat and say yes to the AI, or: ollama pull ' + $script:Model) }
} else {
    Warn 'Ollama is not installed. Without it, open questions show "AI unavailable"; allergen, price and order answers still work.'
}

Say ''
if ($fixes -eq 0) { Write-Host 'Everything the app needs is ready. Double-click start.bat.' -ForegroundColor Green } else { Write-Host "$fixes thing(s) to fix (marked [FIX]). Run setup-windows.bat, then check again." -ForegroundColor Red }
Wait-ForExit -NoPause:$NoPause
exit $(if ($fixes -eq 0) { 0 } else { 1 })
