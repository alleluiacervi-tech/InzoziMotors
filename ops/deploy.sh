#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Deploy, with a way back.
#
# The documented deploy was `git pull && npm install && pm2 restart`. Nothing
# was tagged, so "roll back" meant checking out an older SHA and rebuilding
# under pressure, hoping the schema had not moved. There was no record of what
# was previously running.
#
# This records the current revision before changing anything, takes a database
# backup when the deploy carries migrations, and writes a rollback pointer that
# ops/rollback.sh reads. It refuses to deploy a dirty working tree, because
# "what is actually running?" must have an answer.
#
#   ops/deploy.sh                 # deploy origin/main
#   ops/deploy.sh v1.2.0          # deploy a tag or SHA
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TARGET="${1:-origin/main}"
STATE_DIR="${STATE_DIR:-/var/lib/sawa}"
# Which compose file? Plain `docker compose` picks docker-compose.yml — the
# DEVELOPMENT file, which publishes Postgres on 5432. Running that against a
# live host recreates the database container with a published port, collides
# with the running stack ("address already in use") and leaves the database
# down while the site still serves — an outage that looks like a healthy deploy
# until someone opens the marketplace and finds no cars.
#
# So: if a production compose file is present, that is the default. Override
# with COMPOSE=... for anything unusual.
DEFAULT_COMPOSE="docker compose"
[ -f docker-compose.prod.yml ] && DEFAULT_COMPOSE="docker compose -f docker-compose.prod.yml"
COMPOSE="${COMPOSE:-$DEFAULT_COMPOSE}"

log() { printf '\n▸ %s\n' "$*"; }
die() { printf '\nDEPLOY FAILED: %s\n' "$*" >&2; exit 1; }

cd "$(dirname "$0")/.."
mkdir -p "$STATE_DIR"

# ─── Refuse to deploy something that is not in git ───────────────────────────
[ -z "$(git status --porcelain)" ] || die "working tree is dirty — commit or stash first"

PREVIOUS="$(git rev-parse HEAD)"
log "current revision: $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"

git fetch --all --tags --quiet || die "git fetch failed"
git rev-parse --verify "$TARGET" >/dev/null 2>&1 || die "unknown revision: $TARGET"
NEXT="$(git rev-parse "$TARGET")"

if [ "$PREVIOUS" = "$NEXT" ]; then
  log "already at $TARGET — nothing to do"
  exit 0
fi

# ─── Does this deploy change the schema? ────────────────────────────────────
# Migrations are the part that cannot be undone by checking out the old code,
# so they decide whether a backup is mandatory.
NEW_MIGRATIONS="$(git diff --name-only "$PREVIOUS" "$NEXT" -- backend/migrations/ | wc -l)"
if [ "$NEW_MIGRATIONS" -gt 0 ]; then
  log "$NEW_MIGRATIONS migration(s) in this deploy — taking a backup first"
  ops/backup.sh || die "backup failed; not deploying with pending schema changes"
else
  log "no migrations in this deploy"
fi

# ─── Record how to get back ─────────────────────────────────────────────────
cat > "$STATE_DIR/rollback" <<EOF
# Written by ops/deploy.sh at $(date -u +%Y-%m-%dT%H:%M:%SZ)
PREVIOUS_REVISION=$PREVIOUS
DEPLOYED_REVISION=$NEXT
HAD_MIGRATIONS=$NEW_MIGRATIONS
EOF
log "rollback pointer written to $STATE_DIR/rollback"

# ─── Deploy ─────────────────────────────────────────────────────────────────
log "checking out $TARGET"
git checkout --quiet "$NEXT" || die "checkout failed"

log "building"
$COMPOSE build api web admin || die "build failed — still running the old containers"

log "applying migrations"
$COMPOSE run --rm api node src/migrate.js || die "migrations failed — old containers still serving"

log "restarting services"
$COMPOSE up -d api web admin || die "restart failed — run ops/rollback.sh"

# ─── Confirm it actually works ──────────────────────────────────────────────
log "waiting for readiness"
for i in $(seq 1 30); do
  if curl -fsS -m 3 http://127.0.0.1:4000/health/ready >/dev/null 2>&1; then
    log "healthy — deployed $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"
    exit 0
  fi
  sleep 2
done

die "did not become ready within 60s — run ops/rollback.sh"
