$repo = 'C:\Users\Nick\.gemini\antigravity\scratch\AmazingGraceWebsite2'
$darkCss = Join-Path $repo 'src\theme\dark.css'
# Ensure dark.css exists
if (-not (Test-Path $darkCss)) { New-Item -ItemType File -Path $darkCss -Force | Out-Null }

Get-ChildItem -Path (Join-Path $repo 'arcade') -Recurse -Filter *.html | ForEach-Object {
    $filePath = $_.FullName
    $content = Get-Content $filePath -Raw
    # Inject dark stylesheet and critical CSS before </head>
    $headInject = '<link rel="stylesheet" href="/src/theme/dark.css" media="(prefers-color-scheme: dark)" onload="this.media=''all''">' + "`n" + '<style>.BannerDescription{font-size:clamp(2.5rem,5.5vw,4.5rem);line-height:1.1;color:var(--ink);}</style>'
    $content = $content -replace '</head>', "$headInject</head>"
    # Insert placeholder screenshot before </body>
    $gameName = $_.BaseName
    $placeholder = "<figure><img src='https://via.placeholder.com/300x200?text=$gameName' alt='Screenshot of $gameName game' loading='lazy'></figure>"
    $content = $content -replace '</body>', "$placeholder</body>"
    Set-Content -Path $filePath -Value $content -Force
}
