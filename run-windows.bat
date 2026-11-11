@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required. Download it from https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo  ASTERPATH - PREMIUM LOCAL PREVIEW
echo  ---------------------------------
echo  Your browser URL: http://localhost:4173
echo  Press Ctrl+C to stop the server.
echo.
start "" "http://localhost:4173"
node server.mjs
if errorlevel 1 pause
