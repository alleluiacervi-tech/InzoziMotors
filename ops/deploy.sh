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
# Three ways, in order of preference:
#
#   PULL_IMAGES=1   pull the tag from the registry (what CI does). Only changed
#                   layers move, so a code-only deploy is a few MB and seconds.
#   SKIP_BUILD=1    the images are already in the local daemon.
#   (neither)       build them here. Slow on a small box — a last resort, kept
#                   so a human with SSH and no CI can still ship.
#
# ── Environment ──────────────────────────────────────────────────────────────
#   SERVICES         subset of "api web admin" to update (default: all three).
#                    A backend-only change should not restart both Next apps.
#   IMAGE_TAG        tag to deploy; exported so compose interpolates it.
#   PULL_IMAGES=1    pull instead of build.
#   SKIP_BUILD=1     neither pull nor build.
#   FORCE=1          deploy even if the target revision is already checked out.
#   MIGRATE_TIMEOUT  seconds to allow for migrations (default 300).
#   SKIP_PRUNE=1     leave reclaimable disk alone.
#   READY_URL        readiness probe (default http://127.0.0.1:4000/health/ready)
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
SERVICES="${SERVICES:-api web admin}"
MIGRATE_TIMEOUT="${MIGRATE_TIMEOUT:-300}"
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

# IMAGE_TAG reaches compose through the environment (docker-compose.prod.yml
# interpolates ${IMAGE_TAG:-latest} into every image reference).
export IMAGE_TAG="${IMAGE_TAG:-latest}"

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

# "Already at the target" used to mean "exit 0, nothing to do". That is only
# true if the CONTAINERS also match, and a deploy that checked out the code but
# died before restarting proved they need not: the host sat on the new revision
# serving the old image, and every subsequent deploy congratulated itself and
# left. When CI hands us an explicit image tag we always converge the running
# state, so a half-finished deploy is recoverable by running this again.
if [ "$PREVIOUS" = "$NEXT" ] && [ "${FORCE:-}" != "1" ] && [ "${PULL_IMAGES:-}" != "1" ]; then
  log "already at $TARGET — nothing to do (FORCE=1 to redeploy anyway)"
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
PREVIOUS_IMAGE_TAG=$(cat "$STATE_DIR/image-tag" 2>/dev/null || echo latest)
DEPLOYED_IMAGE_TAG=$IMAGE_TAG
EOF
log "rollback pointer written to $STATE_DIR/rollback"

# ─── Deploy ─────────────────────────────────────────────────────────────────
log "checking out $TARGET"
git checkout --quiet "$NEXT" || die "checkout failed"

log "updating services: $SERVICES (tag $IMAGE_TAG)"

if [ "${PULL_IMAGES:-}" = "1" ]; then
  # Only the layers that changed cross the wire. This must succeed BEFORE any
  # container is touched — a failed pull leaves the old stack serving.
  log "pulling images from the registry"
  run_bounded 600 $COMPOSE pull $SERVICES \
    || die "pull failed — the old containers are still serving, nothing changed"
elif [ "${SKIP_BUILD:-}" = "1" ]; then
  log "using images already present in the local daemon (SKIP_BUILD=1)"
else
  # Building two Next.js apps on the box that is also serving production has
  # wedged a deploy more than once. Supported, but not the path CI takes.
  log "building locally — slow on a small host"
  run_bounded 2400 $COMPOSE build $SERVICES \
    || die "build failed — still running the old containers"
fi

# The database must be up for migrations, and `up -d --no-deps` below will not
# start it. Idempotent: an unchanged, running db container is left alone.
run_bounded 180 $COMPOSE up -d db || die "could not bring up the database"

# ── Migrations ───────────────────────────────────────────────────────────────
# --entrypoint node is not decoration. The image's entrypoint runs the full
# boot sequence and ends in `exec node server.js`; if it swallows the command
# (as it did before it learned to honour "$@"), this becomes "start a second
# API server in the foreground" and the deploy hangs until CI times out. Naming
# the entrypoint means the container can only ever run the migration and exit,
# whatever image tag is in front of us.
#
# Migrations run through the api image, which on a web-only or admin-only
# deploy was not in $SERVICES and so was never pulled. CI aliases every
# service to the deployed tag, so this is a metadata-only pull (the layers are
# already on disk under the previous tag) — but it has to happen before the
# migration, not be discovered by it.
case " $SERVICES " in
  *" api "*) : ;;
  *)
    if [ "${PULL_IMAGES:-}" = "1" ]; then
      log "fetching the api image for the migration"
      run_bounded 300 $COMPOSE pull api || die "could not fetch the api image to migrate with"
    fi
    ;;
esac

log "applying migrations"
run_bounded "$MIGRATE_TIMEOUT" $COMPOSE run --rm -T --entrypoint node api src/migrate.js \
  || die "migrations failed or timed out after ${MIGRATE_TIMEOUT}s — old containers still serving"

# ── Restart only what changed ────────────────────────────────────────────────
# --no-deps keeps a web-only deploy from recreating the API (and vice versa),
# so an unrelated service never takes a restart it did not need.
log "restarting"
run_bounded 300 $COMPOSE up -d --no-deps $SERVICES || die "restart failed — run ops/rollback.sh"

echo "$IMAGE_TAG" > "$STATE_DIR/image-tag"

# ─── Confirm it actually works ──────────────────────────────────────────────
if printf '%s\n' $SERVICES | grep -qx api; then
  log "waiting for readiness"
  READY=0
  for i in $(seq 1 30); do
    if curl -fsS -m 3 "$READY_URL" >/dev/null 2>&1; then READY=1; break; fi
    sleep 2
  done
  [ "$READY" = 1 ] || die "did not become ready within 60s — run ops/rollback.sh"
fi

# ─── Reclaim disk ───────────────────────────────────────────────────────────
# Every deploy leaves the superseded image untagged. Unpruned, that is how a
# small VPS runs out of disk and starts failing deploys for reasons that look
# like anything except "no space left".
if [ "${SKIP_PRUNE:-}" != "1" ]; then
  log "reclaiming disk"
  docker image prune -f >/dev/null 2>&1 || true
  # Only when this host did not build. When images arrive from the registry any
  # BuildKit cache here is left over from the old build-on-the-server deploys
  # and is pure waste — but wiping it after a genuine local build would make
  # every fallback build start from zero.
  if [ "${PULL_IMAGES:-}" = "1" ] || [ "${SKIP_BUILD:-}" = "1" ]; then
    docker builder prune -af >/dev/null 2>&1 || true
  fi
  df -h "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /)" 2>/dev/null | tail -1 || true
fi

log "healthy — deployed $(git rev-parse --short HEAD) ($(git log -1 --format=%s))"
