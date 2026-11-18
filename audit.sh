#!/usr/bin/env bash
# Reproducible audit; do not hide failed commands behind '|| true'.
set -euo pipefail

report="audit_report.md"
printf '# Website quality audit\n\nRun: %s UTC\n\n' "$(date -u '+%Y-%m-%d %H:%M:%S')" > "$report"

run_check() {
  local name="$1"
  shift
  printf '## %s\n\n' "$name" >> "$report"
  if "$@" > /tmp/aghl-audit-step.log 2>&1; then
    printf 'PASS\n\n' >> "$report"
  else
    printf 'FAIL (exit %s)\n\n```text\n' "$?" >> "$report"
    tail -n 80 /tmp/aghl-audit-step.log >> "$report"
    printf '\n```\n' >> "$report"
    cat /tmp/aghl-audit-step.log >&2
    return 1
  fi
}

run_check 'Lint, tests, types and build' npm run check
run_check 'Local links' npm run audit:links
