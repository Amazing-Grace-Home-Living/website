#!/usr/bin/env bash
# .github/verify-no-secrets.sh - Gatekeeper preventing credential leaks

set -euo pipefail

echo "🛡️ Auditing staged workspace files for exposed secrets..."

# 1. Look for files currently flagged in Git's staging layer, excluding binaries
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -vE '\.(png|jpg|jpeg|gif|zip|exe|jar|lock)$' || true)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No source files staged for commit. Skipping scan."
    exit 0
fi

FAILED=0

# 2. Iterate through each line of changed source files
for FILE in $STAGED_FILES; do
    if [ -f "$FILE" ]; then
        # Audit against common cryptographic profiles, tokens, and explicit passwords
        # Matches OpenAICodex, GitHub PATs, Bearer headers, and explicit vault dumps
        if grep -qE '(sk-(proj-|svcacct-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{15,}|github_pat_[A-Za-z0-9_]{16,}|Bearer\s+[A-Za-z0-9_.-]{20,}|"value"\s*:\s*"[A-Za-z0-9_-]{16,}")' "$FILE"; then
            echo "❌ CRITICAL SECURITY ERROR: Possible unencrypted credential identified in: $FILE"
            echo "👉 Remove the hardcoded token and direct it to your local hidden host vault instead."
            FAILED=1
        fi
    fi
done

if [ "$FAILED" -eq 1 ]; then
    echo "🛑 Commit rejected. Clean up your staged mutations before trying again."
    exit 1
fi

echo "✅ Secret validation sweep completed cleanly. Code secure."
exit 0
