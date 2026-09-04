@echo off
REM ---------------------------------------------------------------------------
REM Starts the FB Group Monitor ingest server and keeps it up.
REM Runs from wherever this file lives, so it works on any machine/path.
REM If node exits (crash, reboot of the app, etc.) it waits and restarts.
REM ---------------------------------------------------------------------------
title FB Group Monitor server
cd /d "%~dp0"

:loop
echo [%date% %time%] starting server...
node index.js
echo [%date% %time%] server exited - restarting in 5s (close this window to stop)
timeout /t 5 /nobreak >nul
goto loop
