# scripts/verify-arcade.ps1
$root = 'C:\Users\Nick\OneDrive\Documents\GitHub\amazing-grace\arcade'

Write-Host "`n=== Arcade repo verification ===`n"

# 1️⃣ Quiz component removed?
if (Test-Path "$root\BibleQuiz.tsx") {
    Write-Host "❌ BibleQuiz.tsx still present!"
} else {
    Write-Host "✅ BibleQuiz.tsx removed."
}

# 2️⃣ Tower‑defense component exists?
$td = Get-ChildItem $root -Recurse -Filter 'VimDefender.tsx' -File
if ($td) {
    Write-Host "✅ VimDefender (tower‑defense) found: $($td.FullName)"
} else {
    Write-Host "❌ VimDefender not found!"
}

# 3️⃣ Match‑3 placeholder exists?
$match = Get-ChildItem $root -Recurse -Filter 'Match3.tsx' -File
if ($match) {
    Write-Host "✅ Match3 placeholder found: $($match.FullName)"
} else {
    Write-Host "❌ Match3 placeholder missing!"
}

# 4️⃣ Pages directory for Next.js?
if (Test-Path "$root\pages") {
    Write-Host "✅ Next.js pages directory present."
} else {
    Write-Host "❌ pages directory missing – Next.js build will fail."
}
