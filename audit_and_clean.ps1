# audit_and_clean.ps1 – Audit the repo, remove large files from history, and force‑push

<#
.SYNOPSIS
    Runs a repository audit, deletes oversized files (>100 MiB) from the entire Git history
    using BFG Repo‑Cleaner, performs garbage collection, and pushes the cleaned history.
.DESCRIPTION
    This script is intended for Windows PowerShell. It requires Java (for BFG) and
    optionally Git LFS if you have LFS‑tracked files.
.PARAMETER RepoPath
    Path to the root of the git repository.
.PARAMETER SizeThresholdMB
    Files larger than this size (in megabytes) will be removed from history. Default: 100.
.PARAMETER RunGC
    If set, runs `git gc --prune=now` after cleaning.
.EXAMPLE
    .\audit_and_clean.ps1 -RepoPath "C:\Users\Nick\OneDrive\Documents\GitHub\profile" -SizeThresholdMB 100 -RunGC
#>

param(
    [string]$RepoPath = (Get-Location).Path,
    [int]$SizeThresholdMB = 100,
    [switch]$RunGC
)

function Write-Log { param([string]$msg) Write-Host "[audit] $msg" }

# ----------------------------------------------------------------
# 1. Ensure we are in a git repo
# ----------------------------------------------------------------
Set-Location $RepoPath
if (-not (Test-Path ".git")) { Write-Error "$RepoPath is not a git repository"; exit 1 }

Write-Log "Starting audit of repository at $RepoPath"

# ----------------------------------------------------------------
# 2. List large files (>= SizeThresholdMB) currently tracked in any commit
# ----------------------------------------------------------------
$thresholdBytes = $SizeThresholdMB * 1MB
Write-Log "Scanning for files >= $SizeThresholdMB MB..."
$largeFiles = @()
$objects = git rev-list --objects --all
foreach ($line in $objects) {
    $hash,$path = $line -split ' ',2
    if (-not $path) { continue }
    $size = git cat-file -s $hash 2>$null
    if ($size -and $size -ge $thresholdBytes) {
        $mb = [math]::Round($size/1MB,2)
        $largeFiles += [pscustomobject]@{SizeMB=$mb;Path=$path;Hash=$hash}
    }
}
if ($largeFiles.Count -eq 0) {
    Write-Log "No files larger than $SizeThresholdMB MB found."
} else {
    Write-Log "Found $($largeFiles.Count) large file(s):"
    foreach ($f in $largeFiles) { Write-Host "    $($f.SizeMB) MB - $($f.Path)" }
}

# ----------------------------------------------------------------
# 3. If large files exist, run BFG to delete them from history
# ----------------------------------------------------------------
if ($largeFiles.Count -gt 0) {
    # Download BFG if not present
    $bfgJar = "bfg.jar"
    if (-not (Test-Path $bfgJar)) {
        Write-Log "Downloading BFG Repo‑Cleaner..."
        Invoke-WebRequest -Uri "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -OutFile $bfgJar
    }
    # Build a pattern list for BFG (e.g., "*.tar.gz") based on extensions of large files
    $patterns = $largeFiles.Path | ForEach-Object { $_ -replace '^.*\.(.*)$','$1' } | Sort-Object -Unique | ForEach-Object { "*.$_" }
    $patternArg = $patterns -join ','
    Write-Log "Running BFG to delete files matching: $patternArg"
    java -jar $bfgJar --delete-files "$patternArg" --no-blob-protection
    if ($LASTEXITCODE -ne 0) { Write-Error "BFG failed"; exit 1 }
    # Clean up after BFG
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    Write-Log "BFG cleanup completed."
}

# ----------------------------------------------------------------
# 4. Optional git garbage collection
# ----------------------------------------------------------------
if ($RunGC) {
    Write-Log "Running git gc..."
    git gc --prune=now
    if ($LASTEXITCODE -eq 0) { Write-Log "git gc succeeded" } else { Write-Error "git gc failed" }
}

# ----------------------------------------------------------------
# 5. Force‑push cleaned history
# ----------------------------------------------------------------
Write-Log "Pushing cleaned history (force)..."
git push --force-with-lease origin main
if ($LASTEXITCODE -eq 0) {
    Write-Log "Push succeeded."
} else {
    Write-Error "Push failed."
    exit 1
}

Write-Log "Audit and clean process finished."
