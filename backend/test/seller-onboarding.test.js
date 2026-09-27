// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 of docs/WEB-PARITY-PLAN.md: the backend half of seller onboarding
// that both clients now use.
//
//   · ID photos lose their metadata on the way to disk (B4), without being
//     re-encoded, and the upload records how they were captured (P2-D2).
//   · A seller can attach reference photos to their own submission (B2), the
//     photos land in a public folder rather than the private ID one (F4), and
//     the 12-photo cap holds even when the check and the write race.
//
// Real Postgres, real multer, real files on disk.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const sharp = require('sharp');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(overrides = {}) {
  const body = { name: 'Onboarding User', email: unique('onb'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

async function makeAdmin(user) {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

async function photoWithGps() {
  return sharp({ create: { width: 32, height: 24, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .jpeg()
    .withExif({ IFD0: { Make: 'TestPhone', ImageDescription: 'my driveway' } })
    .toBuffer();
}

const jpeg = (buffer, filename) => [buffer, { filename, contentType: 'image/jpeg' }];

test.after(async () => { await pool.end(); });

test('ID photos are stored without their EXIF, and the capture source is recorded', async () => {
  const seller = await register({ role: 'seller' });
  const photo = await photoWithGps();

  await api().post('/id-verification').set('Authorization', `Bearer ${seller.token}`)
    .attach('id_front', ...jpeg(photo, 'front.jpg'))
    .attach('id_back', ...jpeg(photo, 'back.jpg'))
    .attach('selfie', ...jpeg(photo, 'selfie.jpg'))
    .field('capture_source', 'live')
    .expect(200);

  const { rows } = await pool.query(
    'SELECT id_verified, id_capture_source, id_front_url FROM users WHERE id = $1', [seller.id]
  );
  assert.equal(rows[0].id_verified, 'pending');
  assert.equal(rows[0].id_capture_source, 'live');

  const stored = fs.readFileSync(path.join(UPLOAD_DIR, 'id-docs', path.basename(rows[0].id_front_url)));
  assert.equal((await sharp(stored).metadata()).exif, undefined, 'EXIF must be gone from the stored ID photo');
  assert.ok(!stored.includes(Buffer.from('my driveway')));

  // Reviewers see the source in their queue.
  const admin = await makeAdmin(await register());
  const queue = await api().get('/id-verification/queue').set('Authorization', `Bearer ${admin}`).expect(200);
  const row = queue.body.find((u) => u.id === seller.id);
  assert.equal(row.id_capture_source, 'live');
});

test('an unknown capture source is stored as unknown, never refused', async () => {
  const seller = await register({ role: 'seller' });
  const photo = await photoWithGps();

  await api().post('/id-verification').set('Authorization', `Bearer ${seller.token}`)
    .attach('id_front', ...jpeg(photo, 'front.jpg'))
    .attach('id_back', ...jpeg(photo, 'back.jpg'))
    .attach('selfie', ...jpeg(photo, 'selfie.jpg'))
    .field('capture_source', 'definitely-a-webcam')
    .expect(200);

  const { rows } = await pool.query('SELECT id_capture_source FROM users WHERE id = $1', [seller.id]);
  assert.equal(rows[0].id_capture_source, null);
});

async function newSubmission(seller) {
  const res = await api().post('/submissions').set('Authorization', `Bearer ${seller.token}`)
    .send({ make: 'Toyota', model: 'RAV4', year: 2019, mileage: 60000, asking_price: 20000000 })
    .expect(201);
  return res.body;
}

test('a seller attaches reference photos to their own submission, in a public folder', async () => {
  const seller = await register({ role: 'seller' });
  const submission = await newSubmission(seller);
  const photo = await photoWithGps();

  const res = await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${seller.token}`)
    .attach('photos', ...jpeg(photo, 'front.jpg'))
    .attach('photos', ...jpeg(photo, 'side.jpg'))
    .expect(201);

  assert.equal(res.body.reference_images.length, 2);
  for (const url of res.body.reference_images) {
    assert.match(url, new RegExp(`/uploads/submissions/${submission.id}/`), 'must not land in the private id-docs folder');
    const onDisk = path.join(UPLOAD_DIR, 'submissions', submission.id, path.basename(url));
    const stored = fs.readFileSync(onDisk);
    assert.equal((await sharp(stored).metadata()).exif, undefined, 'a small reference photo must not keep its GPS');
  }

  // And it is actually servable, unlike anything under /uploads/id-docs.
  const publicPath = new URL(res.body.reference_images[0]).pathname;
  await api().get(publicPath).expect(200);
});

test('nobody else can add photos to a submission', async () => {
  const seller = await register({ role: 'seller' });
  const stranger = await register({ role: 'seller' });
  const submission = await newSubmission(seller);
  const photo = await photoWithGps();

  await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${stranger.token}`)
    .attach('photos', ...jpeg(photo, 'front.jpg'))
    .expect(404);
  await api().post(`/submissions/${submission.id}/reference-photos`)
    .attach('photos', ...jpeg(photo, 'front.jpg'))
    .expect(401);

  const { rows } = await pool.query('SELECT reference_images FROM submissions WHERE id = $1', [submission.id]);
  assert.equal(rows[0].reference_images, null);
});

test('the 12-photo cap holds, including when a batch would cross it', async () => {
  const seller = await register({ role: 'seller' });
  const submission = await newSubmission(seller);
  const photo = await photoWithGps();
  const eleven = Array.from({ length: 11 }, (_, i) => `https://example.test/ref-${i}.jpg`);
  await pool.query('UPDATE submissions SET reference_images = $2 WHERE id = $1', [submission.id, eleven]);

  // 11 stored + 2 sent = 13: the pre-check passes (11 < 12), the write refuses.
  const refused = await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${seller.token}`)
    .attach('photos', ...jpeg(photo, 'a.jpg'))
    .attach('photos', ...jpeg(photo, 'b.jpg'))
    .expect(409);
  assert.match(refused.body.error, /at most 12/);

  // One more fits exactly.
  const ok = await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${seller.token}`)
    .attach('photos', ...jpeg(photo, 'c.jpg'))
    .expect(201);
  assert.equal(ok.body.reference_images.length, 12);

  // Full: refused before anything is written.
  await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${seller.token}`)
    .attach('photos', ...jpeg(photo, 'd.jpg'))
    .expect(409);
});

test('a request with no photo, or a file that is not an image, is refused', async () => {
  const seller = await register({ role: 'seller' });
  const submission = await newSubmission(seller);

  await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${seller.token}`)
    .field('note', 'nothing attached')
    .expect(400);
  await api().post(`/submissions/${submission.id}/reference-photos`)
    .set('Authorization', `Bearer ${seller.token}`)
    .attach('photos', Buffer.from('<?php echo 1; ?>'), { filename: 'evil.jpg', contentType: 'image/jpeg' })
    .expect(400);
});
