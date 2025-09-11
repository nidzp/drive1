@echo off
set "APP_ROOT=C:\Users\Home\Desktop\drive"
cd /d "%APP_ROOT%\server"
start "Drive v1 Server" cmd /c "npm run start"
