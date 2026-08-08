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
#
# ── How the images get here ──────────────────────────────────────────────────
#   SKIP_BUILD=1    the images are already in the local daemon. This is what CI
#                   does: .github/workflows/deploy.yml builds them on the
#                   runner and ships them with `docker save | ssh docker load`,
#                   so the VPS compiles nothing.
#   (unset)         build them here. Slow on a small box — a last resort, kept
#                   so a human with SSH and no CI can still ship.
#
# Pulling immutable per-commit tags from a registry instead would move only the
# layers that changed, and is the intended next step — but it is a separate
# change with its own bootstrap and rollback problems. See
# docs/DEPLOY-PHASE-2.md before reintroducing it.
#
# ── Environment ──────────────────────────────────────────────────────────────
#   SKIP_BUILD=1     the images are already loaded here; do not build.
#   MIGRATE_TIMEOUT  seconds to allow for migrations (default 300).
#   BACKUP_TIMEOUT   seconds to allow for the pre-migration backup (default 900).
#   SKIP_PRUNE=1     leave reclaimable disk alone.
#   READY_URL        readiness probe (default http://127.0.0.1:4000/health/ready)
#
# ── Time budget — keep in step with the workflow ─────────────────────────────
# Every step that talks to the network, to Docker or to the database goes
# through run_bounded, so this script cannot outlive the sum of its own budgets:
#
#   fetch 120 + backup 900 + up db 180 + migrate 300 + restart 300
#   + readiness 150 + image prune 120 + builder prune 300  =  2370s (39m30s)
#
# .github/workflows/deploy.yml sizes its Deploy step ABOVE that sum deliberately
# (50 minutes, which also covers its own SSH connect retries). An outer timeout
# that fires first kills the deploy at an arbitrary point — for instance between
# the migration and the restart, leaving the new schema applied, the new code
# checked out and the OLD containers still serving. That is the exact failure
# this file's bounds exist to convert into a legible error. If you change a
# budget here, change the cap there.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Run from a copy, because this script checks out over itself ─────────────
# bash reads a script incrementally, not all at once. `git checkout` below
# replaces THIS FILE mid-execution, after which bash keeps reading at its old
# byte offset — in a file whose contents have shifted. That is how a deploy
# starts executing fragments of a line. Re-exec from an immutable copy first;
# the checkout can then rewrite ops/deploy.sh freely.
if [ -z "${DEPLOY_SELF_COPY:-}" ]; then
  _copy="$(mktemp /tmp/sawa-deploy.XXXXXX.sh)"
  cat "$0" > "$_copy"
  export DEPLOY_SELF_COPY="$_copy"
  # Preserve the original location so relative paths (ops/backup.sh) resolve.
  export DEPLOY_ORIGIN="$0"
  trap 'rm -f "$_copy"' EXIT
  bash "$_copy" "$@"
  exit $?
fi

TARGET="${1:-origin/main}"
STATE_DIR="${STATE_DIR:-/var/lib/sawa}"
MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-300}"
BACKUP_TIMEOUT="${BACKUP_TIMEOUT:-900}"
READY_URL="${READY_URL:-http://127.0.0.1:4000/health/ready}"

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

# Nothing in a deploy should be able to hang forever. Every command that talks
# to the network or to Docker goes through this, so a wedged step fails in
# minutes with a legible message instead of running to the CI job timeout.
run_bounded() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    # -k: a process that ignores SIGTERM gets SIGKILL 10s later, so "bounded"
    # means bounded even when the thing being bounded declines to leave.
    timeout -k 10 --foreground "$secs" "$@"
  else
    "$@"
  fi
}

# $0 is the temp copy, so the repo root comes from where we were INVOKED from,
# not from where this file currently sits.
cd "$(dirname "${DEPLOY_ORIGIN:-$0}")/.."
mkdir -p "$STATE_DIR"

# ─── Refuse to deploy something that is not in git ───────────────────────────
[ -z "$(git status --porcelain)" ] || die "working tree is dirty — commit or stash first"

PREVIOUS="$(git rev-parse HEAD)"
log "current revision: $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"

run_bounded 120 git fetch --all --tags --quiet || die "git fetch failed or timed out"
git rev-parse --verify "$TARGET" >/dev/null 2>&1 || die "unknown revision: $TARGET"
NEXT="$(git rev-parse "$TARGET")"

