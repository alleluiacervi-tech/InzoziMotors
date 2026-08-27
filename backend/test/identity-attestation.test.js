// ─────────────────────────────────────────────────────────────────────────────
// Off-platform identity verification.
//
// A seller verified at the counter never uploads a document, so they never
// reach the 'pending' queue and the dashboard has nothing to show. This route
// is the way through. The thing worth testing hardest is that it is a way
// through and NOT a way around: id_verified='approved' must still mean a named
// human attested, in writing, to how they know who this person is.
//
// The last test is the load-bearing one — it goes around the route entirely and
// asks the database directly whether an unattested off-platform approval can
// exist. If that ever starts passing, the validator has become the only thing
// standing between the product and an empty promise.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(name = 'Person', role = 'buyer') {
  const email = unique('att');
  const password = 'password123';
  const r = await api().post('/auth/register')
    .send({ name, email, password, role }).expect(201);
  return { id: r.body.user.id, email, password, token: r.body.token };
}
async function admin() {
  const u = await register('Operator');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}
const row = async (id) => (await pool.query(
  `SELECT id_verified, id_verification_method, id_verification_note,
          id_verification_ref, id_verified_at, id_verified_by, token_version
     FROM users WHERE id = $1`, [id])).rows[0];

const ATTESTATION = 'Saw the national ID and the vehicle logbook at the Kicukiro office.';

test('approves a seller who never uploaded a document, and records how', async () => {
  const a = await admin();
  const seller = await register('Counter Seller', 'seller');

  // The precondition that used to be a dead end: no documents, not 'pending',
  // so no queue row and no button anywhere in the dashboard.
  const before = await row(seller.id);
  assert.equal(before.id_verified, 'none');
  assert.equal(before.id_verification_method, null);
  const queue = await api().get('/id-verification/queue')
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  assert.equal(queue.body.some((u) => u.id === seller.id), false);

  const res = await api().post(`/id-verification/${seller.id}/manual`)
    .set('Authorization', `Bearer ${a.token}`)
    .send({ method: 'in_person', note: ATTESTATION, reference: '1199680012345678' })
    .expect(200);
  assert.equal(res.body.decision, 'approved');
  assert.equal(res.body.method, 'in_person');

  const after = await row(seller.id);
  assert.equal(after.id_verified, 'approved');
  assert.equal(after.id_verification_method, 'in_person');
  assert.equal(after.id_verification_note, ATTESTATION);
  assert.equal(after.id_verification_ref, '1199680012345678');
  assert.equal(after.id_verified_by, a.id);
  assert.ok(after.id_verified_at instanceof Date);
  // Approving must not sign the seller out — only revocation does that.
  assert.equal(after.token_version, before.token_version);
});

test('refuses an approval with no written attestation', async () => {
  const a = await admin();
  const seller = await register('Unattested', 'seller');

  for (const body of [
    { method: 'in_person' },
    { method: 'in_person', note: '' },
    { method: 'in_person', note: 'ok' },
    { method: 'in_person', note: '          ' },
  ]) {
    const res = await api().post(`/id-verification/${seller.id}/manual`)
      .set('Authorization', `Bearer ${a.token}`).send(body).expect(400);
    assert.equal(res.body.field, 'note');
  }
  assert.equal((await row(seller.id)).id_verified, 'none');
});

test('refuses an unknown or document-shaped method', async () => {
  const a = await admin();
  const seller = await register('Bad Method', 'seller');
  for (const method of ['documents', 'trust_me', '', 'IN_PERSON']) {
    const res = await api().post(`/id-verification/${seller.id}/manual`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ method, note: ATTESTATION }).expect(400);
    assert.equal(res.body.field, 'method');
  }
  assert.equal((await row(seller.id)).id_verified, 'none');
});

test('only an admin may verify off-platform', async () => {
  const seller = await register('Target', 'seller');
  const outsider = await register('Outsider');
  await api().post(`/id-verification/${seller.id}/manual`)
    .set('Authorization', `Bearer ${outsider.token}`)
    .send({ method: 'in_person', note: ATTESTATION }).expect(403);
  await api().post(`/id-verification/${seller.id}/manual`)
    .send({ method: 'in_person', note: ATTESTATION }).expect(401);
  assert.equal((await row(seller.id)).id_verified, 'none');
});

