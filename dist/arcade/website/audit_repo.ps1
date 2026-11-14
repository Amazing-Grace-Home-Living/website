# audit_repo.ps1 – Repository audit and optimization script

<#
.SYNOPSIS
    Runs a quick audit of the git repository, reports large files, dangling objects,
    and suggests cleanup actions (git gc, git prune, git lfs prune, BFG usage).
.DESCRIPTION
    This script is meant to be executed from the root of the repository. It does not
    modify anything automatically – it only prints recommendations and, when safe,
    runs housekeeping commands.
#>

param(
    [string]$RepoPath = (Get-Location).Path,
    [switch]$RunGC   # If set, will run `git gc --prune=now` after the audit
)

function Write-Log { param([string]$msg) Write-Host "[audit] $msg" }

# Verify we are inside a Git repo
Set-Location $RepoPath
if (-not (Test-Path ".git")) {
    Write-Error "Directory $RepoPath does not appear to be a git repository."
    exit 1
}

# ---------------------------------------------------
# 1. General repo status
# ---------------------------------------------------
Write-Log "Repository status:"
git status -sb

# ---------------------------------------------------
# 2. Size summary (git-sizer if available)
# ---------------------------------------------------
if (Get-Command git-sizer -ErrorAction SilentlyContinue) {
    Write-Log "Running git-sizer for size analysis..."
    git-sizer
} else {
    Write-Log "git-sizer not installed – you can install it from https://github.com/github/git-sizer"
}

# ---------------------------------------------------
# 3. List large files tracked by Git (over 50 MiB)
# ---------------------------------------------------
Write-Log "Large files (>50 MiB) currently tracked by Git:"
git rev-list --objects --all | 
    git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | 
    awk '{if ($3 > 52428800) print $3/1024/1024 " MiB\t" $4}' | sort -n

# ---------------------------------------------------
# 4. List large files tracked by Git LFS (if any)
# ---------------------------------------------------
if (Get-Command "git lfs" -ErrorAction SilentlyContinue) {
    Write-Log "Files tracked by Git LFS:"
    git lfs ls-files
} else {
    Write-Log "Git LFS not installed – skipping LFS check."
}

# ---------------------------------------------------
# 5. Find dangling/blobs (unreferenced objects)
# ---------------------------------------------------
Write-Log "Dangling objects (potentially removable):"
git fsck --unreachable --no-reflogs | Select-String "unreachable blob" | ForEach-Object { $_.Line }

# ---------------------------------------------------
# 6. Suggest cleanup actions
# ---------------------------------------------------
Write-Log "Recommended cleanup steps:"
Write-Host "  • Run 'git gc --prune=now' to prune unreachable objects."
Write-Host "  • If you have large binary files in history, consider BFG Repo‑Cleaner (java -jar bfg.jar --delete-files \"*.zip\" ...)."
Write-Host "  • For LFS objects no longer needed, run 'git lfs prune'."

if ($RunGC) {
    Write-Log "Running git gc now..."
    git gc --prune=now
    if ($LASTEXITCODE -eq 0) { Write-Log "git gc completed successfully." } else { Write-Error "git gc failed." }
}

Write-Log "Audit finished."
