#!/usr/bin/env bash
# Read-only production readiness gate. It inspects only Sawa-owned resources;
# it never invokes a global Docker prune on this shared host.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/sawa}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-30}"
MIN_FREE_GB="${MIN_FREE_GB:-5}"
READY_URL="${READY_URL:-http://127.0.0.1:4000/health/ready}"
REQUIRE_OFFSITE="${REQUIRE_OFFSITE:-0}"

fail=0
ok() { printf 'OK    %s\n' "$*"; }
bad() { printf 'FAIL  %s\n' "$*" >&2; fail=1; }
note() { printf 'NOTE  %s\n' "$*"; }

curl -fsS -m 8 "$READY_URL" >/dev/null \
  && ok "API readiness: $READY_URL" || bad "API readiness: $READY_URL"

if command -v docker >/dev/null; then
  for service in sawa-db-1 sawa-api-1 sawa-web-1 sawa-admin-1; do
    state="$(docker inspect -f '{{.State.Status}}' "$service" 2>/dev/null || true)"
    [ "$state" = running ] && ok "$service is running" || bad "$service is ${state:-missing}"
  done
  root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /)"
  free_kb="$(df -Pk "$root" | awk 'NR==2 {print $4}')"
  min_kb=$((MIN_FREE_GB * 1024 * 1024))
  [ "${free_kb:-0}" -ge "$min_kb" ] \
    && ok "Docker filesystem has at least ${MIN_FREE_GB} GiB free" \
    || bad "Docker filesystem has less than ${MIN_FREE_GB} GiB free"
  note "Sawa-managed images (read-only inventory):"
  docker image ls --filter 'label=com.sawacars.managed=true' \
    --format '      {{.Repository}}:{{.Tag}}  {{.ID}}  {{.Size}}' || true
else
  bad "Docker is unavailable"
fi

latest=""
if [ -d "$BACKUP_DIR" ]; then
  latest="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.dump' -print | sort | tail -1)"
fi
if [ -n "$latest" ]; then
  now="$(date +%s)"
  modified="$(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest")"
  age_hours=$(((now - modified) / 3600))
  [ "$age_hours" -le "$MAX_BACKUP_AGE_HOURS" ] \
    && ok "latest database backup is ${age_hours}h old" \
    || bad "latest database backup is ${age_hours}h old (maximum ${MAX_BACKUP_AGE_HOURS}h)"
else
  bad "no database backup found in $BACKUP_DIR"
fi

if [ -f "$BACKUP_DIR/last-offsite-success" ]; then
  offsite_stamp="$(tr -d '[:space:]' < "$BACKUP_DIR/last-offsite-success")"
  receipt_modified="$(stat -c %Y "$BACKUP_DIR/last-offsite-success" 2>/dev/null || stat -f %m "$BACKUP_DIR/last-offsite-success")"
  receipt_age=$((($(date +%s) - receipt_modified) / 3600))
  [ "$receipt_age" -le "$MAX_BACKUP_AGE_HOURS" ] \
    && ok "off-site copy is ${receipt_age}h old (${offsite_stamp:-unknown})" \
    || bad "off-site copy is ${receipt_age}h old (maximum ${MAX_BACKUP_AGE_HOURS}h)"
elif [ "$REQUIRE_OFFSITE" = "1" ]; then
  bad "no off-site copy receipt (REQUIRE_OFFSITE=1)"
else
  note "no off-site copy receipt; set REQUIRE_OFFSITE=1 after configuring BACKUP_REMOTE"
fi

exit "$fail"
