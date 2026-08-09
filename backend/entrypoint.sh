#!/bin/sh
set -e

# ─────────────────────────────────────────────────────────────────────────────
# Container entrypoint.
#
# IMPORTANT — this script MUST honour "$@".
#
# It previously ended in an unconditional `exec node server.js`, ignoring any
# command passed to the container. That made every one-off invocation silently
# become "boot the API server and never exit":
#
#     docker compose run --rm api node src/migrate.js
#
# ran the seeds and then started a SECOND long-lived API listener in the
# foreground. `compose run` never returned, so the deploy step that calls it
# hung until the CI job's 30-minute timeout killed it — and the `up -d` that
# was supposed to follow never ran, meaning the new images were loaded but
# never actually put into service.
#
# With the dispatch below, `run --rm api node src/migrate.js` runs exactly the
# migration and exits, while a plain `up` (no command) still gets the full
# boot sequence.
# ─────────────────────────────────────────────────────────────────────────────

# A command was supplied — run precisely that, nothing else.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "⏳ Initialising database schema…"
node src/db-init.js

echo "👤 Seeding admin user…"
node src/seed-admin.js

echo "🚙 Seeding rental fleet…"
node src/seed-rentals.js

echo "🚗 Seeding marketplace cars…"
node src/seed-cars.js

echo "🚀 Starting API…"
exec node server.js
