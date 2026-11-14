# setup_lfs_and_fix.ps1 – Automated fix for large file push errors

<#
.SYNOPSIS
    Renames problematic JDK archive, installs Git LFS, tracks large files, commits changes,
    optionally cleans history with BFG, and pushes to GitHub.
.DESCRIPTION
    This script automates the steps needed when a push is rejected due to a file exceeding
    GitHub's 100 MB limit and an invalid filename in .gitattributes.
.PARAMETER RepoPath
    Path to the root of the git repository. Defaults to the current directory.
.PARAMETER NewFileName
    Desired safe name for the JDK archive (no spaces/parentheses). Default:
    "OpenJDK25U-jdk_x64_linux_hotspot_25.0.3_9.tar.gz".
.PARAMETER ForceRewrite
    If $true, runs BFG Repo‑Cleaner to purge existing large‑file blobs and forces a push.
.EXAMPLE
    .\setup_lfs_and_fix.ps1 -RepoPath "C:\Users\Nick\OneDrive\Documents\GitHub\profile"
#>

param(
    [string]$RepoPath = (Get-Location).Path,
    [string]$NewFileName = "OpenJDK25U-jdk_x64_linux_hotspot_25.0.3_9.tar.gz",
    [switch]$ForceRewrite
)

function Write-Log { param([string]$msg) Write-Host "[setup_lfs] $msg" }

# Ensure we are in a git repo
Set-Location $RepoPath
if (-not (Test-Path ".git")) {
    Write-Error "Directory $RepoPath does not appear to be a git repository."
    exit 1
}

# ----------------------------------------------------------------
# 1. Find and rename the offending file (if it exists)
# ----------------------------------------------------------------
$searchPattern = "public/Apps/*OpenJDK* (1).tar.gz"
$oldFile = Get-ChildItem -Path $RepoPath -Recurse -Filter "*OpenJDK* (1).tar.gz" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -eq $oldFile) {
    Write-Log "No file matching pattern '*OpenJDK* (1).tar.gz' found – skipping rename."
} else {
    $newPath = Join-Path $oldFile.Directory.FullName $NewFileName
    if (Test-Path $newPath) {
        Write-Log "Target name $NewFileName already exists – removing existing file."
        Remove-Item $newPath -Force
    }
    Rename-Item -Path $oldFile.FullName -NewName $NewFileName
    Write-Log "Renamed '$($oldFile.Name)' to '$NewFileName'."
}

# ----------------------------------------------------------------
# 2. Ensure Git LFS is installed (attempt via winget; otherwise warn)
# ----------------------------------------------------------------
if (-not (Get-Command "git-lfs" -ErrorAction SilentlyContinue)) {
    Write-Log "Git LFS not found – attempting installation via winget."
    try {
        winget install --id GitHub.GitLFS -e --silent | Out-Null
    } catch {
        Write-Warning "Automatic installation failed. Please install Git LFS manually from https://git-lfs.github.com/."
    }
    if (-not (Get-Command "git-lfs" -ErrorAction SilentlyContinue)) {
        Write-Error "Git LFS still not available – aborting."
        exit 1
    }
}

# ----------------------------------------------------------------
# 3. Initialise LFS in the repo
# ----------------------------------------------------------------
git lfs install
if ($LASTEXITCODE -ne 0) { Write-Error "git lfs install failed"; exit 1 }

# ----------------------------------------------------------------
# 4. Track .tar.gz files under public/Apps
# ----------------------------------------------------------------
git lfs track "public/Apps/*.tar.gz"
if ($LASTEXITCODE -ne 0) { Write-Error "git lfs track failed"; exit 1 }

# ----------------------------------------------------------------
# 5. Stage changes (.gitattributes and the renamed file)
# ----------------------------------------------------------------
git add .gitattributes "public/Apps/$NewFileName"
if ($LASTEXITCODE -ne 0) { Write-Error "git add failed"; exit 1 }

# ----------------------------------------------------------------
# 6. Commit
# ----------------------------------------------------------------
$commitMessage = "Rename JDK archive and add to Git LFS"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) { Write-Error "git commit failed"; exit 1 }

# ----------------------------------------------------------------
# 7. Optional history rewrite with BFG (if -ForceRewrite supplied)
# ----------------------------------------------------------------
if ($ForceRewrite) {
    Write-Log "Running BFG Repo‑Cleaner to purge existing .tar.gz blobs."
    $bfgJar = "bfg.jar"
    if (-not (Test-Path $bfgJar)) {
        Write-Log "Downloading BFG Repo‑Cleaner..."
        Invoke-WebRequest -Uri "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -OutFile $bfgJar
    }
    java -jar $bfgJar --delete-files "*.tar.gz" --no-blob-protection
    if ($LASTEXITCODE -ne 0) { Write-Error "BFG failed"; exit 1 }
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    if ($LASTEXITCODE -ne 0) { Write-Error "git gc failed"; exit 1 }
    Write-Log "History rewrite completed."
}

# ----------------------------------------------------------------
# 8. Push to GitHub
# ----------------------------------------------------------------
if ($ForceRewrite) {
    git push --force-with-lease origin main
} else {
    git push origin main
}
if ($LASTEXITCODE -ne 0) { Write-Error "git push failed"; exit 1 }

Write-Log "All done!"
