# Shared helpers for the Windows scripts (dot-sourced by the others). ASCII only, works in Windows PowerShell 5.1 and PowerShell 7.
Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$script:RepoRoot = Split-Path -Parent $PSScriptRoot
$script:AppDir   = Join-Path $script:RepoRoot 'app'
$script:Model    = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { 'gemma4:12b' }
$script:Port     = 3000

function Say  ([string]$Text) { Write-Host $Text }
function Ok   ([string]$Text) { Write-Host ('  [OK]    ' + $Text) -ForegroundColor Green }
function Warn ([string]$Text) { Write-Host ('  [NOTE]  ' + $Text) -ForegroundColor Yellow }
function Fix  ([string]$Text) { Write-Host ('  [FIX]   ' + $Text) -ForegroundColor Red }
function Info ([string]$Text) { Write-Host ('          ' + $Text) -ForegroundColor Gray }
function Step ([string]$Text) { Write-Host ''; Write-Host $Text -ForegroundColor Cyan }

function Test-Cmd ([string]$Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }

# After winget installs a program, the current window does not know its new PATH yet: read it again.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = (@($machine, $user) | Where-Object { $_ }) -join ';'
}

function Get-NodeVersion {
    if (-not (Test-Cmd 'node')) { return $null }
    try { return [version](((& node -v) -replace '^v', '').Trim()) } catch { return $null }
}
# The app uses the SQLite that is built into Node: 22.13 or newer.
function Test-NodeOk {
    $v = Get-NodeVersion
    return ($null -ne $v) -and ($v -ge [version]'22.13.0')
}

function Test-OllamaUp {
    try { Invoke-WebRequest -Uri 'http://localhost:11434' -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}
function Test-ModelPulled ([string]$Name) {
    if (-not (Test-Cmd 'ollama')) { return $false }
    try {
        $list = (& ollama list 2>$null) | Out-String
        $parts = $Name.Split(':')
        $tag = if ($parts.Count -gt 1) { $parts[1] } else { 'latest' }
        return [bool]($list -match ('(?m)^\s*' + [regex]::Escape($parts[0]) + ':' + [regex]::Escape($tag) + '\s'))
    } catch { return $false }
}

function Get-RamGB { return [int][math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB) }
function Get-FreeGB ([string]$Path) {
    $drive = (Resolve-Path $Path).Drive
    return [int][math]::Floor((Get-PSDrive -Name $drive.Name).Free / 1GB)
}

function Test-PortBusy ([int]$P) {
    try { return [bool](Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue) } catch { return $false }
}

function Confirm-Choice ([string]$Question, [bool]$Default) {
    $hint = if ($Default) { '[Y/n]' } else { '[y/N]' }
    $answer = Read-Host ($Question + ' ' + $hint)
    if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
    return ($answer.Trim().ToLower().StartsWith('y'))
}

function Wait-ForExit ([switch]$NoPause) {
    if (-not $NoPause) { Write-Host ''; [void](Read-Host 'Press Enter to close this window') }
}
