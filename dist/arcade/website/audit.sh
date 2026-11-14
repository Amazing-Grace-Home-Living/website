#!/usr/bin/env bash
# audit.sh – Run static analysis and tests for the amazing-grace repo
# Supports JavaScript/TypeScript, HTML and Python

set -euo pipefail

echo "=== Running ESLint for JS/TS/HTML ==="
# Install dependencies if missing (npm ci prefers lockfile)
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npx eslint "**/*.{js,ts,jsx,tsx,html}" || echo "ESLint finished with errors"

echo "=== Running Flake8 for Python ==="
if command -v pip >/dev/null; then
  pip install -r requirements.txt || true
fi
pip install flake8 pytest || true
flake8 . || echo "Flake8 finished with errors"

echo "=== Running Pytest ==="
pytest || echo "Pytest finished with errors"

# Create a simple report
REPORT_FILE="audit_report.md"
{
  echo "# Audit Report"
  echo "Generated on $(date)"
  echo "\n## ESLint Output"
  echo "\n$(npx eslint "**/*.{js,ts,jsx,tsx,html}" 2>&1 || true)"
  echo "\n## Flake8 Output"
  echo "\n$(flake8 . 2>&1 || true)"
  echo "\n## Pytest Summary"
  echo "\n$(pytest -q 2>&1 || true)"
} > "$REPORT_FILE"

echo "Audit complete. Report saved to $REPORT_FILE"
