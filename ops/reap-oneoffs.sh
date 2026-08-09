#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Reap abandoned one-off containers.
#
# `docker compose run` normally cleans up after itself: `--rm` removes the
# container when the command exits. But `--rm` is honoured by the CLIENT, so if
# the client dies before the command does — a cancelled CI job, a dropped SSH
# connection, a job timeout — the container is simply left running and nothing
# ever comes back for it.
#
# That is what sixteen cancelled deploys left on this host: five containers named
# sawa-api-run-<hash>, four of them up for three days, each one a full second API
# process holding a connection pool against the live production database and
# pinning the old image it was created from (which is why the image prune could
# never reclaim that disk).
#
#   sawa-api-run-312e4444fcd3   Up 21 hours (healthy)   3000/tcp
#   sawa-api-run-f990e9a4992b   Up 3 days   (healthy)   3000/tcp
#   ...
#
# The bug that produced them is fixed (backend/entrypoint.sh discarded "$@", so
# `compose run … node src/migrate.js` booted a foreground API server that
# `compose run` could never return from). This handles the wreckage, and runs on
# every deploy so the next dropped connection cleans up after itself.
#
# ── Why the filter is what it is ─────────────────────────────────────────────
# This host is SHARED. `docker ps` here also lists `ora-app-1`, which belongs to
# somebody else's stack. An earlier draft of this matched on `name=-run-`, which
# is a substring match against every container on the box — it would happily
# remove a neighbour's container that happened to be named `foo-runner-1`.
#
# So the filter is two compose labels and nothing else:
#
#   com.docker.compose.project=<project>   ours, and only ours
#   com.docker.compose.oneoff=True         a `compose run` container, never a
#                                          `compose up` service container
#
# The second label is what makes this safe to run against a live stack: the
# containers that serve production (sawa-api-1, sawa-db-1, …) are oneoff=False
# and cannot match, no matter what they are called.
#
# ── Two more guards ──────────────────────────────────────────────────────────
# MIN_AGE  A legitimate one-off may be running RIGHT NOW — ops/deploy.sh applies
#          migrations with `compose run --entrypoint node`. Only containers older
#          than MIN_AGE seconds (default 600) are eligible, so this can never
#          reap the migration of the deploy that called it.
#
# Unresolvable project → refuse. If the project name cannot be established, the
#          filter would be one label wide and would match every one-off on a
#          shared host. Reaping nothing is a bad outcome; reaping a neighbour is
#          a worse one. It declines and says so.
#
# ── Usage ────────────────────────────────────────────────────────────────────
#   ops/reap-oneoffs.sh              # list, then remove what qualifies
#   DRY_RUN=1 ops/reap-oneoffs.sh    # list only, remove nothing
#
#   COMPOSE    compose invocation (default: -f docker-compose.prod.yml if present)
#   MIN_AGE    seconds a one-off must have existed to be eligible (default 600)
#
# Exits 0 when there was nothing to do. Hygiene must never fail a deploy, so
# ops/deploy.sh calls this with `|| true`.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MIN_AGE="${MIN_AGE:-600}"

DEFAULT_COMPOSE="docker compose"
[ -f docker-compose.prod.yml ] && DEFAULT_COMPOSE="docker compose -f docker-compose.prod.yml"
COMPOSE="${COMPOSE:-$DEFAULT_COMPOSE}"

log() { printf '  %s\n' "$*"; }

# ─── Which compose project are we? ──────────────────────────────────────────
# Read it off a container compose itself resolved, rather than guessing from the
# directory name. `compose ps -q` applies compose's own project resolution
# (COMPOSE_PROJECT_NAME, .env, then the directory), so whatever compose believes
# the project is, that is what we filter on — a renamed checkout cannot quietly
# turn this into a no-op that still reports success.
project=""
for svc in db api web admin; do
  cid="$($COMPOSE ps -aq "$svc" 2>/dev/null | head -1 || true)"
  [ -n "$cid" ] || continue
  project="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$cid" 2>/dev/null || true)"
  [ -n "$project" ] && break
done

if [ -z "$project" ]; then
  log "cannot determine the compose project (is the stack down?) — not reaping"
  log "a one-label filter would match every one-off container on this shared host"
  exit 0
fi

