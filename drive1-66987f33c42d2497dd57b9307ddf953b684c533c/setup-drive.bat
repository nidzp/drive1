@echo off
setlocal ENABLEDELAYEDEXPANSION

:: ========= CONFIG =========
set "APP_ROOT=C:\Users\Home\Desktop\drive"
set "SERVER_DIR=%APP_ROOT%\server"
set "CLIENT_DIR=%APP_ROOT%\client"
set "NODE_MIN_VER=16"
:: ==========================

title Drive v1 - Setup
echo.
echo [Drive Setup] Ciljni folder: %APP_ROOT%
echo.

:: 1) Provera Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo [Greska] Node.js nije pronadjen. Instaliraj LTS verziju sa https://nodejs.org/ i pokreni skriptu ponovo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo [Info] Node verzija: %NODEV%

:: 2) Provera strukture
if not exist "%SERVER_DIR%\package.json" (
  echo [Greska] Nije pronadjen server\package.json u %SERVER_DIR%
  echo         Uveri se da je projekat raspakovan u %APP_ROOT%
  pause
  exit /b 1
)
if not exist "%CLIENT_DIR%\package.json" (
  echo [Greska] Nije pronadjen client\package.json u %CLIENT_DIR%
  pause
  exit /b 1
)

:: 3) Instalacija server deps
echo.
echo [Korak] Installing server dependencies...
pushd "%SERVER_DIR%"
call npm install
if errorlevel 1 (
  echo [Greska] npm install (server) nije uspeo.
  pause
  exit /b 1
)
popd

:: 4) Instalacija klijent deps + build
echo.
echo [Korak] Installing client dependencies + build...
pushd "%CLIENT_DIR%"
call npm install
if errorlevel 1 (
  echo [Greska] npm install (client) nije uspeo.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  echo [Greska] npm run build (client) nije uspeo.
  pause
  exit /b 1
)
popd

:: 5) .env
echo.
echo [Korak] Kopiranje .env...
if not exist "%SERVER_DIR%\.env" (
  copy "%SERVER_DIR%\.env.example" "%SERVER_DIR%\.env" >nul
)

:: 6) (Opcionalno) Dodaj firewall pravilo za port 8080 ako ga nema
echo.
echo [Korak] Firewall pravilo (port 8080)...
netsh advfirewall firewall show rule name="Drive v1 (8080)" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="Drive v1 (8080)" dir=in action=allow protocol=TCP localport=8080 >nul
)

:: 7) Start server
echo.
echo [Korak] Pokretanje servera...
pushd "%SERVER_DIR%"
start "Drive v1 Server" cmd /c "npm run start"
popd

echo.
echo [OK] Gotovo. U browseru otvori: http://localhost:8080  (ili sa drugog uredjaja: http://<IPv4>:8080)
echo [PIN] 1006
echo.
pause
exit /b 0
