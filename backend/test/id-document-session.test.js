const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test_secret_at_least_32_characters_long';
// Exercise the documented relative setting even if the runner uses an absolute root.
process.env.UPLOAD_DIR = path.relative(process.cwd(), path.resolve(process.env.UPLOAD_DIR || 'uploads'));
const { app } = require('../server');
const pool = require('../src/db');

test('ID evidence follows a live admin session, independently of signed-link expiry', async () => {
  const filename = `session-review-${Date.now()}.png`;
  const directory = path.resolve(process.env.UPLOAD_DIR || 'uploads', 'id-docs');
  const email = `review-${Date.now()}@test.local`;
  let userId;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), Buffer.from('synthetic document fixture'));
  try {
    const registered = await request(app).post('/auth/register')
      .send({ name: 'Document Reviewer', email, password: 'password123' }).expect(201);
    userId = registered.body.user.id;
    await pool.query("UPDATE users SET role='admin' WHERE id=$1", [userId]);
    const login = await request(app).post('/auth/login')
      .send({ email, password: 'password123' }).expect(200);
    const url = `/id-verification/doc/${filename}`;
    const expired = jwt.sign({ scope: 'kyc-doc', file: filename }, process.env.JWT_SECRET, { expiresIn: -60 });
    await request(app).get(`${url}?sig=${expired}`).expect(401);
    await request(app).get(url).expect(401);
    const opened = await request(app).get(url)
      .set('Authorization', `Bearer ${login.body.token}`).timeout(3000).expect(200);
    assert.match(opened.headers['cache-control'], /no-store/);
    assert.equal(opened.headers['referrer-policy'], 'no-referrer');
    await pool.query("UPDATE users SET access_hold='suspected_bot' WHERE id=$1", [userId]);
    await request(app).get(url).set('Authorization', `Bearer ${login.body.token}`).expect(401);
    await pool.query("UPDATE users SET access_hold=NULL, account_status='suspended' WHERE id=$1", [userId]);
    await request(app).get(url).set('Authorization', `Bearer ${login.body.token}`).expect(401);
    await pool.query("UPDATE users SET account_status='active' WHERE id=$1", [userId]);
    await pool.query("UPDATE users SET role='buyer' WHERE id=$1", [userId]);
    await request(app).get(url).set('Authorization', `Bearer ${login.body.token}`).expect(401);
    await pool.query("UPDATE users SET role='admin', token_version=token_version+1 WHERE id=$1", [userId]);
    await request(app).get(url).set('Authorization', `Bearer ${login.body.token}`).expect(401);
  } finally {
    await fs.unlink(path.join(directory, filename)).catch(() => {});
    if (userId) await pool.query('DELETE FROM users WHERE id=$1', [userId]);
  }
});

test.after(async () => pool.end());
