## sync_secrets.ps1
# PowerShell script to synchronize secrets stored in Antigravity's credential manager
# with local .env, GitHub secrets, Firebase config, Vercel env vars and Google Secret Manager.
# This script assumes you have already added the required secrets to Antigravity via the
# credentials side‑panel (or the `credentials` skill). The secret names used here must match
# those stored in Antigravity.

param(
    [switch]$CreateDotEnv,   # Create/overwrite .env in the current working directory
    [switch]$PushGitHub,     # Push to GitHub repository secrets (requires GITHUB_PAT)
    [switch]$PushFirebase,   # Update Firebase project env config (requires FIREBASE_PROJECT & FIREBASE_TOKEN)
    [switch]$PushVercel,     # Update Vercel project env vars (requires VERCEL_TOKEN & VERCEL_PROJECT_ID)
    [switch]$PushGSM         # Push to Google Secret Manager (requires GOOGLE_APPLICATION_CREDENTIALS path)
)

function Get-SecretValue {
    param([string]$Name)
    # Antigravity exposes a hidden CLI – in practice you would call the `agy credentials get` command.
    # Here we simulate it with a placeholder. Replace the line below with the actual command.
    $value = & agy credentials get $Name -s silent
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to retrieve secret '$Name' from Antigravity."
        exit 1
    }
    return $value.Trim()
}

# Define the mapping of logical secret names to target platform identifiers
$secretMap = @{
    "OPENAI_API_KEY"      = "OPENAI_API_KEY"
    "GITHUB_PAT"          = "GITHUB_PAT"
    "FIREBASE_TOKEN"      = "FIREBASE_TOKEN"
    "FIREBASE_PROJECT"    = "FIREBASE_PROJECT"
    "VERCEL_TOKEN"        = "VERCEL_TOKEN"
    "VERCEL_PROJECT_ID"   = "VERCEL_PROJECT_ID"
    "GOOGLE_DRIVE_TOKEN"  = "GOOGLE_DRIVE_TOKEN"
    "AZURE_CLIENT_SECRET" = "AZURE_CLIENT_SECRET"
    # add additional secrets as needed
}

# 1️⃣ Create .env file
if ($CreateDotEnv) {
    $envPath = Join-Path -Path (Get-Location) -ChildPath ".env"
    "# Auto‑generated .env – DO NOT commit to version control" | Out-File -FilePath $envPath -Encoding utf8
    foreach ($key in $secretMap.Keys) {
        $val = Get-SecretValue $key
        "${key}=${val}" | Out-File -FilePath $envPath -Append -Encoding utf8
    }
    Write-Host ".env file written to $envPath"
}

# 2️⃣ Push to GitHub secrets (requires GITHUB_PAT and a repo URL)
if ($PushGitHub) {
    $repo = Read-Host "Enter the GitHub repository (owner/repo)"
    $pat  = Get-SecretValue "GITHUB_PAT"
    foreach ($key in $secretMap.Keys) {
        $value = Get-SecretValue $key
        $apiUrl = "https://api.github.com/repos/$repo/actions/secrets/$key"
        $publicKeyUrl = "https://api.github.com/repos/$repo/actions/secrets/public-key"
        # Retrieve the public key for encrypting the secret
        $pubKeyResp = Invoke-RestMethod -Method Get -Uri $publicKeyUrl -Headers @{Authorization = "token $pat"}
        $keyId = $pubKeyResp.key_id
        $key   = $pubKeyResp.key
        # Encrypt using libsodium (requires sodium-native PowerShell module)
        $encrypted = [Convert]::ToBase64String([Sodium.SecretBox]::Create($value, $key))
        $payload = @{encrypted_value=$encrypted; key_id=$keyId} | ConvertTo-Json
        Invoke-RestMethod -Method Put -Uri $apiUrl -Headers @{Authorization = "token $pat"; "Content-Type" = "application/json"} -Body $payload
        Write-Host "GitHub secret $key set"
    }
}

# 3️⃣ Firebase environment config
if ($PushFirebase) {
    $fbProject = Get-SecretValue "FIREBASE_PROJECT"
    $fbToken   = Get-SecretValue "FIREBASE_TOKEN"
    foreach ($key in $secretMap.Keys) {
        $value = Get-SecretValue $key
        $setCmd = "firebase functions:config:set $key='$value' --project $fbProject --token $fbToken"
        & cmd /c $setCmd
        Write-Host "Firebase config $key updated"
    }
}

# 4️⃣ Vercel environment variables
if ($PushVercel) {
    $vercelToken = Get-SecretValue "VERCEL_TOKEN"
    $projectId   = Get-SecretValue "VERCEL_PROJECT_ID"
    foreach ($key in $secretMap.Keys) {
        $value = Get-SecretValue $key
        $api = "https://api.vercel.com/v9/projects/$projectId/env"
        $body = @{
            key   = $key
            value = $value
            target = @("development","preview","production")
            type   = "encrypted"
        } | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri $api -Headers @{Authorization = "Bearer $vercelToken"; "Content-Type" = "application/json"} -Body $body
        Write-Host "Vercel env $key set"
    }
}

# 5️⃣ Google Secret Manager sync (requires GOOGLE_APPLICATION_CREDENTIALS env pointing to a service‑account JSON)
if ($PushGSM) {
    $projectId = (gcloud config get-value project)
    foreach ($key in $secretMap.Keys) {
        $value = Get-SecretValue $key
        $secretName = "projects/$projectId/secrets/$key"
        # Create secret if it does not exist
        gcloud secrets create $key --replication-policy=automatic 2>$null || $null
        # Add a new version
        $tempFile = [IO.Path]::GetTempFileName()
        Set-Content -Path $tempFile -Value $value -Encoding utf8
        gcloud secrets versions add $key --data-file=$tempFile
        Remove-Item $tempFile
        Write-Host "Google Secret Manager secret $key updated"
    }
}

Write-Host "Sync completed. Use -CreateDotEnv / -PushGitHub / -PushFirebase / -PushVercel / -PushGSM switches as needed."
