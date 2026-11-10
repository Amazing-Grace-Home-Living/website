# Troubleshooting Guide

Common issues and their solutions.

## Build & Installation

### npm ERR! code ERESOLVE
**Problem:** Dependency conflict during `npm install`

**Solutions:**
```bash
# Option 1: Use npm ci with existing lock file
npm ci

# Option 2: Use legacy peer deps resolver
npm install --legacy-peer-deps

# Option 3: Clean install
rm -rf node_modules package-lock.json
npm install
```

### Module not found errors
**Problem:** After cloning or switching branches

**Solution:**
```bash
npm ci
npm run build
```

---

## Testing Issues

### Browser Tests Fail: "Chrome not found"
**Problem:** Playwright cannot locate Chrome/Edge

**Solution:**
```bash
# macOS
which google-chrome      # or 'which chromium-browser'
export CHROME_PATH=$(which google-chrome)
npm run test:browser

# Windows PowerShell
$edge = (Get-Command msedge -ErrorAction SilentlyContinue).Source
if ($edge) { $env:CHROME_PATH = $edge }
npm run test:browser

# Linux
sudo apt-get install chromium-browser
export CHROME_PATH=/usr/bin/chromium-browser
npm run test:browser
```

### Browser Tests Timeout
**Problem:** Tests hang or timeout

**Solutions:**
1. Increase timeout in test config
2. Run with verbose output:
   ```bash
   DEBUG=pw:api npm run test:browser
   ```
3. Check system resources (disk space, memory)
4. Rebuild: `npm run build` before testing

### Specific Test Fails
**Problem:** One test suite fails while others pass

**Solution:**
```bash
# Run just that test with verbose output
node --test tests/vim-defense.test.mjs

# Or with debugging
node --inspect-brk tests/vim-defense.test.mjs
```

---

## Git & Repository Issues

### Large File Committed Accidentally
**Problem:** Pushed a 100+ MB file and need to remove it

**Solutions:**

**If NOT yet pushed to main:**
```bash
# Remove from working directory and last commit
rm large-file.zip
git reset HEAD~1                    # Undo last commit
git rm --cached large-file.zip      # Remove from index
git commit -m "Remove large file"
```

**If already pushed to main (use BFG):**
```bash
# Windows PowerShell
.\audit_and_clean.ps1 -SizeThresholdMB 100

# Manual (requires Java):
java -jar bfg.jar --delete-files "*.zip" --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force-with-lease origin main
```

⚠️ **Warning:** Force-pushing rewrites history. Notify team before doing this.

### "Permission denied" on Windows Build
**Problem:** Antivirus blocks file creation during build

**Solution:**
1. Temporarily disable Real-Time Protection in Windows Security
2. Run build: `npm run build`
3. Re-enable Real-Time Protection immediately

### Git LFS Issues
**Problem:** LFS files show as pointer stubs instead of actual files

**Solution:**
```bash
./setup_lfs_and_fix.ps1           # Windows
# or manually:
git lfs install
git lfs fetch --all
git lfs checkout
```

---

## Deployment Issues

### Vercel Build Fails
**Problem:** Build works locally but fails on Vercel

**Checklist:**
1. Verify locally: `npm ci && npm run build && npm run test`
2. Check [Vercel dashboard](https://vercel.com) for logs
3. Ensure no secrets in `.env` (check `.gitignore`)
4. Verify Node version matches project settings
5. Check for large files in git history:
   ```bash
   npm run audit:links
   ```

### Site Not Updating After Push
**Problem:** Changes don't appear after deployment

**Solutions:**
1. Wait 2-5 minutes for Vercel rebuild
2. Check Vercel [deployment logs](https://vercel.com/dashboard)
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Clear Cloudflare cache (if applicable)
5. Verify branch being deployed is `main`

---

## Windows-Specific Issues

### PowerShell Scripts Won't Run
**Problem:** "execution of scripts is disabled"

**Solution:**
```powershell
# Allow scripts for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run single script
powershell -ExecutionPolicy Bypass -File .\audit_repo.ps1
```

### Path with Spaces Breaks Scripts
**Problem:** Script path contains spaces

**Solution:**
```powershell
# Use quotes
cd "C:\Users\My Documents\GitHub\website"
.\audit_repo.ps1
```

---

## Linux/macOS Issues

### npm: Command Not Found
**Problem:** Node.js not installed or not in PATH

**Solution:**
```bash
# macOS (using Homebrew)
brew install node

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nodejs npm

# Verify
node --version
npm --version
```

### Permission Denied on Bash Scripts
**Problem:** `./audit.sh` shows permission error

**Solution:**
```bash
chmod +x audit.sh ./audit.sh
```

---

## Grace Remote Issues

### Grace Remote Won't Start
**Problem:** `npm start` fails

**Solution:**
```bash
# Check Node version
node --version

# Clear cache
rm -rf node_modules
npm ci

# Try again
npm start

# With debug output
DEBUG=* npm start
```

### Connection Token Invalid
**Problem:** Grace Remote can't connect

**Solution:**
See [Grace Remote Setup](grace-remote.md) for token generation.

---

## Memory & Performance

### Out of Memory During Build
**Problem:** Build crashes with "FATAL ERROR: ... JavaScript heap out of memory"

**Solution:**
```bash
# Increase Node heap size
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Or for tests
NODE_OPTIONS=--max-old-space-size=2048 npm test
```

### Build Extremely Slow
**Problem:** `npm run build` takes >5 minutes

**Solutions:**
1. Check disk I/O: `iostat -x 1`
2. Check for running antivirus scans
3. Increase heap size (see above)
4. Check available disk space: `df -h`

---

## Security & Credentials

### Accidentally Committed .env or Secrets
**Problem:** Credentials visible in git history

**Solution:**
1. **Immediately:** Rotate all credentials
2. **Remove from history:** Use BFG
   ```bash
   java -jar bfg.jar --delete-files ".env" --no-blob-protection
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force-with-lease origin main
   ```
3. **Prevent future commits:** Update `.gitignore`

---

## Getting Help

1. **Check this guide** for your specific issue
2. **Run diagnostics:**
   ```bash
   node --version
   npm --version
   git --version
   npm list
   npm run audit:links
   ```
3. **Check [BUILD.md](BUILD.md)** for command reference
4. **Enable verbose output:**
   ```bash
   npm run build -- --verbose
   DEBUG=* npm run dev
   ```
5. **Search [GitHub Issues](https://github.com/Amazing-Grace-Home-Living/website/issues)**
6. **Create a new issue** with:
   - Your OS and versions (node, npm, git)
   - Full error message
   - Steps to reproduce
   - Output of diagnostic commands above
