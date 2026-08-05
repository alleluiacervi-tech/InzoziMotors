#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Roll back to the revision that was running before the last deploy.
#
#   ops/rollback.sh
#
# Reads the pointer ops/deploy.sh wrote, so this needs no arguments and no
# memory of what was previously deployed — which is the point, because the
# moment you need it is the moment nobody remembers.
#
# THE PART THAT DOES NOT ROLL BACK AUTOMATICALLY: migrations.
#
# Reverting code is cheap and safe. Reverting a schema is neither, and doing
# it blind destroys data. If the failed deploy carried migrations, this stops
# and tells you, because the right answer depends on what the migration did:
#
#   Additive (new column/table/index)  — usually leave it. Old code ignores a
#                                        column it does not know about, which
#                                        is why migrations should be additive.
#   Destructive (dropped/renamed)      — restore from the backup deploy.sh
#                                        took, with ops/restore.sh.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

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
POINTER="$STATE_DIR/rollback"

log() { printf '\n▸ %s\n' "$*"; }
die() { printf '\nROLLBACK FAILED: %s\n' "$*" >&2; exit 1; }

cd "$(dirname "$0")/.."

[ -f "$POINTER" ] || die "no rollback pointer at $POINTER — deploy.sh has not run on this host"
# shellcheck disable=SC1090
. "$POINTER"
[ -n "${PREVIOUS_REVISION:-}" ] || die "pointer is missing PREVIOUS_REVISION"

log "rolling back to $(git rev-parse --short "$PREVIOUS_REVISION") ($(git log -1 --format=%s "$PREVIOUS_REVISION"))"

if [ "${HAD_MIGRATIONS:-0}" -gt 0 ]; then
  cat <<WARNING

  ⚠  The deploy being rolled back applied ${HAD_MIGRATIONS} migration(s).

  Reverting the code does NOT revert the schema. Decide which case this is:

    • Additive change (new column, table or index)
      Leave the schema. The old code ignores what it does not know about.
      Safe to continue.

    • Destructive change (dropped or renamed something the old code reads)
      Continuing will leave the old code querying a schema that no longer
      matches it. Restore the backup instead:

          ops/restore.sh <the dump deploy.sh took>

WARNING
  read -r -p "  Type 'continue' to roll back code only: " CONFIRM
  [ "$CONFIRM" = "continue" ] || die "stopped — nothing changed"
fi

log "checking out previous revision"
git checkout --quiet "$PREVIOUS_REVISION" || die "checkout failed"

log "rebuilding"
$COMPOSE build api web admin || die "build failed"

log "restarting"
$COMPOSE up -d api web admin || die "restart failed — the host needs manual attention"

log "waiting for readiness"
for i in $(seq 1 30); do
  if curl -fsS -m 3 http://127.0.0.1:4000/health/ready >/dev/null 2>&1; then
    log "healthy — rolled back to $(git rev-parse --short HEAD)"
    # Consumed, so a second rollback does not silently repeat the first.
    mv "$POINTER" "$POINTER.used-$(date -u +%Y%m%dT%H%M%SZ)"
    exit 0
  fi
  sleep 2
done

die "did not become ready within 60s — the host needs manual attention"