test('the document path records itself as documents, and revocation clears the record', async () => {
  const a = await admin();
  const seller = await register('Uploader', 'seller');
  await pool.query("UPDATE users SET id_verified='pending', id_submitted_at=NOW() WHERE id=$1", [seller.id]);

  await api().patch(`/id-verification/${seller.id}`)
    .set('Authorization', `Bearer ${a.token}`).send({ decision: 'approved' }).expect(200);
  const approved = await row(seller.id);
  assert.equal(approved.id_verification_method, 'documents');
  assert.equal(approved.id_verified_by, a.id);
  assert.equal(approved.id_verification_note, null);   // the files are the evidence

  await api().patch(`/id-verification/${seller.id}`)
    .set('Authorization', `Bearer ${a.token}`).send({ decision: 'rejected' }).expect(200);
  const revoked = await row(seller.id);
  assert.equal(revoked.id_verified, 'rejected');
  assert.equal(revoked.id_verification_method, null);
  assert.equal(revoked.id_verified_at, null);
  assert.equal(revoked.id_verified_by, null);
  // Revoking an approval does end the session — that is the existing contract.
  assert.equal(revoked.token_version, approved.token_version + 1);
});

test('an offline approval overwriting a document approval keeps a full audit trail', async () => {
  const a = await admin();
  const seller = await register('Corrected', 'seller');
  await pool.query("UPDATE users SET id_verified='pending' WHERE id=$1", [seller.id]);
  await api().patch(`/id-verification/${seller.id}`)
    .set('Authorization', `Bearer ${a.token}`).send({ decision: 'approved' }).expect(200);

  await api().post(`/id-verification/${seller.id}/manual`)
    .set('Authorization', `Bearer ${a.token}`)
    .send({ method: 'business_document', note: 'RDB certificate seen; company matches the seller name.' })
    .expect(200);

  const { rows } = await pool.query(
    `SELECT action, metadata FROM admin_audit_log
      WHERE target_id = $1 ORDER BY created_at ASC`, [seller.id]);
  const offline = rows.find((r) => r.action === 'identity.approved_offline');
  assert.ok(offline, 'the offline approval is in the audit log');
  assert.equal(offline.metadata.previous_status, 'approved');
  assert.equal(offline.metadata.previous_method, 'documents');
  assert.equal(offline.metadata.method, 'business_document');
  assert.ok(offline.metadata.note.length >= 10);
});

test('the directory reports how each identity was verified', async () => {
  const a = await admin();
  const seller = await register('Listed', 'seller');
  await api().post(`/id-verification/${seller.id}/manual`)
    .set('Authorization', `Bearer ${a.token}`)
    .send({ method: 'known_client', note: 'Long-standing client; ID copy held in the office file.' })
    .expect(200);

  const res = await api().get(`/admin/users?q=${encodeURIComponent(seller.email)}`)
    .set('Authorization', `Bearer ${a.token}`).expect(200);
  const found = res.body.find((u) => u.id === seller.id);
  assert.ok(found);
  assert.equal(found.id_verified, 'approved');
  assert.equal(found.id_verification_method, 'known_client');
  assert.equal(found.id_verified_by_name, 'Operator');
});

test('the database itself refuses an unattested off-platform approval', async () => {
  // The route validates, but a route is a thing a future caller can bypass.
  // This asserts the floor: the constraint, reached directly, with no HTTP
  // layer in the way at all.
  const seller = await register('Direct', 'seller');
  await assert.rejects(
    () => pool.query(
      `UPDATE users SET id_verified='approved', id_verification_method='in_person'
         WHERE id=$1`, [seller.id]),
    (err) => err.code === '23514'
  );
  await assert.rejects(
    () => pool.query(
      `UPDATE users SET id_verified='approved', id_verification_method='in_person',
              id_verification_note='  short  ' WHERE id=$1`, [seller.id]),
    (err) => err.code === '23514'
  );
  await assert.rejects(
    () => pool.query(
      `UPDATE users SET id_verification_method='vibes' WHERE id=$1`, [seller.id]),
    (err) => err.code === '23514'
  );
  assert.equal((await row(seller.id)).id_verified, 'none');
});

test.after(async () => { await pool.end(); });
