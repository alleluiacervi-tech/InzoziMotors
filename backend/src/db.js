const fs = require('fs');
const { Pool } = require('pg');
const { log } = require('./lib/log');

// ─────────────────────────────────────────────────────────────────────────────
// TLS to the database.
//
// This used to be `NODE_ENV === 'production' ? { rejectUnauthorized: false }`,
// which was wrong in both directions at once:
//
//   • It DEMANDED TLS in production. The documented deployment runs Postgres in
//     a container on the same host, reached over the Docker bridge or
//     127.0.0.1, where the server does not speak TLS at all — so production
//     could not connect. Every query failed with "The server does not support
//     SSL connections". Found by booting the API with NODE_ENV=production
//     against a normal Postgres.
//
//   • Where TLS did work, rejectUnauthorized: false accepted ANY certificate.
//     That encrypts the connection without authenticating the far end, which
//     stops a passive listener and does nothing about an active one — the
//     threat that actually justifies TLS on a network you do not trust.
//
// So it is explicit now, and says what it is:
//
//   DB_SSL unset / "false"  no TLS. Correct for a database on the same host,
//                           which is where this one lives.
//   DB_SSL="require"        TLS, certificate NOT verified. Encryption only.
//                           Honest name for what the old setting did.
//   DB_SSL="verify"         TLS with verification. Needs DB_SSL_CA when the
//                           certificate is not signed by a public root — the
//                           right choice for any managed database.
// ─────────────────────────────────────────────────────────────────────────────
function sslConfig() {
  const mode = (process.env.DB_SSL || '').toLowerCase();

  if (mode === 'verify') {
    const ca = process.env.DB_SSL_CA;
    return {
      rejectUnauthorized: true,
      // Accepts either the certificate itself or a path to it, because both
      // are normal depending on how the host injects secrets.
      ...(ca ? { ca: ca.includes('BEGIN CERTIFICATE') ? ca : fs.readFileSync(ca, 'utf8') } : {}),
    };
  }

  if (mode === 'require' || mode === 'true') {
    if (process.env.NODE_ENV === 'production') {
      log.warn('DB_SSL=require encrypts but does not verify the database certificate — use DB_SSL=verify where the connection crosses a network you do not control');
    }
    return { rejectUnauthorized: false };
  }

  return false;
}

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sawa',
  user:     process.env.DB_USER     || 'sawa',
  password: process.env.DB_PASSWORD,
  ssl: sslConfig(),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  // Without this a connection attempt to an unreachable database hangs until
  // the OS gives up, holding the request open for minutes.
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  // Fires for idle clients dropped by the server or the network — not tied to
  // any one request, so it is logged rather than surfaced to a caller.
  log.error('PostgreSQL pool error', { error: err.message });
});

module.exports = pool;
