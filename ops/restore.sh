#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Restore from a backup produced by ops/backup.sh.
#
# This exists so the restore path is written down and rehearsed BEFORE it is
# needed. The worst time to work out the pg_restore flags is during the outage
# that requires them.
#
#   ops/restore.sh /var/backups/sawa/db-20260803T030000Z.dump
#   ops/restore.sh --dry-run <file>      # show what it contains, change nothing
#
# Rehearse it quarterly against a scratch database:
#   RESTORE_DB=sawa_rehearsal ops/restore.sh <latest dump>
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-sawa-db-1}"
RESTORE_DB="${RESTORE_DB:-sawa}"
DB_USER="${DB_USER:-sawa}"

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then DRY_RUN=true; shift; fi
DUMP="${1:-}"

log() { printf '%s  %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { printf 'RESTORE FAILED: %s\n' "$*" >&2; exit 1; }

[ -n "$DUMP" ] || die "usage: ops/restore.sh [--dry-run] <dump-file>"
[ -f "$DUMP" ] || die "no such file: $DUMP"

IN_DOCKER=false
if command -v docker >/dev/null && docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  IN_DOCKER=true
fi
run_pg() { if $IN_DOCKER; then docker exec -i "$DB_CONTAINER" "$@"; else "$@"; fi; }

log "reading $DUMP"
TOC="$(run_pg pg_restore --list < "$DUMP" 2>/dev/null)" || die "unreadable or not a pg_dump archive"
log "contains $(echo "$TOC" | grep -c 'TABLE DATA') tables"

if $DRY_RUN; then
  # pg_restore --list emits "... TABLE DATA public <table> <owner>", so the
  # table name is the second-to-last field, not the last.
  echo "$TOC" | grep 'TABLE DATA' | awk '{print "    " $(NF-1)}'
  log "dry run — nothing changed"
  exit 0
fi

# Restoring over a live database is destructive and irreversible. Ask, out loud,
# naming the target — the number of production incidents caused by restoring
# into the wrong database is not small.
cat <<WARNING

  About to restore into database: $RESTORE_DB
  This REPLACES its current contents. Every row written since the backup is lost.

WARNING
read -r -p "  Type the database name to confirm: " CONFIRM
[ "$CONFIRM" = "$RESTORE_DB" ] || die "confirmation did not match — nothing changed"

# A safety dump of what is about to be overwritten. Cheap, and the only thing
# standing between a mistaken restore and permanent loss.
SAFETY="/tmp/sawa-pre-restore-$(date -u +%Y%m%dT%H%M%SZ).dump"
log "dumping current state to $SAFETY first"
run_pg pg_dump -U "$DB_USER" -d "$RESTORE_DB" -Fc > "$SAFETY" 2>/dev/null \
  || log "WARNING: could not dump current state (new/empty database?) — continuing"

log "restoring"
# --clean --if-exists drops existing objects first; --exit-on-error means a
# partial restore stops rather than leaving a half-populated database that
# looks fine until someone queries the missing half.
run_pg pg_restore -U "$DB_USER" -d "$RESTORE_DB" --clean --if-exists --no-owner \
  --exit-on-error < "$DUMP" || die "pg_restore failed — previous state is at $SAFETY"

log "verifying"
# Core tables must come back, or the restore did not restore this product.
for table in users cars inspections submissions rental_cars; do
  COUNT="$(run_pg psql -U "$DB_USER" -d "$RESTORE_DB" -t -A -c "SELECT COUNT(*) FROM $table" 2>/dev/null || echo 'ERROR')"
  [ "$COUNT" = "ERROR" ] && die "table '$table' missing after restore"
  log "  $table: $COUNT rows"
done

# Retired-transaction tables: counted when the dump carried them, noted when it
# did not. A dump taken after one of these is dropped is still a valid dump.
for table in handovers platform_fees rental_bookings payments; do
  COUNT="$(run_pg psql -U "$DB_USER" -d "$RESTORE_DB" -t -A -c "SELECT COUNT(*) FROM $table" 2>/dev/null || echo 'ABSENT')"
  if [ "$COUNT" = "ABSENT" ]; then
    log "  $table: not in this dump (retired)"
  else
    log "  $table: $COUNT rows"
  fi
done

log "restore complete. Previous state kept at $SAFETY"
log "Run migrations before starting the API: cd backend && node src/migrate.js"