# ─── Candidates ─────────────────────────────────────────────────────────────
# -a so exited one-offs are collected too; they are pure garbage and they pin
# images just the same.
mapfile -t candidates < <(
  docker ps -a \
    --filter "label=com.docker.compose.project=$project" \
    --filter "label=com.docker.compose.oneoff=True" \
    --format '{{.ID}}' 2>/dev/null || true
)

if [ "${#candidates[@]}" -eq 0 ]; then
  # "Found nothing" and "cannot see anything" print the same way, and only one of
  # them is good news. Compose writes this label capitalised — oneoff=True, a
  # leftover from the Python implementation — so a version that ever changed it
  # to `true` would make the filter above match zero containers forever while
  # this script cheerfully reported success on a host filling up with strays.
  #
  # Cross-check case-INSENSITIVELY, without the label filter. If a container in
  # this project looks like a one-off but the filter above returned nothing, the
  # filter is what is broken — not the host that is clean.
  lower_true="$(
    docker ps -a --filter "label=com.docker.compose.project=$project" \
      --format '{{.ID}}' 2>/dev/null \
    | while read -r c; do
        docker inspect -f '{{index .Config.Labels "com.docker.compose.oneoff"}}' "$c" 2>/dev/null
      done | tr 'A-Z' 'a-z' | grep -c '^true$' || true
  )"
  if [ "${lower_true:-0}" -gt 0 ]; then
    log "WARNING: ${lower_true} container(s) in project '$project' are labelled as one-offs,"
    log "but the oneoff=True filter matched none of them — this Docker/Compose version"
    log "writes the label differently. Nothing was removed and 'nothing to do' is NOT"
    log "verified here; check by hand before trusting this."
    exit 0
  fi
  log "no abandoned one-off containers in project '$project'"
  exit 0
fi

now="$(date -u +%s)"
doomed=()

for cid in "${candidates[@]}"; do
  # One inspect for everything we need, tab-separated: a container name can
  # contain no tabs, and neither can a timestamp or a state.
  info="$(docker inspect -f '{{.Name}}	{{.Created}}	{{.State.Status}}' "$cid" 2>/dev/null || true)"
  [ -n "$info" ] || continue
  name="${info%%	*}"; name="${name#/}"
  rest="${info#*	}"
  created="${rest%%	*}"
  state="${rest##*	}"

  # `date -d ""` does NOT fail — GNU date reads an empty string as midnight
  # today and exits 0. Trusting it means a container whose creation time could
  # not be read is assigned an age of "however long today has been", which after
  # 00:10 is enough to make it eligible. Unreadable metadata has to mean KEEP,
  # so the string is checked before date is asked about it.
  created_epoch=0
  case "$created" in
    [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*)
      created_epoch="$(date -u -d "$created" +%s 2>/dev/null || echo 0)" ;;
  esac
  if [ "$created_epoch" = 0 ]; then
    log "keep  $name — cannot read its creation time ('$created')"
    continue
  fi
  age=$(( now - created_epoch ))
  # A clock skew or a future timestamp must not read as a huge age either.
  if [ "$age" -lt 0 ]; then
    log "keep  $name — created in the future ('$created'); clock skew?"
    continue
  fi

  if [ "$age" -lt "$MIN_AGE" ]; then
    log "keep  $name ($state, ${age}s old) — younger than MIN_AGE=${MIN_AGE}s, may be a live migration"
    continue
  fi

  # Whole days read better than 250000 seconds when this scrolls past in a log.
  if [ "$age" -ge 86400 ]; then human="$(( age / 86400 ))d"; else human="$(( age / 3600 ))h"; fi
  log "reap  $name ($state, ${human} old)"
  doomed+=("$cid")
done

if [ "${#doomed[@]}" -eq 0 ]; then
  log "nothing eligible"
  exit 0
fi

if [ -n "${DRY_RUN:-}" ]; then
  log "DRY_RUN — leaving ${#doomed[@]} container(s) in place"
  exit 0
fi

# -f because these are running. They serve no traffic: a one-off gets no
# published port and no service network alias, so nginx (127.0.0.1:4000) and
# service-to-service calls (http://api:3000) both reach only the real api
# container. Killing them stops duplicate background work and duplicate database
# connections, and nothing else.
removed=0
for cid in "${doomed[@]}"; do
  if docker rm -f "$cid" >/dev/null 2>&1; then
    removed=$(( removed + 1 ))
  else
    log "could not remove $cid — leaving it"
  fi
done

log "removed $removed abandoned one-off container(s)"
