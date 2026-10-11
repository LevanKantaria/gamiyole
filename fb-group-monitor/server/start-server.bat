@echo off
REM ---------------------------------------------------------------------------
REM Starts the FB Group Monitor ingest server and keeps it up.
REM Runs from wherever this file lives, so it works on any machine/path.
REM If node exits (crash, reboot of the app, etc.) it waits and restarts.
REM ---------------------------------------------------------------------------
title FB Group Monitor server
cd /d "%~dp0"

REM Publish qualifying driver rides to the gamiyole website automatically:
REM at startup, after any ingest that adds posts, at the end of every monitor
REM crawl, and every PROMOTE_INTERVAL_MIN minutes. Results go to promote.log
REM and GET /promote/status. Needs Firebase
REM credentials (serviceAccount.json in this folder) or it logs a skip and
REM carries on. Set to 0 if you'd rather promote by hand.
set AUTO_PROMOTE=1

:loop
echo [%date% %time%] starting server...
node index.js
echo [%date% %time%] server exited - restarting in 5s (close this window to stop)
timeout /t 5 /nobreak >nul
goto loop
