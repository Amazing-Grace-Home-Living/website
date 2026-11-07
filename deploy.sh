#!/usr/bin/env bash
# deploy.sh – Deploy Firebase backend using credentials from .env.local

set -euo pipefail

# Load .env.local (ignore comments and empty lines)
if [[ -f .env.local ]]; then
  export $(grep -v '^#' .env.local | grep -v '^\s*$' | xargs)
fi

if [[ -z "${FIREBASE_TOKEN:-}" ]]; then
  echo "⚠️  FIREBASE_TOKEN is missing in .env.local – aborting deployment."
  exit 1
fi

# Select the project (use the one from FIREBASE_PROJECT_ID if set, else fallback)
PROJECT_ID=${FIREBASE_PROJECT_ID:-amazing-grace-hl}
firebase use $PROJECT_ID

# Deploy functions, hosting and Remote Config (the Remote Config template will be created if missing)
FIREBASE_TOKEN=$FIREBASE_TOKEN firebase deploy --only functions,hosting,remoteconfig

echo "✅ Deployment completed for project $PROJECT_ID"
