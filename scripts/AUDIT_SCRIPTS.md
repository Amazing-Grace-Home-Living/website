# Repository Audit & Maintenance Scripts

This directory contains helper scripts for auditing and maintaining the Nexus OS repository.

## Overview

| Script | OS | Purpose |
|--------|----|----|
| `audit.sh` | Linux/macOS/WSL | ESLint, npm audit, Git health check → Markdown report |
| `audit_repo.ps1` | Windows PowerShell | Repository size analysis, large file detection, recommendations |
| `audit_and_clean.ps1` | Windows PowerShell | Remove large files from Git history using BFG |
| `setup_lfs_and_fix.ps1` | Windows PowerShell | Install/configure Git LFS |

## Quick Usage

### Linux/macOS: Full Audit
```bash
chmod +x audit.sh
./audit.sh                           # Saves to audit_report.md
./audit.sh custom_report.md          # Custom output file
```

### Windows PowerShell: Audit Only
```powershell
# Analyze repository, show recommendations
.\audit_repo.ps1

# With garbage collection
.\audit_repo.ps1 -RunGC
```

### Windows PowerShell: Remove Large Files
```powershell
# Remove files >100 MB from history and push
.\audit_and_clean.ps1

# Custom size threshold
.\audit_and_clean.ps1 -SizeThresholdMB 50

# With garbage collection
.\audit_and_clean.ps1 -RunGC
```

### Windows PowerShell: Setup Git LFS
```powershell
.\setup_lfs_and_fix.ps1
```

---

## What Each Script Does

### `audit.sh` (Linux/macOS)

**Checks:**
- ✅ npm audit (dependency vulnerabilities)
- ✅ ESLint (code quality)
- ✅ Git repository health (large files, dangling objects)
- ✅ Git LFS status (if enabled)
- ✅ .gitignore validation
- ✅ Python linting (optional, if Python installed)

**Output:**
- Markdown report with detailed findings
- Colored terminal output (green/yellow/red)
- Saved to file for sharing/archival

**Example:**
```bash
./audit.sh
# Output:
# [audit] Starting repository audit...
# [audit] Checking dependencies (npm audit)...
# [audit] Running ESLint...
# [audit] Checking Git repository health...
# [audit] Audit complete. Full report saved to: audit_report.md
```

### `audit_repo.ps1` (Windows PowerShell)

**Checks:**
- ✅ Repository status (`git status`)
- ✅ Repository size (using `git-sizer` if installed)
- ✅ Large files >50 MB currently in Git
- ✅ Git LFS tracked files
- ✅ Dangling objects (unreferenced commits)
- ✅ Cleanup recommendations

**Parameters:**
- `-RepoPath` (string) – Path to repository (default: current directory)
- `-RunGC` (switch) – Run `git gc --prune=now` after audit

**Example:**
```powershell
# Basic audit
.\audit_repo.ps1
# Output:
# [audit] Repository status:
# On branch main
# Your branch is up to date with 'origin/main'.
# [audit] Large files (>50 MiB) currently tracked by Git:
# 256.5 MiB  nexus-toolbox.zip
# [audit] Recommended cleanup steps:
#   • Run 'git gc --prune=now' to prune unreachable objects.
#   • If you have large binary files in history, consider BFG...

# With garbage collection
.\audit_repo.ps1 -RunGC
```

### `audit_and_clean.ps1` (Windows PowerShell)

**Actions:**
1. Scans for files larger than threshold (default: 100 MB)
2. Downloads BFG if not present
3. Removes matching files from entire Git history
4. Runs garbage collection
5. Force-pushes cleaned history to origin/main

**Parameters:**
- `-RepoPath` (string) – Path to repository (default: current directory)
- `-SizeThresholdMB` (int) – Files larger than this are removed (default: 100)
- `-RunGC` (switch) – Run garbage collection

**Example:**
```powershell
# Remove files >100 MB (default)
.\audit_and_clean.ps1

# Remove files >50 MB
.\audit_and_clean.ps1 -SizeThresholdMB 50

# Output:
# [audit] Starting audit of repository at C:\repo
# [audit] Scanning for files >= 100 MB...
# [audit] Found 1 large file(s):
#     256.5 MiB - nexus-toolbox.zip
# [audit] Running BFG to delete files matching: .zip
# Using these jars: bfg-1.14.0.jar
# ...
# [audit] BFG cleanup completed.
# [audit] Pushing cleaned history (force)...
# [audit] Push succeeded.
# [audit] Audit and clean process finished.
```

⚠️ **Warning:** Force-pushing rewrites history. Notify your team before running this.

### `setup_lfs_and_fix.ps1` (Windows PowerShell)

**Actions:**
1. Installs or verifies Git LFS
2. Configures LFS for common binary types
3. Fetches and checks out LFS objects
4. Fixes corrupted LFS pointers

**Example:**
```powershell
.\setup_lfs_and_fix.ps1
# Output:
# [setup] Checking Git LFS installation...
# [setup] Git LFS is installed.
# [setup] Configuring LFS for binary file types...
# [setup] Fetching LFS objects...
# [setup] Checking out LFS objects...
# [setup] LFS setup complete.
```

---

## When to Use Each Script

### Run `audit.sh` / `audit_repo.ps1` Regularly
- **When:** Weekly or before each major release
- **Purpose:** Catch bloat, security issues, and Git health problems early
- **Action:** Review recommendations, don't force-push

### Run `audit_and_clean.ps1` Only When Needed
- **When:** Large file accidentally committed to main
- **Purpose:** Remove from history before it spreads
- **Caution:** Force-pushes rewrite history; coordinate with team

### Run `setup_lfs_and_fix.ps1` When
- Setting up a new development machine
- LFS pointer files appear instead of actual files
- Need to track new binary file types

---

## Troubleshooting

### audit.sh: "Permission denied"
```bash
chmod +x audit.sh
./audit.sh
```

### PowerShell: "execution of scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\audit_repo.ps1
```

### BFG: "Could not find or load main class"
```powershell
# Ensure Java is installed and in PATH
java -version

# If missing:
# Download from https://www.java.com/download/
```

### Large File Removal Failed
- Ensure no uncommitted changes: `git status`
- Verify Java is installed: `java -version`
- Manually run BFG: `java -jar bfg.jar --delete-files "*.zip"`
- Check disk space: `disk usage`

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for audit
      
      - name: Run audit
        run: chmod +x audit.sh && ./audit.sh
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: audit_report.md
```

---

## Best Practices

1. **Run audit.sh before tagging releases** – Catch issues early
2. **Review .gitignore regularly** – Add patterns for build artifacts
3. **Monitor Git repository size** – Watch for accidental large commits
4. **Use Git LFS for media** – Don't commit large binary files to regular Git
5. **Document ignored files** – Add comments to .gitignore explaining why
6. **Coordinate force-pushes** – Notify team before running `audit_and_clean.ps1`

---

## References

- [Build Documentation](BUILD.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Git LFS Documentation](https://git-lfs.github.com)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub Repository Size Best Practices](https://docs.github.com/en/repositories/working-with-files/managing-large-files)
