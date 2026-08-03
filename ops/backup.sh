#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Nightly backup: PostgreSQL + the uploads volume.
#
# The deployment diagram said "backed up nightly". Nothing implemented it, and
# the two things worth protecting are irreplaceable in different ways: the
# database can be rebuilt from nothing but loses every account and sale, while
# the uploads are 36 professional photographs per car plus identity documents
# that cannot be re-shot.
#
# Every backup is verified after it is written — a dump that cannot be restored
# is not a backup, and the only way to know is to try. This one re-reads the
# archive and checks the expected tables are present.
#
#   ops/backup.sh                    # back up, verify, prune
#   BACKUP_DIR=/mnt/vol ops/backup.sh
#
# Cron (03:00 daily, log to syslog so a failure is visible):
#   0 3 * * * /srv/sawa/ops/backup.sh 2>&1 | logger -t sawa-backup
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/sawa}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-sawa-db-1}"
DB_NAME="${DB_NAME:-sawa}"
DB_USER="${DB_USER:-sawa}"
UPLOADS_PATH="${UPLOADS_PATH:-/var/lib/docker/volumes/sawa_uploads/_data}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
UPLOADS_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"

log() { printf '%s  %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { printf 'BACKUP FAILED: %s\n' "$*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"

# ─── Database ────────────────────────────────────────────────────────────────
# Custom format (-Fc): compressed, and restorable table-by-table, which is what
# you want at 3am when one table is wrong rather than the whole database.
log "dumping $DB_NAME"
if command -v docker >/dev/null && docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DB_FILE" \
    || die "pg_dump failed"
else
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DB_FILE" || die "pg_dump failed"
fi
[ -s "$DB_FILE" ] || die "dump is empty"

# ─── Verify the dump is readable and complete ────────────────────────────────
# pg_restore --list parses the archive without touching a database. If the file
# is truncated or corrupt this is where it shows up, not during an incident.
log "verifying dump"
RESTORE_CMD="pg_restore"
if command -v docker >/dev/null && docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  RESTORE_CMD="docker exec -i $DB_CONTAINER pg_restore"
fi
TOC="$($RESTORE_CMD --list < "$DB_FILE" 2>/dev/null)" || die "dump is unreadable"

# The tables whose loss would end the business. Their absence means the dump
# ran against the wrong database, which a size check would never catch.
for table in users cars handovers platform_fees inspections submissions; do
  echo "$TOC" | grep -q "TABLE DATA public $table" \
    || die "dump is missing table '$table' — wrong database?"
done
log "dump verified ($(du -h "$DB_FILE" | cut -f1), $(echo "$TOC" | grep -c 'TABLE DATA') tables)"

# ─── Uploads ─────────────────────────────────────────────────────────────────
if [ -d "$UPLOADS_PATH" ]; then
  log "archiving uploads"
  tar -czf "$UPLOADS_FILE" -C "$UPLOADS_PATH" . || die "uploads archive failed"
  tar -tzf "$UPLOADS_FILE" >/dev/null || die "uploads archive is corrupt"
  log "uploads verified ($(du -h "$UPLOADS_FILE" | cut -f1))"
else
  log "WARNING: uploads path not found at $UPLOADS_PATH — skipping"
fi

# ─── Prune ───────────────────────────────────────────────────────────────────
# Only after the new backup is verified, so a failed run never deletes the last
# good copy.
log "pruning backups older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'db-*.dump'       -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

log "done — $(find "$BACKUP_DIR" -name 'db-*.dump' | wc -l) database backups retained"

# A backup on the same disk as the thing it protects is not a backup. Ship it
# off-box; the destination is deliberately not hardcoded here.
if [ -n "${BACKUP_REMOTE:-}" ]; then
  log "copying to $BACKUP_REMOTE"
  rsync -a "$DB_FILE" "$UPLOADS_FILE" "$BACKUP_REMOTE/" || die "off-site copy failed"
  log "off-site copy complete"
else
  log "NOTE: BACKUP_REMOTE unset — these backups live on the same machine as the data"
fi
