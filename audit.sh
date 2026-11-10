#!/usr/bin/env bash
# audit.sh – Run static analysis and tests for the Nexus OS repository
# Supports JavaScript/TypeScript, HTML, and optional Python

set -euo pipefail

REPORT_FILE="${1:-audit_report.md}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[audit]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
log_error() { echo -e "${RED}[error]${NC} $1"; }

# Ensure we're in the repo root
if [ ! -f package.json ]; then
  log_error "Not in repository root. Run from the directory containing package.json"
  exit 1
fi

log_info "Starting repository audit..."
{
  echo "# Nexus OS Repository Audit Report"
  echo "Generated: $(date)"
  echo ""
} > "$REPORT_FILE"

# ---------------------------------------------------
# 1. Dependency audit
# ---------------------------------------------------
log_info "Checking dependencies (npm audit)..."
{
  echo "## Dependency Audit"
  echo ""
  echo '```'
} >> "$REPORT_FILE"
npm audit --production 2>&1 | tee -a "$REPORT_FILE" || log_warn "npm audit found issues (non-fatal)"
{
  echo '```'
  echo ""
} >> "$REPORT_FILE"

# ---------------------------------------------------
# 2. Install dependencies if needed
# ---------------------------------------------------
if [ ! -d node_modules ]; then
  log_info "Installing dependencies..."
  if [ -f package-lock.json ]; then
    npm ci >> "$REPORT_FILE" 2>&1
  else
    npm install >> "$REPORT_FILE" 2>&1
  fi
fi

# ---------------------------------------------------
# 3. ESLint (JavaScript/TypeScript/HTML)
# ---------------------------------------------------
log_info "Running ESLint..."
{
  echo "## ESLint (JS/TS/HTML)"
  echo ""
  echo '```'
} >> "$REPORT_FILE"
npx eslint . --format json 2>&1 | tee -a "$REPORT_FILE" || log_warn "ESLint found issues"
{
  echo '```'
  echo ""
} >> "$REPORT_FILE"

# ---------------------------------------------------
# 4. Python checks (if Python/pip available)
# ---------------------------------------------------
if command -v python3 &>/dev/null || command -v python &>/dev/null; then
  log_info "Python detected. Running Python checks..."
  {
    echo "## Python Linting"
    echo ""
  } >> "$REPORT_FILE"

  if command -v pip &>/dev/null; then
    pip install --quiet flake8 pytest 2>/dev/null || true

    if command -v flake8 &>/dev/null; then
      {
        echo "### Flake8"
        echo '```'
      } >> "$REPORT_FILE"
      flake8 . 2>&1 | tee -a "$REPORT_FILE" || log_warn "Flake8 found issues"
      {
        echo '```'
        echo ""
      } >> "$REPORT_FILE"
    fi

    if command -v pytest &>/dev/null && [ -d tests ]; then
      {
        echo "### Pytest"
        echo '```'
      } >> "$REPORT_FILE"
      pytest -q 2>&1 | tee -a "$REPORT_FILE" || log_warn "Pytest found issues"
      {
        echo '```'
        echo ""
      } >> "$REPORT_FILE"
    fi
  fi
else
  log_warn "Python not detected. Skipping Python checks."
fi

# ---------------------------------------------------
# 5. Git repository health
# ---------------------------------------------------
log_info "Checking Git repository health..."
{
  echo "## Repository Health"
  echo ""
  echo "### Status"
  echo '```'
  git status -sb
  echo '```'
  echo ""
  echo "### Large Files (>50 MB)"
  echo '```'
} >> "$REPORT_FILE"

git rev-list --objects --all 2>/dev/null | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk 'BEGIN {print "Size (MB)\tPath"} $3 > 52428800 {printf "%.2f\t%s\n", $3/1024/1024, $4}' | \
  sort -rn | tee -a "$REPORT_FILE" || log_warn "Could not scan for large files"

{
  echo '```'
  echo ""
} >> "$REPORT_FILE"

# ---------------------------------------------------
# 6. Git LFS info (if installed)
# ---------------------------------------------------
if command -v git-lfs &>/dev/null || git config --get filter.lfs.clean &>/dev/null; then
  log_info "Checking Git LFS..."
  {
    echo "### Git LFS Files"
    echo '```'
    git lfs ls-files 2>/dev/null || echo "No LFS files tracked"
    echo '```'
    echo ""
  } >> "$REPORT_FILE"
fi

# ---------------------------------------------------
# 7. .gitignore validation
# ---------------------------------------------------
log_info "Validating .gitignore..."
{
  echo "### .gitignore Check"
  echo '```'
} >> "$REPORT_FILE"

# Warn if common build/node artifacts are not ignored
for pattern in "node_modules/" ".env" "dist/"; do
  if grep -q "^${pattern}" .gitignore 2>/dev/null; then
    echo "✓ $pattern is ignored" >> "$REPORT_FILE"
  else
    echo "⚠ $pattern is NOT ignored (recommended)" >> "$REPORT_FILE"
  fi
done

{
  echo '```'
  echo ""
  echo "---"
  echo "**Report generated at:** $(date)"
  echo "**Files checked:** ESLint, npm audit, $(command -v git &>/dev/null && echo 'Git history')"
} >> "$REPORT_FILE"

log_info "Audit complete. Full report saved to: $REPORT_FILE"
log_info "View with: cat $REPORT_FILE"
