#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Tests for ops/backup.sh's dump verification.
#
# deploy.sh refuses to migrate without a verified backup, so a false "missing
# table" stops every deploy that carries a migration. That happened in Oct 2026:
# `echo "$TOC" | grep -q` under pipefail reported `cars` missing once the TOC
# outgrew the 64 KB pipe buffer (grep -q exits on its first match and echo dies
# of SIGPIPE). pg_dump and pg_restore are stubbed, and the TOC is made big.
#
#   ops/test/backup.test.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

BACKUP="$(cd "$(dirname "$0")/.." && pwd)/backup.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok()  { echo "ok   $1"; pass=$((pass + 1)); }
bad() { echo "FAIL $1"; fail=$((fail + 1)); }

mkdir -p "$TMP/bin"
# No database container: backup.sh falls back to pg_dump / pg_restore on PATH.
cat > "$TMP/bin/docker" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
cat > "$TMP/bin/pg_dump" <<'STUB'
#!/usr/bin/env bash
echo "PGDMP stub archive"
STUB
# Alphabetical, like the real TOC: `cars` near the top, then far more than
# 64 KB of other entries, then `users` at the bottom.
cat > "$TMP/bin/pg_restore" <<'STUB'
#!/usr/bin/env bash
for t in cars inspections rental_cars submissions; do
  [ "$t" = "${SKIP_TABLE:-}" ] || echo "1; 2615 1 TABLE DATA public $t sawa"
done
for i in $(seq 1 4000); do echo "$i; 1259 1 INDEX public idx_padding_$i sawa"; done
[ "users" = "${SKIP_TABLE:-}" ] || echo "9; 2615 1 TABLE DATA public users sawa"
STUB
chmod +x "$TMP/bin/"*

run() {
  PATH="$TMP/bin:$PATH" BACKUP_ENV_FILE=/nonexistent BACKUP_DIR="$TMP/out" \
    UPLOADS_PATH="$TMP/no-uploads" bash "$BACKUP" > "$TMP/log" 2>&1
}

if run && grep -q "dump verified" "$TMP/log"; then
  ok "a TOC over 64 KB with every table verifies"
else
  bad "a TOC over 64 KB with every table verifies"; sed 's/^/     /' "$TMP/log"
fi

for t in cars users; do
  if SKIP_TABLE="$t" run; then
    bad "a dump without $t is refused"
  elif grep -q "missing table '$t'" "$TMP/log"; then
    ok "a dump without $t is refused"
  else
    bad "a dump without $t is refused, by name"; sed 's/^/     /' "$TMP/log"
  fi
done

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
