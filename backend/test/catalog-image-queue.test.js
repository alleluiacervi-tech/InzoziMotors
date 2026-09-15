// ─────────────────────────────────────────────────────────────────────────────
// The photo review queue: propose, then approve.
//
// Nothing here calls the real Wikimedia API -- findCandidates is replaced with
// a stub before the app is required, so this suite is fast, hermetic, and does
// not depend on (or hammer) a public service. The stub's SHAPE is exactly what
// commons-images.js returns; a live check of that contract lives in
// backend/src/lib/commons-images.js's own manual verification, not here.
//
// What these tests protect: a candidate never reaches `images` without going
// through approve-image; approve-image writes the attribution a CC licence
// requires; skip-image leaves the row alone rather than guessing; and the
// database itself refuses a credit with no approval, so a bug in the route
// cannot silently ship an uncredited photo.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const commonsImages = require('../src/lib/commons-images');
const STUB_CANDIDATE = {
  source: 'wikimedia_commons',
  title: 'File:Test Kia Sorento.jpg',
  image_url: 'https://upload.wikimedia.org/test/sorento-1024.jpg',
  thumb_url: 'https://upload.wikimedia.org/test/sorento-400.jpg',
  page_url: 'https://commons.wikimedia.org/wiki/File:Test_Kia_Sorento.jpg',
  author: 'Test Photographer',
  license_name: 'CC BY-SA 4.0',
  license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  width: 1024,
  height: 683,
};
// Patched onto the module's own export object BEFORE ../server (and so
// routes/imports.js) is required, so the destructured reference imports.js
// takes at require time is already this stub.
commonsImages.findCandidates = async () => [STUB_CANDIDATE];

const { app } = require('../server');
const pool = require('../src/db');
const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
async function register(name = 'Buyer') {
  const email = unique('imgq');
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
test.after(async () => pool.end());

// Every model, moved out of the way except the one under test. Keeps the
// suite's queries small and its assertions exact regardless of how the shared
// catalogue seed grows over time.
async function isolateOneModel(make, model) {
  // Leaves rows an earlier test in this file already approved untouched --
  // touching image_status on an approved row without clearing its credit
  // would itself trip global_import_catalog_credit_needs_approval.
  await pool.query("UPDATE global_import_catalog SET image_status='skipped' WHERE image_status != 'approved'");
  const { rows: [row] } = await pool.query(
    `UPDATE global_import_catalog SET image_status='pending'
      WHERE lower(make)=lower($1) AND lower(model)=lower($2) AND image_status != 'approved'
      RETURNING id`,
    [make, model]
  );
  return row.id;
}

test('find-images stores candidates without touching images, and only an admin may run it', async () => {
  const buyer = await register();
  const operator = await admin();
  const catalogId = await isolateOneModel('Kia', 'Sorento');

  await api().post('/imports/admin/catalog/find-images')
    .set('Authorization', `Bearer ${buyer.token}`).send({}).expect(403);

  const r = await api().post('/imports/admin/catalog/find-images')
    .set('Authorization', `Bearer ${operator.token}`).send({ limit: 5 }).expect(200);
  assert.equal(r.body.checked, 1);
  assert.equal(r.body.with_candidates, 1);

  const { rows: [row] } = await pool.query(
    'SELECT image_status, images FROM global_import_catalog WHERE id=$1', [catalogId]
  );
  assert.equal(row.image_status, 'searched');
  assert.deepEqual(row.images, [], 'a candidate must never write to images by itself');

  const { rows: candidates } = await pool.query(
    "SELECT * FROM catalog_image_candidates WHERE catalog_id=$1 AND status='pending'", [catalogId]
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].author, 'Test Photographer');
  assert.equal(candidates[0].license_name, 'CC BY-SA 4.0');
});

