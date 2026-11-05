[CmdletBinding()]
param(
 [string]$Workspace = 'C:\Users\Nick\OneDrive\Documents\GitHub\amazing-grace',
 [ValidateRange(1,365)][int]$SessionDays = 30,
 [switch]$ResetToken,
 [switch]$LMStudioOnly,
 [switch]$LMStudioToken
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Workspace -PathType Container)) { throw 'Repository folder does not exist.' }
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
if (-not $LMStudioOnly -and -not $env:CODEX_BIN) {
 $nativeCodex = Get-Command codex.exe -ErrorAction SilentlyContinue
 if ($nativeCodex) { $env:CODEX_BIN = $nativeCodex.Source }
 else {
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCommand) {
   $npmRoot = & $npmCommand.Source root -g
   if ($LASTEXITCODE -eq 0) {
    $openaiFolder = Join-Path ($npmRoot | Select-Object -Last 1) '@openai'
    if (Test-Path -LiteralPath $openaiFolder) {
     $candidate = Get-ChildItem -LiteralPath $openaiFolder -Filter codex.exe -Recurse -File | Select-Object -First 1
     if ($candidate) { $env:CODEX_BIN = $candidate.FullName }
    }
   }
  }
 }
}
if (-not $LMStudioOnly -and (-not $env:CODEX_BIN -or -not (Test-Path -LiteralPath $env:CODEX_BIN -PathType Leaf))) { throw 'Set CODEX_BIN to the actual installed codex.exe path, then run again.' }
$launchArgs = @((Join-Path $PSScriptRoot 'bridge.mjs'), '--cwd', $Workspace, '--session-days', "$SessionDays", '--remember-token')
if ($ResetToken) { $launchArgs += '--reset-token' }
if ($LMStudioToken) { $launchArgs += '--lmstudio-token' }
& $nodePath @launchArgs
exit $LASTEXITCODE
