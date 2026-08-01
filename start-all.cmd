@echo off
rem ─────────────────────────────────────────────────────────────────────────────
rem Sawa — start the whole local stack, detached from this window.
rem Safe to re-run: each service is skipped if its port is already in use.
rem   PostgreSQL :5432 · API :3000 · Admin :3001 · Website :3002
rem Stop everything with stop-all.cmd
rem ─────────────────────────────────────────────────────────────────────────────
setlocal
set "ROOT=%~dp0"
set "PG=C:\Users\DIGITAL AXIS\pg16"

echo.
echo [1/4] PostgreSQL...
netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul
if errorlevel 1 (
  "%PG%\pgsql\bin\pg_ctl.exe" -D "%PG%\data" -l "%PG%\pg.log" -w start
) else (
  echo        already running
)

echo [2/4] API on :3000...
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if errorlevel 1 (
  start "sawa-api" /min cmd /c "cd /d "%ROOT%backend" && node server.js"
) else (
  echo        already running
)

echo [3/4] Admin dashboard on :3001...
netstat -ano | findstr /R /C:":3001 .*LISTENING" >nul
if errorlevel 1 (
  start "sawa-admin" /min cmd /c "cd /d "%ROOT%admin" && npm start"
) else (
  echo        already running
)

echo [4/4] Website on :3002...
netstat -ano | findstr /R /C:":3002 .*LISTENING" >nul
if errorlevel 1 (
  start "sawa-web" /min cmd /c "cd /d "%ROOT%web" && npm start"
) else (
  echo        already running
)

echo.
echo   Website  http://localhost:3002
echo   Admin    http://localhost:3001   (admin@sawacars.com / admin1234)
echo   API      http://localhost:3000/health
echo.
endlocal
