Set-Location $PSScriptRoot
Write-Host "AsterPath local preview → http://localhost:4173"
Start-Process "http://localhost:4173"
node server.mjs
