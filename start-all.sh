#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Sawa — start the whole local stack, detached from this terminal.
# Safe to re-run: each service is skipped if its port is already in use.
#   PostgreSQL :5432 (Docker) · API :3000 · Admin :3001 · Website :3002
# Stop everything with ./stop-all.sh   Logs land in .logs/
# ─────────────────────────────────────────────────────────────────────────────
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$ROOT/.logs"

port_in_use() { ss -tln 2>/dev/null | grep -qE ":$1\b"; }

echo
echo "[1/4] PostgreSQL (Docker: sawa-db)..."
if port_in_use 5432; then
  echo "       already running"
else
  if docker start sawa-db >/dev/null 2>&1; then :; else
    docker run -d --name sawa-db --restart unless-stopped \
      -e POSTGRES_DB=sawa -e POSTGRES_USER=sawa -e POSTGRES_PASSWORD=sawa_dev \
      -v sawa_postgres_data:/var/lib/postgresql/data \
      -p 5432:5432 postgres:16-alpine >/dev/null
  fi
  until docker exec sawa-db pg_isready -U sawa -d sawa >/dev/null 2>&1; do sleep 1; done
fi

echo "[2/4] API on :3000..."
if port_in_use 3000; then
  echo "       already running"
else
  (cd "$ROOT/backend" && setsid nohup npm run dev >"$ROOT/.logs/api.log" 2>&1 & echo $! >"$ROOT/.logs/api.pid")
fi

echo "[3/4] Admin dashboard on :3001..."
if port_in_use 3001; then
  echo "       already running"
else
  (cd "$ROOT/admin" && setsid nohup npm run dev >"$ROOT/.logs/admin.log" 2>&1 & echo $! >"$ROOT/.logs/admin.pid")
fi

echo "[4/4] Website on :3002..."
if port_in_use 3002; then
  echo "       already running"
else
  (cd "$ROOT/web" && setsid nohup npm run dev >"$ROOT/.logs/web.log" 2>&1 & echo $! >"$ROOT/.logs/web.pid")
fi

echo
echo "  Website  http://localhost:3002"
echo "  Admin    http://localhost:3001   (admin@sawacars.com / admin1234)"
echo "  API      http://localhost:3000/health"
echo
