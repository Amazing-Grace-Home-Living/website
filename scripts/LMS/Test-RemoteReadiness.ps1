# Read-only checks. Does not print connection tokens or inspect credential files.
$ErrorActionPreference = 'Continue'
Write-Host 'Grace Remote: host readiness'
Write-Host ('Windows host: ' + $env:COMPUTERNAME)
Write-Host ('Windows user: ' + $env:USERNAME)
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($node) { & $node.Source --version } else { Write-Host 'Node: not on PATH' }
$native = Get-Command codex.exe -ErrorAction SilentlyContinue
$shim = Get-Command codex.cmd -ErrorAction SilentlyContinue
if ($native) { Write-Host 'Codex: native executable on PATH' }
elseif ($shim) { Write-Host 'Codex: npm wrapper found; Start-GraceRemote.ps1 can look for the native executable.' }
else { Write-Host 'Codex: not on PATH; verify installation and sign-in.' }
$sshService = Get-Service sshd -ErrorAction SilentlyContinue
if ($sshService) { Write-Host ('SSH server: ' + $sshService.Status + '; startup: ' + $sshService.StartType) } else { Write-Host 'SSH server: not installed' }
foreach ($port in @(8787,1234,11434)) {
 $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
 if ($listener) { Write-Host ("Port ${port}: listening on " + (($listener.LocalAddress | Sort-Object -Unique) -join ', ')) }
 else { Write-Host "Port ${port}: not listening" }
}
try {
 $result = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:1234/v1/models' -TimeoutSec 4
 if ($result.StatusCode -eq 200) { $modelList = $result.Content | ConvertFrom-Json; Write-Host ('LM Studio: local models endpoint responded; model count: ' + @($modelList.data).Count) }
} catch {
 if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { Write-Host 'LM Studio: reachable; authentication required (expected for a protected server).' }
 else { Write-Host 'LM Studio: local endpoint not verified. Start its server or check the configured port.' }
}
Write-Host 'These checks do not establish a phone tunnel or verify Codex, GitHub, or deployment permissions.'
