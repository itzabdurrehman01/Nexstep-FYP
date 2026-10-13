@echo off
setlocal EnableDelayedExpansion
title NexStep — Run mobile (Expo Go)

set "FYP=%~dp0"
if "%FYP:~-1%"=="\" set "FYP=%FYP:~0,-1%"
set "MOBILE=%FYP%\nexstep-mobile"

if not exist "%MOBILE%\package.json" (
  echo [ERROR] Mobile folder not found: %MOBILE%
  pause
  exit /b 1
)

set "LAN_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
  set "CAND=%%A"
  set "CAND=!CAND: =!"
  echo !CAND! | findstr /R "^10\." >nul && set "LAN_IP=!CAND!"
  echo !CAND! | findstr /R "^192\.168\.[1-9][0-9]*\." >nul && (
    echo !CAND! | findstr /R "192\.168\.137\. 192\.168\.154\." >nul || set "LAN_IP=!CAND!"
  )
)
if not defined LAN_IP set "LAN_IP=10.0.2.2"

set "CLERK_KEY="
if exist "%MOBILE%\.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%MOBILE%\.env") do (
    if /I "%%A"=="EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" set "CLERK_KEY=%%B"
  )
)

(
  echo # NexStep Mobile — updated by RUN_MOBILE.bat
  echo EXPO_PUBLIC_API_URL=http://!LAN_IP!:3001
  echo EXPO_PUBLIC_ENV=development
  echo.
  echo # Clerk authentication
  echo EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=!CLERK_KEY!
) > "%MOBILE%\.env"

echo ============================================================
echo   NexStep mobile — Expo Go on your phone
echo   API:  http://!LAN_IP!:3001
echo   App:  exp://!LAN_IP!:8081
echo ============================================================
echo.
echo 1. Phone and this PC must be on the SAME Wi-Fi.
echo 2. Open the Expo Go app on your phone.
echo 3. Scan the QR code in this window.
echo.
echo Do NOT press A. That opens the Android Studio emulator.
echo Start RUN_WEBSITE.bat first if the API is not running.
echo.

cd /d "%MOBILE%"
REM --go = Expo Go QR only. Never launch an AVD / emulator.
npx expo start --go --host lan --port 8081
exit /b %ERRORLEVEL%
