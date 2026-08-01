// Creates a default admin account for local development.
// Run: node src/seed-admin.js
// Safe to re-run — uses ON CONFLICT DO UPDATE.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admin@sawacars.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin1234';
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     || 'Sawa Admin';

async function seed() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin', password_hash = EXCLUDED.password_hash`,
    [ADMIN_NAME, ADMIN_EMAIL, hash]
  );
  console.log('');
  console.log('✅ Admin account ready:');
  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
  console.log('   ⚠  Change the password in production via SEED_ADMIN_PASSWORD env var');
  console.log('');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
