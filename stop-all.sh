#!/usr/bin/env bash
# Sawa — stop everything started by start-all.sh.
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"

for svc in api admin web; do
  pidfile="$ROOT/.logs/$svc.pid"
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile")"
    # Kill the npm process group (npm → next/nodemon → node)
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null
    rm -f "$pidfile"
    echo "stopped $svc"
  fi
done

# Fallback for dev servers started outside start-all.sh
pkill -f "next dev -p 3001" 2>/dev/null && echo "stopped admin (fallback)"
pkill -f "next dev -p 3002" 2>/dev/null && echo "stopped web (fallback)"
pkill -f "nodemon server.js" 2>/dev/null && echo "stopped api (fallback)"

docker stop sawa-db >/dev/null 2>&1 && echo "stopped postgres"
