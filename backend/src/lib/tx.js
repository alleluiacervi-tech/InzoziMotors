const pool = require('../db');

// Run fn(client) inside BEGIN/COMMIT with guaranteed ROLLBACK + release.
// Throw an Error with err.status to bubble an HTTP status to the route.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
