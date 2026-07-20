#!/bin/sh
set -e

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
