@echo off
rem Stop the local Sawa stack started by start-all.cmd.
setlocal
set "PG=C:\Users\DIGITAL AXIS\pg16"

for %%P in (3002 3001 3000) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R ":%%P .*LISTENING"') do (
    echo stopping port %%P (pid %%I^)
    taskkill /PID %%I /F >nul 2>&1
  )
)

"%PG%\pgsql\bin\pg_ctl.exe" -D "%PG%\data" -m fast stop 2>nul
echo done.
endlocal
