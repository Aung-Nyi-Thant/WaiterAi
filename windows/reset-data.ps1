# Deletes the app's local data (database, session secret, uploaded photos) so the next start begins fresh
# with the sample restaurant. Your code and the AI model are not touched.
param([switch]$Yes, [switch]$NoPause)
. (Join-Path $PSScriptRoot 'common.ps1')
$code = 0
try {
    $data = Join-Path $script:AppDir 'data'
    if (Test-PortBusy $script:Port) { throw 'Shop AI is running. Double-click stop.bat first, then try again.' }
    Say ''
    Say ('This deletes the local database, the session secret and uploaded photos in: ' + $data)
    $go = $Yes
    if (-not $go) { $go = ((Read-Host 'Type YES to continue') -ceq 'YES') }
    if (-not $go) { Say 'Cancelled. Nothing was deleted.' }
    elseif (-not (Test-Path $data)) { Ok 'There is no data folder yet; nothing to delete.' }
    else {
        $items = @()
        $items += Get-ChildItem -Path $data -Filter '*.db*' -File -ErrorAction SilentlyContinue
        $items += Get-ChildItem -Path $data -Filter 'secret' -File -ErrorAction SilentlyContinue
        $items += Get-ChildItem -Path $data -Filter 'uploads' -Directory -ErrorAction SilentlyContinue
        foreach ($i in $items) { Remove-Item -LiteralPath $i.FullName -Recurse -Force }
        Ok ('Deleted ' + $items.Count + ' item(s). The next start creates the sample restaurant again.')
    }
} catch {
    $code = 1
    Write-Host ('  [FIX]   ' + $_.Exception.Message) -ForegroundColor Red
}
Wait-ForExit -NoPause:$NoPause
exit $code