test('the queue lists only models awaiting a decision, each with its candidates', async () => {
  const operator = await admin();
  await isolateOneModel('Kia', 'Sportage');
  await api().post('/imports/admin/catalog/find-images')
    .set('Authorization', `Bearer ${operator.token}`).send({ limit: 5 }).expect(200);

  const r = await api().get('/imports/admin/catalog/image-queue')
    .set('Authorization', `Bearer ${operator.token}`).expect(200);
  assert.equal(r.body.items.length, 1);
  assert.equal(r.body.items[0].model, 'Sportage');
  assert.equal(r.body.items[0].candidates.length, 1);
  assert.equal(r.body.items[0].candidates[0].image_url, STUB_CANDIDATE.image_url);
});

test('approving a candidate writes images and the licence attribution together, and the public catalogue serves both', async () => {
  const operator = await admin();
  const catalogId = await isolateOneModel('Kia', 'Seltos');
  await api().post('/imports/admin/catalog/find-images')
    .set('Authorization', `Bearer ${operator.token}`).send({ limit: 5 }).expect(200);

  const queue = await api().get('/imports/admin/catalog/image-queue')
    .set('Authorization', `Bearer ${operator.token}`).expect(200);
  const candidateId = queue.body.items[0].candidates[0].id;

  const approved = await api().post(`/imports/admin/catalog/${catalogId}/approve-image`)
    .set('Authorization', `Bearer ${operator.token}`).send({ candidate_id: candidateId }).expect(200);
  assert.deepEqual(approved.body.images, [STUB_CANDIDATE.image_url]);
  assert.equal(approved.body.image_status, 'approved');
  assert.equal(approved.body.image_credit_author, STUB_CANDIDATE.author);
  assert.equal(approved.body.image_credit_license, STUB_CANDIDATE.license_name);
  assert.equal(approved.body.image_credit_source_url, STUB_CANDIDATE.page_url);

  // Public, unauthenticated -- exactly what the app requests.
  const pub = await api().get('/imports/catalog?make=Kia').expect(200);
  const row = pub.body.items.find((i) => i.id === catalogId);
  assert.deepEqual(row.images, [STUB_CANDIDATE.image_url]);
  assert.equal(row.image_credit_author, STUB_CANDIDATE.author);
  assert.equal(row.image_credit_license_url, STUB_CANDIDATE.license_url);

  // Approving removes it from the queue.
  const after = await api().get('/imports/admin/catalog/image-queue')
    .set('Authorization', `Bearer ${operator.token}`).expect(200);
  assert.ok(!after.body.items.some((i) => i.id === catalogId));

  // Re-approving an already-decided candidate is refused, not silently repeated.
  await api().post(`/imports/admin/catalog/${catalogId}/approve-image`)
    .set('Authorization', `Bearer ${operator.token}`).send({ candidate_id: candidateId }).expect(404);
});

test('skipping leaves the model alone -- no image, no credit, off the queue', async () => {
  const operator = await admin();
  const catalogId = await isolateOneModel('Kia', 'Niro');
  await api().post('/imports/admin/catalog/find-images')
    .set('Authorization', `Bearer ${operator.token}`).send({ limit: 5 }).expect(200);

  const skipped = await api().post(`/imports/admin/catalog/${catalogId}/skip-image`)
    .set('Authorization', `Bearer ${operator.token}`).send({}).expect(200);
  assert.equal(skipped.body.image_status, 'skipped');

  const { rows: [row] } = await pool.query(
    'SELECT images, image_credit_author FROM global_import_catalog WHERE id=$1', [catalogId]
  );
  assert.deepEqual(row.images, []);
  assert.equal(row.image_credit_author, null);

  const queue = await api().get('/imports/admin/catalog/image-queue')
    .set('Authorization', `Bearer ${operator.token}`).expect(200);
  assert.ok(!queue.body.items.some((i) => i.id === catalogId));
});

test('the database itself refuses a credit on a row that was never approved', async () => {
  const catalogId = await isolateOneModel('Kia', 'Soul');
  await assert.rejects(
    pool.query(
      "UPDATE global_import_catalog SET image_credit_author='Somebody' WHERE id=$1",
      [catalogId]
    ),
    /global_import_catalog_credit_needs_approval/
  );
});
