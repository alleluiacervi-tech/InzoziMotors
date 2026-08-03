// Schema bootstrap. Kept at this path because the Docker entrypoint, the
// deployment runbook and CI all invoke it by name — it now delegates to the
// migration runner instead of replaying one large idempotent file on every
// start. See src/migrate.js for the mechanism and migrations/ for the files.
//
//   node src/db-init.js
require('dotenv').config();
const pool = require('./db');
const { migrate } = require('./migrate');

migrate()
  .catch((err) => {
    console.error('Schema error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
