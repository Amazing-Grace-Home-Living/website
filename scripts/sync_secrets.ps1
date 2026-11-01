# Compatibility entry point for account-owned host credential setup.
# This script never exports credentials to .env, GitHub, Firebase, or browser assets.
param(
 [ValidateSet('','openai','gemini','anthropic','github','vercel','ollama','lmstudio')][string]$Provider = '',
 [switch]$Guide,
 [switch]$OpenProvider
)
$wizardPath = Join-Path $PSScriptRoot '../credential-setup.mjs'
$wizardArguments = @($wizardPath)
if ($Provider) { $wizardArguments += $Provider }
if ($Guide) { $wizardArguments += '--guide' }
if ($OpenProvider) { $wizardArguments += '--open' }
& node @wizardArguments
exit $LASTEXITCODE
