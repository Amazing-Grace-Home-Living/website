# Optional: run as Administrator under the SAME Windows account that signed in to Codex.
# Task Scheduler stores the Windows account credential to run before interactive sign-in.
[CmdletBinding()]
param(
 [string]$Workspace = 'C:\Users\Nick\OneDrive\Documents\GitHub\amazing-grace-consolidated',
 [ValidateRange(1,90)][int]$SessionDays = 30
)
$ErrorActionPreference = 'Stop'
$taskName = 'Grace Remote Companion'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task already exists. Inspect it in Task Scheduler before changing it.' }
if (-not (Test-Path -LiteralPath $Workspace -PathType Container)) { throw 'Repository folder does not exist.' }
$launcher = Join-Path $PSScriptRoot 'Start-GraceRemote.ps1'
if ($Workspace.Contains('"') -or $launcher.Contains('"')) { throw 'Unsupported quote in path.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$credential = Get-Credential -UserName $identity -Message 'Windows account password (not PIN). Used by Task Scheduler for unattended startup.'
if (-not $credential -or $credential.UserName -ne $identity) { throw 'Use the same Windows account as the companion and Codex.' }
$exe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = '-NoLogo -NoProfile -NonInteractive -File "{0}" -Workspace "{1}" -SessionDays {2}' -f $launcher,$Workspace,$SessionDays
$action = New-ScheduledTaskAction -Execute $exe -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
try {
 $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User $identity -Password $plain -RunLevel Limited | Out-Null
} finally {
 $plain = $null
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
Write-Host 'Registered. Stop the manually running companion, then use Start-ScheduledTask -TaskName "Grace Remote Companion".'
Write-Host 'Test a reboot and remote login before traveling. This task does not install SSH/VPN or change sleep settings.'
