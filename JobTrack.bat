@echo off
title JobTrack Launcher

cd /d "%~dp0"

echo Starting JobTrack backend...
start "JobTrack Backend" cmd /k "cd /d D:\PROJECTS\jobtrack\server && npm start"

timeout /t 3 /nobreak >nul

echo Starting JobTrack frontend...
start "JobTrack Frontend" cmd /k "cd /d D:\PROJECTS\jobtrack && npm run dev -- --host 127.0.0.1"

timeout /t 3 /nobreak >nul

start "" "http://localhost:5173"

exit
