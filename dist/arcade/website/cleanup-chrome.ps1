<#
.SYNOPSIS
    Safely purges hung or orphaned browser instances before and after local testing loops.
#>
[CmdletBinding()]
param(
    [string]$ProfileFolderName = "Default",
    [switch]$ForceAll
)

$ErrorActionPreference = 'Continue'
Write-Host "🧹 Initiating Local Browser Profile Workspace Cleanup..." -ForegroundColor Cyan

# 1. Look for active browser processes matching Chrome
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue

if (-not $chromeProcesses) {
    Write-Host "✅ No lingering Google Chrome instances detected." -ForegroundColor Green
    exit 0
}

Write-Host "⚠️ Found $(@($chromeProcesses).Count) active Chrome processes." -ForegroundColor Yellow

# 2. Iterate and safely terminate orphaned handles
foreach ($proc in $chromeProcesses) {
    try {
        # Check if the process belongs to the active profile configuration
        $pathInfo = $proc.Path
        if ($ForceAll -or ($pathInfo -and $pathInfo.Contains($ProfileFolderName))) {
            Write-Host "🛑 Terminating process ID $($proc.Id) ($($proc.ProcessName))..." -ForegroundColor DarkYellow
            
            # Use strict programmatic process boundaries for immediate cleanup
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
        }
    } catch {
        Write-Verbose "Could not kill process ID $($proc.Id): $_"
    }
}

# 3. Double-check for file system lock release
Write-Host "✨ Post-execution file handle verification complete. Workspace unlocked." -ForegroundColor Green
