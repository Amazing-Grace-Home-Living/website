# Deploy.ps1 – PowerShell wrapper to deploy Firebase using .env.local

# Load .env.local (ignore comments and empty lines)
$envFile = Join-Path $PSScriptRoot ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name  = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

# -----------------------------------------------------------------
# Verify we have a credential to talk to Firebase
# -----------------------------------------------------------------
if (-not $env:FIREBASE_TOKEN) {
    Write-Error "FIREBASE_TOKEN is missing in .env.local – aborting."
    exit 1
}
# (Optional) prefer service-account key if present
if ($env:GOOGLE_APPLICATION_CREDENTIALS) {
    Write-Host "Using service-account credentials from `$env:GOOGLE_APPLICATION_CREDENTIALS"
} else {
    Write-Host "Using deprecated FIREBASE_TOKEN – consider adding a service-account key."
}

# Choose project (fallback to default)
$project = $env:FIREBASE_PROJECT_ID
if ([string]::IsNullOrWhiteSpace($project)) {
    $project = "amazing-grace-hl"
}

# Select the Firebase project
firebase use $project

# Deploy functions, hosting and Remote Config
firebase deploy --only functions,hosting,remoteconfig

Write-Host "[OK] Deployment completed for project $project"