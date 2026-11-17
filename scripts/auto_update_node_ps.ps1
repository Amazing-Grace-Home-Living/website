# Auto‑Update Script for Node.js and PowerShell (Windows)

<details>
<summary>What this script does</summary>

- **Node.js**: Detects the latest LTS version from the official Node.js website, downloads the Windows installer (MSI), and runs it silently.
- **PowerShell**: Detects the latest stable release of PowerShell 7+ from GitHub, downloads the MSI, and installs it silently.
- Logs progress to `auto_update.log` in the same folder.

The script is safe to run repeatedly – it only reinstalls when a newer version is found.
</details>

## Prerequisites
- Run **PowerShell as Administrator** (required for silent MSI installs).
- Internet access.
- Optional: `nvm-windows` installed if you prefer managing multiple Node versions.

## Script (`scripts/auto_update_node_ps.ps1`)
```powershell
# ----------------------------------------------------------
# Auto‑update Node.js and PowerShell (Windows)
# ----------------------------------------------------------
# Log file – all output is appended for auditing
$logFile = Join-Path $PSScriptRoot "auto_update.log"
function Write-Log { param([string]$msg) "$(Get-Date -Format o) $msg" | Tee-Object -FilePath $logFile -Append }

# ---------- Helper: download file ----------
function Download-File($url, $dest) {
    Write-Log "Downloading $url"
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

# ---------- Node.js update ----------
function Update-Node {
    # Get latest LTS version number from nodejs.org JSON endpoint
    $nodeInfo = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing | Where-Object { $_.lts }
    $latest = $nodeInfo[0].version.TrimStart('v')
    Write-Log "Latest Node LTS: $latest"

    # Compare with current version
    $current = (node -v).TrimStart('v')
    Write-Log "Current Node version: $current"
    if ([version]$latest -le [version]$current) {
        Write-Log "Node is up‑to‑date."
        return
    }

    $msiUrl = "https://nodejs.org/dist/v$latest/node-v$latest-x64.msi"
    $tmpMsi = Join-Path $env:TEMP "node-v$latest-x64.msi"
    Download-File $msiUrl $tmpMsi
    Write-Log "Installing Node $latest"
    # Silent install, no reboot required
    $installArgs = "/qn /norestart"
    Start-Process msiexec.exe -ArgumentList "/i `"$tmpMsi`" $installArgs" -Wait -NoNewWindow
    Write-Log "Node $latest installed."
    Remove-Item $tmpMsi -Force
}

# ---------- PowerShell update ----------
function Update-PowerShell {
    # Get latest stable release from GitHub API
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/PowerShell/PowerShell/releases/latest" -UseBasicParsing
    $latestTag = $release.tag_name.TrimStart('v')
    Write-Log "Latest PowerShell: $latestTag"

    # Current version (use $PSVersionTable.PSVersion)
    $current = $PSVersionTable.PSVersion.ToString()
    Write-Log "Current PowerShell version: $current"
    if ([version]$latestTag -le [version]$current) {
        Write-Log "PowerShell is up‑to‑date."
        return
    }

    # Find the Windows x64 MSI asset
    $msiAsset = $release.assets | Where-Object { $_.name -match "win-x64.msi" } | Select-Object -First 1
    if (-not $msiAsset) { Write-Log "MSI asset not found for PowerShell"; return }
    $msiUrl = $msiAsset.browser_download_url
    $tmpMsi = Join-Path $env:TEMP "PowerShell-$latestTag-win-x64.msi"
    Download-File $msiUrl $tmpMsi
    Write-Log "Installing PowerShell $latestTag"
    $installArgs = "/qn /norestart"
    Start-Process msiexec.exe -ArgumentList "/i `"$tmpMsi`" $installArgs" -Wait -NoNewWindow
    Write-Log "PowerShell $latestTag installed."
    Remove-Item $tmpMsi -Force
}

# ----------------------------------------------------------
# Run updates
# ----------------------------------------------------------
Write-Log "--- Auto‑update started ---"
Update-Node
Update-PowerShell
Write-Log "--- Auto‑update finished ---"
```

## How to use
1. Save the script to `scripts/auto_update_node_ps.ps1` in your repo.
2. Open **PowerShell as Administrator** and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\scripts\auto_update_node_ps.ps1
   ```
3. Review `auto_update.log` to confirm actions.

## Optional automation
- Add a **GitHub Actions** job that runs this script on a schedule (e.g., weekly) on a self‑hosted Windows runner to keep CI agents up‑to‑date.
- Or schedule a Windows **Task Scheduler** task that invokes the script daily.

---
*Generated for the `amazing-grace` repository. Adjust paths or logging as needed.*
