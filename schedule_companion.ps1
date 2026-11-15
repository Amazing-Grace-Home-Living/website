# schedule_companion.ps1 – Register a scheduled task to launch the Antigravity companion at startup

param(
    [Parameter(Mandatory=$true)]
    [string]$LauncherPath,        # Full path to the companion launcher script (.ps1)
    [Parameter(Mandatory=$true)]
    [string]$Workspace,           # Workspace directory the companion should use
    [int]$SessionDays = 7,        # Number of days the session should stay alive
    [switch]$LMStudioOnly,        # Optional flag to start only LM Studio mode
    [switch]$EnableTerminal,      # Optional flag to enable PowerShell terminal support
    [string]$ExtensionId,         # Optional Chrome extension ID to link with
    [string]$TaskName = "Grace Remote Companion"
)

# Validate paths
if (-not (Test-Path $LauncherPath)) {
    throw "Launcher script not found at path: $LauncherPath"
}
if (-not (Test-Path $Workspace)) {
    throw "Workspace directory not found: $Workspace"
}

# Resolve the Windows identity under which the companion runs (current user)
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Retrieve stored credential (saved via `Get-Credential` earlier) – you may adapt this to your own storage method
$credential = Get-StoredCredential -Target "GraceCompanion" -ErrorAction SilentlyContinue
if (-not $credential) {
    # Prompt the user for credentials the first time
    $credential = Get-Credential -Message "Enter the Windows account password for the scheduled task"
    # Optionally store it for later runs (requires CredentialManager module)
    # New-StoredCredential -Target "GraceCompanion" -UserName $identity -Password $credential.GetNetworkCredential().Password -Persist LocalMachine
}

if (-not $credential -or $credential.UserName -ne $identity) {
    throw "Use the same Windows account as the companion and Codex."
}

$exe = Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'
$arguments = @(
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-File', "`"$LauncherPath`"",
    '-Workspace', "`"$Workspace`"",
    '-SessionDays', $SessionDays
)
if ($LMStudioOnly) { $arguments += '-LMStudioOnly' }
if ($EnableTerminal) { $arguments += '-EnableTerminal' }
if ($ExtensionId) { $arguments += '-ExtensionId', $ExtensionId }

# Build the scheduled‑task objects
$action = New-ScheduledTaskAction -Execute $exe -Argument ($arguments -join ' ') -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet \
    -StartWhenAvailable \
    -RestartCount 999 \
    -RestartInterval (New-TimeSpan -Minutes 1) \
    -ExecutionTimeLimit ([TimeSpan]::Zero) \
    -MultipleInstances IgnoreNew \
    -AllowStartIfOnBatteries \
    -DontStopIfGoingOnBatteries

# Convert the secure password to plain text for the registration call (handled safely)
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User $identity -Password $plain -RunLevel Limited | Out-Null
    Write-Host "Registered scheduled task '$TaskName'."
    Write-Host "Stop any manually running companion, then start with: Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "Test a reboot and remote login before traveling. This task does not install SSH/VPN or change sleep settings."
} finally {
    $plain = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
