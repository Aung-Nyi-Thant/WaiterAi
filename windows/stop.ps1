# Stops Shop AI (whatever is listening on port 3000). Ollama (the AI) is left running.
param([switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')
$stopped = 0
try {
    $conns = Get-NetTCPConnection -LocalPort $script:Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($id in ($conns | Select-Object -ExpandProperty OwningProcess -Unique)) {
            try { Stop-Process -Id $id -Force -ErrorAction Stop; $stopped++ } catch { Warn ('Could not stop process ' + $id + ': ' + $_.Exception.Message) }
        }
    }
} catch { Warn $_.Exception.Message }
if ($stopped -gt 0) { Ok ('Stopped Shop AI (' + $stopped + ' process).') } else { Ok ('Nothing was running on port ' + $script:Port + '.') }
Wait-ForExit -NoPause:$NoPause
exit 0
