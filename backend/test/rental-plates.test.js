// ─────────────────────────────────────────────────────────────────────────────
// Hiding the plate on a rental car's photos (routes/rental-plates.js).
//
// What has to be true, as for sale photos (plate-mask.test.js): the published
// file no longer shows the plate, rental_cars.images points at it, the unmasked
// original is kept but not public, the old public file is gone, and the team can
// move the cover or take it off again. Only admins reach any of it.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const request = require('supertest');
const sharp = require('sharp');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { localPathForUrl } = require('../src/lib/upload-paths');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(overrides = {}) {
  const body = { name: 'Rental Plate', email: unique('rplate'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}

const PLATE = { x: 380, y: 560, w: 440, h: 110, imgW: 1200, imgH: 800 };
const photoWithPlate = () => sharp({
  create: { width: PLATE.imgW, height: PLATE.imgH, channels: 3, background: { r: 74, g: 81, b: 88 } },
}).composite([{
  input: Buffer.from(`<svg width="${PLATE.imgW}" height="${PLATE.imgH}">
    <rect x="${PLATE.x}" y="${PLATE.y}" width="${PLATE.w}" height="${PLATE.h}" fill="#FFFFFF"/></svg>`),
  top: 0, left: 0,
}]).jpeg().toBuffer();
const quad = (dx = 0) => [
  { x: (PLATE.x + dx) / PLATE.imgW, y: PLATE.y / PLATE.imgH },
  { x: (PLATE.x + PLATE.w + dx) / PLATE.imgW, y: PLATE.y / PLATE.imgH },
  { x: (PLATE.x + PLATE.w + dx) / PLATE.imgW, y: (PLATE.y + PLATE.h) / PLATE.imgH },
  { x: (PLATE.x + dx) / PLATE.imgW, y: (PLATE.y + PLATE.h) / PLATE.imgH },
];
async function whiteShare(buffer) {
  const { data, info } = await sharp(buffer)
    .extract({ left: PLATE.x + 20, top: PLATE.y + 20, width: PLATE.w - 40, height: PLATE.h - 40 })
    .raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white += 1;
  }
  return white / (info.width * info.height);
}
const pathOf = (url) => new URL(url).pathname;

test('the team covers, moves and removes a plate on a rental photo', async () => {
  const adminUser = await register();
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [adminUser.id]);
  const admin = (await api().post('/auth/login').send({ email: adminUser.email, password: adminUser.password })).body.token;
  const auth = { Authorization: `Bearer ${admin}` };
  const provider = await register({ role: 'seller' });

  const { rows: [car] } = await pool.query(
    "INSERT INTO rental_cars (title, daily_rate, provider_id, status) VALUES ('Plate test', 50000, $1, 'maintenance') RETURNING id",
    [provider.id]
  );
  const up = await api().post(`/rentals/${car.id}/photos`).set(auth)
    .attach('photos', await photoWithPlate(), 'car.jpg').expect(201);
  const firstUrl = up.body.images[0];
  assert.ok(await whiteShare(fs.readFileSync(localPathForUrl(firstUrl))) > 0.9, 'fixture shows a plate');

  // Not for providers or anonymous callers.
  await api().patch(`/rentals/${car.id}/photo-plates`).send({ url: firstUrl, quad: quad() }).expect(401);
  await api().patch(`/rentals/${car.id}/photo-plates`).set('Authorization', `Bearer ${provider.token}`)
    .send({ url: firstUrl, quad: quad() }).expect(403);
  await api().patch(`/rentals/${car.id}/photo-plates`).set(auth)
    .send({ url: 'https://elsewhere.test/x.jpg', quad: quad() }).expect(404);

  // Cover.
  const masked = await api().patch(`/rentals/${car.id}/photo-plates`).set(auth)
    .send({ url: firstUrl, quad: quad() }).expect(200);
  const maskedUrl = masked.body.images[0];
  assert.notEqual(maskedUrl, firstUrl, 'published under a new address');
  assert.equal(masked.body.plates.length, 1);
  assert.ok(await whiteShare(fs.readFileSync(localPathForUrl(maskedUrl))) < 0.1, 'plate hidden in the published file');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fs.existsSync(localPathForUrl(firstUrl)), false, 'old public file with the plate is gone');
  await api().get(pathOf(firstUrl)).expect(404);
  const { rows: [kept] } = await pool.query('SELECT original_url FROM rental_photo_plates WHERE rental_car_id = $1', [car.id]);
  assert.match(kept.original_url, /\/uploads\/plate-originals\/rentals\//);
  await api().get(pathOf(kept.original_url)).expect(403);

  // The editor gets the clean original; others do not.
  const original = await api().get(`/rentals/${car.id}/photo-plates/original`).query({ url: maskedUrl }).set(auth).expect(200);
  assert.ok(await whiteShare(original.body) > 0.9, 'editor sees the unmasked original');
  await api().get(`/rentals/${car.id}/photo-plates/original`).query({ url: maskedUrl })
    .set('Authorization', `Bearer ${provider.token}`).expect(403);

  // Move: re-cut from the original, still one row, old masked file removed.
  const moved = await api().patch(`/rentals/${car.id}/photo-plates`).set(auth)
    .send({ url: maskedUrl, quad: quad(10) }).expect(200);
  const movedUrl = moved.body.images[0];
  assert.notEqual(movedUrl, maskedUrl);
  assert.equal(moved.body.plates.length, 1);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fs.existsSync(localPathForUrl(maskedUrl)), false);

  // Remove: the original is published again and the private copy is cleaned up.
  const removed = await api().patch(`/rentals/${car.id}/photo-plates`).set(auth)
    .send({ url: movedUrl, plate_state: 'none' }).expect(200);
  assert.equal(removed.body.plates.length, 0);
  assert.ok(await whiteShare(fs.readFileSync(localPathForUrl(removed.body.images[0]))) > 0.9);

  const audit = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id = $1::text AND action LIKE 'rental_car.photo_plate%' ORDER BY created_at",
    [car.id]
  );
  assert.deepEqual(audit.rows.map((r) => r.action),
    ['rental_car.photo_plate_masked', 'rental_car.photo_plate_masked', 'rental_car.photo_plate_cover_removed']);
});
