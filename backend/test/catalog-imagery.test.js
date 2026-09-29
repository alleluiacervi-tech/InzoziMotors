// ─────────────────────────────────────────────────────────────────────────────
// Import-catalogue imagery (migration 0050): official photographs with a
// recorded source, studio renders only after a person confirms them, and no
// more Wikimedia Commons.
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
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function register(name = 'Buyer') {
  const email = unique('img');
  const password = 'password123';
  const r = await api().post('/auth/register').send({ name, email, password, role: 'buyer' }).expect(201);
  return { id: r.body.user.id, email, password, token: r.body.token };
}
async function admin() {
  const u = await register('Admin');
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [u.id]);
  const r = await api().post('/auth/login').send({ email: u.email, password: u.password }).expect(200);
  return { ...u, token: r.body.token };
}
async function model(make, modelName) {
  const { rows } = await pool.query(
    'SELECT id FROM global_import_catalog WHERE lower(make)=lower($1) AND lower(model)=lower($2) AND active = TRUE',
    [make, modelName]
  );
  assert.ok(rows.length, `${make} ${modelName} is in the seeded catalogue`);
  return rows[0].id;
}
const publicRow = async (id) => (await api().get(`/imports/catalog/${id}`).expect(200)).body;

test.after(async () => pool.end());

test('the Wikimedia Commons routes are retired', async () => {
  const a = await admin();
  const id = await model('Kia', 'Sorento');
  const find = await api().post('/imports/admin/catalog/find-images').set('Authorization', `Bearer ${a.token}`).expect(410);
  assert.equal(find.body.code, 'COMMONS_RETIRED');
  await api().post(`/imports/admin/catalog/${id}/approve-image`).set('Authorization', `Bearer ${a.token}`)
    .send({ candidate_id: 'x' }).expect(410);
});

test('a studio render is public only after a person approves it', async () => {
  const a = await admin();
  const buyer = await register();
  const id = await model('Toyota', 'Hilux');
  await pool.query(
    `UPDATE global_import_catalog SET render_status='found', render_url='https://cdn.test/hilux.webp',
            render_review='unreviewed' WHERE id=$1`, [id]
  );
  assert.equal((await publicRow(id)).render_url, null, 'an unreviewed render stays private');

  await api().post(`/imports/admin/catalog/${id}/render-review`).set('Authorization', `Bearer ${buyer.token}`)
    .send({ decision: 'approved' }).expect(403);
  await api().post(`/imports/admin/catalog/${id}/render-review`).set('Authorization', `Bearer ${a.token}`)
    .send({ decision: 'maybe' }).expect(400);

  await api().post(`/imports/admin/catalog/${id}/render-review`).set('Authorization', `Bearer ${a.token}`)
    .send({ decision: 'approved' }).expect(200);
  assert.equal((await publicRow(id)).render_url, 'https://cdn.test/hilux.webp');
  const listed = await api().get('/imports/catalog?make=Toyota').expect(200);
  assert.equal(listed.body.items.find((row) => row.id === id).render_url, 'https://cdn.test/hilux.webp');

  await api().post(`/imports/admin/catalog/${id}/render-review`).set('Authorization', `Bearer ${a.token}`)
    .send({ decision: 'rejected' }).expect(200);
  assert.equal((await publicRow(id)).render_url, null, 'a rejected render never shows');

  const imagery = await api().get('/imports/admin/catalog/imagery').set('Authorization', `Bearer ${a.token}`).expect(200);
  assert.ok(Array.isArray(imagery.body.items));
  assert.equal(typeof imagery.body.renders_enabled, 'boolean');
  assert.equal(imagery.body.items.find((row) => row.id === id).render_review, 'rejected');
});

test('an official photo needs its source, is served publicly without it, and can be removed', async () => {
  const a = await admin();
  const id = await model('Hyundai', 'Tucson');

  await api().post(`/imports/admin/catalog/${id}/photo`).set('Authorization', `Bearer ${a.token}`)
    .attach('photo', PNG_1x1, { filename: 'tucson.png', contentType: 'image/png' }).expect(400);

  const source = 'Hyundai dealer media kit — permission by email 30 Sep 2026';
  const set = await api().post(`/imports/admin/catalog/${id}/photo`).set('Authorization', `Bearer ${a.token}`)
    .field('source', source)
    .attach('photo', PNG_1x1, { filename: 'tucson.png', contentType: 'image/png' }).expect(200);
  assert.equal(set.body.image_status, 'official');
  assert.match(set.body.images[0], /\/uploads\/catalog\/|cloudinary/);

  const pub = await publicRow(id);
  assert.deepEqual(pub.images, set.body.images);
  assert.ok(!JSON.stringify(pub).includes('media kit'), 'the source note is internal');

  const audit = await pool.query("SELECT 1 FROM admin_audit_log WHERE action='import_catalog.photo_set' AND target_id=$1", [id]);
  assert.ok(audit.rowCount >= 1);

  await api().delete(`/imports/admin/catalog/${id}/photo`).set('Authorization', `Bearer ${a.token}`).expect(200);
  assert.deepEqual((await publicRow(id)).images, []);
});

test('the database refuses an official photo with no source', async () => {
  const id = await model('Kia', 'Soul');
  await assert.rejects(
    pool.query("UPDATE global_import_catalog SET image_status='official', image_source=NULL WHERE id=$1", [id]),
    /global_import_catalog_official_needs_source/
  );
});