# KNOWN GAP: "already at the target" is only the same thing as "nothing to do"
# if the CONTAINERS also match. A deploy that checked out the code and then died
# before restarting leaves the host on the new revision serving the old image,
# and this exit congratulates itself and leaves. Converging the running state
# needs a record of what is actually deployed, which this host does not keep
# yet — see docs/DEPLOY-PHASE-2.md. For now, recover by restarting the stack
# explicitly (Ops workflow, action=start-stack) before re-deploying.
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
  # Bounded like everything else: a backup that hangs must not become a deploy
  # that hangs. Timing out here fails the deploy, which is the safe direction —
  # no schema change without a dump to go back to.
  run_bounded "$BACKUP_TIMEOUT" ops/backup.sh \
    || die "backup failed or timed out after ${BACKUP_TIMEOUT}s; not deploying with pending schema changes"
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

# SKIP_BUILD=1 means the images were built elsewhere (CI builds them on the
# runner and docker-loads them here first). Building two Next.js apps on the
# box that is also serving production has twice wedged a deploy — the VPS
# should never compile anything again.
if [ "${SKIP_BUILD:-}" = "1" ]; then
  log "using pre-built images (SKIP_BUILD=1)"
else
  log "building here — slow on a small host, and not the path CI takes"
  run_bounded 2400 $COMPOSE build api web admin \
    || die "build failed or timed out — still running the old containers"
fi

# The database must be up for migrations. Idempotent: an unchanged, running db
# container is left alone.
run_bounded 180 $COMPOSE up -d db || die "could not bring up the database"

# ── Migrations ───────────────────────────────────────────────────────────────
# This one line is what the 27-minute "deploy" actually was. `run` with no
# --entrypoint uses the image's, which runs the full boot sequence and ends in
# `exec node server.js`; when that entrypoint ignored "$@" the migration
# command was silently discarded and this became "start a second API server in
# the foreground", which `compose run` can never return from. Two independent
# guards now, because this failed in the dark for weeks:
#
#   --entrypoint node   the container can only ever run the migration and exit,
#                       whatever the image in front of us does with "$@".
#   run_bounded         even a regressed entrypoint fails in minutes with a
#                       message, instead of at the CI job timeout with the host
#                       checked out at the new revision and nothing restarted.
#
# -T because there is no TTY at the far end of an SSH heredoc.
log "applying migrations"
run_bounded "$MIGRATE_TIMEOUT" $COMPOSE run --rm -T --entrypoint node api src/migrate.js \
  || die "migrations failed or timed out after ${MIGRATE_TIMEOUT}s — nothing was restarted, the old containers are still serving"

log "restarting services"
run_bounded 300 $COMPOSE up -d api web admin || die "restart failed — run ops/rollback.sh"

# ─── Confirm it actually works ──────────────────────────────────────────────
log "waiting for readiness"
READY=0
for i in $(seq 1 30); do
  if curl -fsS -m 3 "$READY_URL" >/dev/null 2>&1; then READY=1; break; fi
  sleep 2
done
[ "$READY" = 1 ] || die "did not become ready within 60s — run ops/rollback.sh"

# ─── Reclaim disk ───────────────────────────────────────────────────────────
# `docker load` retags each name onto the newly-arrived image, so the superseded
# one is left dangling and even a dangling-only prune reclaims it. `-af` with an
# age filter is the honest version of the same intent: it also collects images
# that kept a tag — an abandoned local build, a base layer of a build stage this
# host no longer runs — once they are 14 days old and no container references
# them, while leaving the last fortnight alone as a rollback window. Unpruned,
# this is how a small VPS runs out of disk and starts failing deploys for
# reasons that look like anything except "no space left".
if [ "${SKIP_PRUNE:-}" != "1" ]; then
  log "reclaiming disk"
  run_bounded 120 docker image prune -af --filter "until=336h" >/dev/null 2>&1 || true
  # Only when this host did not build. A BuildKit cache on a host that no
  # longer compiles is pure waste — but wiping it after a genuine local build
  # would make every fallback build start from zero.
  if [ "${SKIP_BUILD:-}" = "1" ]; then
    run_bounded 300 docker builder prune -af >/dev/null 2>&1 || true
  fi
  df -h "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /)" 2>/dev/null | tail -1 || true
fi

log "healthy — deployed $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"
