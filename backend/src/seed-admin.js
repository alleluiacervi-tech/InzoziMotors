// Creates the first admin account so a fresh install is reachable.
// Run: node src/seed-admin.js  (the Docker entrypoint runs it on every start)
//
// Two rules this file exists to respect:
//
//  1. It CREATES, it never overwrites. The previous version used
//     `ON CONFLICT DO UPDATE SET password_hash = EXCLUDED.password_hash`, which
//     meant an admin who rotated their password had it silently reset to the env
//     value on the next redeploy — and if SEED_ADMIN_PASSWORD were ever absent,
//     admin@sawacars.com/admin1234 came back from the dead.
//  2. It refuses to invent a password in production. A default credential that
//     is also published in .env.example and docker-compose.yml is not a
//     credential.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admin@sawacars.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || (IS_PRODUCTION ? null : 'admin1234');
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     || 'Sawa Admin';

async function seed() {
  if (IS_PRODUCTION && !ADMIN_PASSWORD) {
    console.error('✗ SEED_ADMIN_PASSWORD must be set in production. No admin was created.');
    await pool.end();
    process.exit(1);
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [ADMIN_NAME, ADMIN_EMAIL, hash]
  );

  if (!rows.length) {
    console.log(`✓ Admin ${ADMIN_EMAIL} already exists — left untouched.`);
    await pool.end();
    return;
  }

  console.log('');
  console.log('✅ Admin account created:');
  console.log('   Email   :', ADMIN_EMAIL);
  // Never print a real production credential into the container logs.
  console.log('   Password:', IS_PRODUCTION ? '(from SEED_ADMIN_PASSWORD)' : ADMIN_PASSWORD);
  console.log('');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
