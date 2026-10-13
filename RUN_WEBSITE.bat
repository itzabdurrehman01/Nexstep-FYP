@echo off
setlocal EnableDelayedExpansion
title NexStep — Run website

set "FYP=%~dp0"
if "%FYP:~-1%"=="\" set "FYP=%FYP:~0,-1%"
set "WEB=%FYP%\nexstep-frontend-main"
set "API=%FYP%\nexstep-backend-main"

if not exist "%WEB%\package.json" (
  echo [ERROR] Website folder not found: %WEB%
  pause
  exit /b 1
)
if not exist "%API%\package.json" (
  echo [ERROR] API folder not found: %API%
  pause
  exit /b 1
)

echo ============================================================
echo   NexStep website
echo   API:  http://localhost:3001
echo   Web:  http://localhost:5173
echo ============================================================
echo.

start "NexStep API" cmd /k "cd /d "%API%" && npm run dev"
start "NexStep Web" cmd /k "cd /d "%WEB%" && npm run dev"

echo Waiting for the website to start...
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo Two windows are open: NexStep API and NexStep Web.
echo Close those windows to stop the servers.
echo.
exit /b 0
