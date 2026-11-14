@echo off
rem -------------------------------------------------
rem Deploy Firebase backend (runs deploy.ps1 using Windows PowerShell)
rem -------------------------------------------------
pushd "%~dp0"
"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1
popd
