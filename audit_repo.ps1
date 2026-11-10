# audit_repo.ps1 – Repository audit and optimization script

<#
.SYNOPSIS
    Runs a comprehensive audit of the git repository, reports large files, dangling objects,
    repository size, and suggests cleanup actions (git gc, git prune, git lfs prune, BFG usage).

.DESCRIPTION
    This script is meant to be executed from the root of the repository. It does not
    modify anything automatically – it only prints recommendations and, when safe,
    runs housekeeping commands.

    Use this script weekly or before releases to catch repository bloat and issues early.

.PARAMETER RepoPath
    Path to the git repository root. Default: current directory.

.PARAMETER RunGC
    If set, runs `git gc --prune=now` after the audit to compact the repository.

.EXAMPLE
    # Basic audit (analysis only)
    .\audit_repo.ps1

    # Audit and run garbage collection
    .\audit_repo.ps1 -RunGC

    # Audit a specific repository
    .\audit_repo.ps1 -RepoPath "C:\Users\Nick\GitHub\website"

.NOTES
    Requires: Git, optional Java (for BFG recommendations)
    Returns: 0 on success, 1 if not a valid Git repository
#>

param(
    [string]$RepoPath = (Get-Location).Path,
    [switch]$RunGC
)

$ErrorActionPreference = "Stop"

function Write-Log { param([string]$msg) Write-Host "[audit] $msg" }
function Write-Warn { param([string]$msg) Write-Host "[warn]  $msg" -ForegroundColor Yellow }
function Write-Error { param([string]$msg) Write-Host "[error] $msg" -ForegroundColor Red }

try {
    # Verify we are inside a Git repo
    Push-Location $RepoPath
    if (-not (Test-Path ".git")) {
        Write-Error "Directory $RepoPath does not appear to be a git repository."
        exit 1
    }

    Write-Log "Starting repository audit..."
    Write-Log "Repository: $(Get-Location)"
    Write-Log ""

    # ---------------------------------------------------
    # 1. General repo status
    # ---------------------------------------------------
    Write-Log "=== Repository Status ==="
    git status -sb
    Write-Log ""

    # ---------------------------------------------------
    # 2. Size summary (git-sizer if available)
    # ---------------------------------------------------
    Write-Log "=== Repository Size Analysis ==="
    if (Get-Command git-sizer -ErrorAction SilentlyContinue) {
        Write-Log "Running git-sizer for detailed size analysis..."
        git-sizer
    } else {
        Write-Warn "git-sizer not installed – install from https://github.com/github/git-sizer"
        # Fallback: show basic pack file size
        $packDir = ".git\objects\pack"
        if (Test-Path $packDir) {
            $packSize = (Get-ChildItem $packDir -File | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Host "  Git pack files size: ${packSize:F2} MB"
        }
    }
    Write-Log ""

    # ---------------------------------------------------
    # 3. List large files tracked by Git (over 50 MiB)
    # ---------------------------------------------------
    Write-Log "=== Large Files (>50 MB) Currently Tracked ==="
    $largeFiles = @()
    $objects = git rev-list --objects --all 2>$null
    foreach ($line in $objects) {
        $hash, $path = $line -split ' ', 2
        if (-not $path) { continue }
        $size = git cat-file -s $hash 2>$null
        if ($size -and $size -ge 52428800) {  # 50 MB
            $mb = [math]::Round($size / 1MB, 2)
            $largeFiles += [pscustomobject]@{SizeMB=$mb; Path=$path; Hash=$hash}
        }
    }

    if ($largeFiles.Count -eq 0) {
        Write-Log "✓ No large files found (>50 MB)"
    } else {
        Write-Warn "Found $($largeFiles.Count) large file(s):"
        foreach ($f in $largeFiles | Sort-Object -Property SizeMB -Descending) {
            Write-Host "    $($f.SizeMB) MB - $($f.Path)"
        }
    }
    Write-Log ""

    # ---------------------------------------------------
    # 4. List large files tracked by Git LFS (if any)
    # ---------------------------------------------------
    Write-Log "=== Git LFS Files ==="
    if (Get-Command "git lfs" -ErrorAction SilentlyContinue) {
        $lfsFiles = git lfs ls-files 2>$null
        if ($lfsFiles.Count -eq 0) {
            Write-Log "✓ No LFS files tracked"
        } else {
            Write-Host "Git LFS tracked files:"
            $lfsFiles | ForEach-Object { Write-Host "  $_" }
        }
    } else {
        Write-Warn "Git LFS not installed – skipping LFS check"
    }
    Write-Log ""

    # ---------------------------------------------------
    # 5. Find dangling/unreferenced objects
    # ---------------------------------------------------
    Write-Log "=== Dangling Objects (Potentially Removable) ==="
    $dangling = git fsck --unreachable --no-reflogs 2>$null | Select-String "unreachable blob"
    if ($dangling.Count -eq 0) {
        Write-Log "✓ No dangling objects found"
    } else {
        Write-Warn "Found $($dangling.Count) dangling object(s):"
        $dangling | ForEach-Object { Write-Host "  $_" }
    }
    Write-Log ""

    # ---------------------------------------------------
    # 6. Suggest cleanup actions
    # ---------------------------------------------------
    Write-Log "=== Recommended Cleanup Steps ==="
    if ($largeFiles.Count -gt 0 -or $dangling.Count -gt 0) {
        Write-Host "  1. Remove large files from history using BFG Repo-Cleaner:"
        Write-Host "     java -jar bfg.jar --delete-files '*.zip' --no-blob-protection"
        Write-Host "     git reflog expire --expire=now --all"
        Write-Host "     git gc --prune=now --aggressive"
        Write-Host "  "
        Write-Host "  2. Force-push cleaned history (coordinate with team!):"
        Write-Host "     git push --force-with-lease origin main"
        Write-Host "  "
    }
    if ($dangling.Count -gt 0) {
        Write-Host "  • Run 'git gc --prune=now' to prune unreachable objects."
    }
    if (-not (Get-Command git-sizer -ErrorAction SilentlyContinue)) {
        Write-Host "  • Install git-sizer for detailed analysis: https://github.com/github/git-sizer"
    }
    if (-not (Get-Command "git lfs" -ErrorAction SilentlyContinue)) {
        Write-Host "  • For large binary files, set up Git LFS: https://git-lfs.github.com"
    }
    Write-Log ""

    # ---------------------------------------------------
    # 7. Run garbage collection if requested
    # ---------------------------------------------------
    if ($RunGC) {
        Write-Log "=== Running Git Garbage Collection ==="
        git gc --prune=now
        if ($LASTEXITCODE -eq 0) {
            Write-Log "✓ git gc completed successfully"
        } else {
            Write-Error "git gc failed with exit code $LASTEXITCODE"
            exit 1
        }
    }

    Write-Log ""
    Write-Log "✓ Audit finished"
    exit 0

} catch {
    Write-Error "Fatal error: $_"
    exit 1
} finally {
    Pop-Location
}
