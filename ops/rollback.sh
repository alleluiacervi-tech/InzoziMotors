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
SERVICES="${SERVICES:-api web admin}"
READY_URL="${READY_URL:-http://127.0.0.1:4000/health/ready}"

run_bounded() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout --foreground "$secs" "$@"
  else
    "$@"
  fi
}

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
  # Ask a human when there is one. There often is not: this script is also
  # reachable from the Ops workflow, where stdin is the heredoc carrying the
  # script itself — a bare `read` there consumes the next LINE OF THIS FILE as
  # if it were an answer. Read from the terminal explicitly, and when there is
  # no terminal require the decision to have been made up front.
  if [ -r /dev/tty ] && [ -t 1 ]; then
    read -r -p "  Type 'continue' to roll back code only: " CONFIRM < /dev/tty
  else
    CONFIRM="${CONFIRM:-}"
    [ -n "$CONFIRM" ] || die "migrations were applied and there is no terminal to ask — re-run with CONFIRM=continue once you have decided (see above)"
  fi
  [ "$CONFIRM" = "continue" ] || die "stopped — nothing changed"
fi

log "checking out previous revision"
git checkout --quiet "$PREVIOUS_REVISION" || die "checkout failed"

# Rolling back used to mean REBUILDING on the production host — the same two
# Next.js compiles that wedge this box for 20-40 minutes, now on the critical
# path of an incident. Images are tagged per commit in the registry, so the way
# back is to pull the tag that was running before. Building stays as a fallback
# for a host with no registry access.
export IMAGE_TAG="${PREVIOUS_IMAGE_TAG:-latest}"
log "restoring image tag $IMAGE_TAG"
if run_bounded 600 $COMPOSE pull $SERVICES; then
  log "pulled the previous images"
else
  log "pull failed — falling back to building here (slow)"
  run_bounded 2400 $COMPOSE build $SERVICES || die "build failed"
fi

log "restarting"
run_bounded 300 $COMPOSE up -d --no-deps $SERVICES || die "restart failed — the host needs manual attention"

log "waiting for readiness"
for i in $(seq 1 30); do
  if curl -fsS -m 3 "$READY_URL" >/dev/null 2>&1; then
    log "healthy — rolled back to $(git rev-parse --short HEAD)"
    echo "$IMAGE_TAG" > "$STATE_DIR/image-tag" 2>/dev/null || true
    # Consumed, so a second rollback does not silently repeat the first.
    mv "$POINTER" "$POINTER.used-$(date -u +%Y%m%dT%H%M%SZ)"
    exit 0
  fi
  sleep 2
done

die "did not become ready within 60s — the host needs manual attention"
