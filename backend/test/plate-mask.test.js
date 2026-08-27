// ─────────────────────────────────────────────────────────────────────────────
// Hiding the registration plate.
//
// A plate identifies a vehicle and, through the registry, a person. The point of
// this feature is that the plate stops being publicly readable — so the tests
// that matter are the ones that prove the DESTRUCTIVE part:
//
//   • the published file no longer contains the plate;
//   • the file that does contain it is not reachable;
//   • cars.images moves with it, because the public payload reads that array
//     and a masked file beside an unmasked URL protects nobody.
//
// A display-time overlay would pass none of these, which is exactly why it was
// not built that way.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const sharp = require('sharp');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');
const { badgeSvg, assertBadgeRenders, readQuad, maskPlate } = require('../src/lib/plate-badge');

const api = () => request(app);
const unique = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;

async function register(overrides = {}) {
  const body = { name: 'Plate User', email: unique('plate'), password: 'password123', role: 'buyer', ...overrides };
  const res = await api().post('/auth/register').send(body).expect(201);
  return { ...body, token: res.body.token, id: res.body.user.id };
}
async function makeAdmin(user) {
  await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id]);
  const res = await api().post('/auth/login').send({ email: user.email, password: user.password }).expect(200);
  return res.body.token;
}

/** A photo of a "car" with a white plate in a known place. */
const PLATE = { x: 380, y: 560, w: 440, h: 110, imgW: 1200, imgH: 800 };
async function photoWithPlate() {
  return sharp({ create: { width: PLATE.imgW, height: PLATE.imgH, channels: 3, background: { r: 74, g: 81, b: 88 } } })
    .composite([{
      input: Buffer.from(`<svg width="${PLATE.imgW}" height="${PLATE.imgH}">
        <rect width="${PLATE.imgW}" height="${PLATE.imgH}" fill="#4A5158"/>
        <rect x="${PLATE.x}" y="${PLATE.y}" width="${PLATE.w}" height="${PLATE.h}" rx="10"
              fill="#FFFFFF" stroke="#111" stroke-width="4"/>
      </svg>`),
      top: 0, left: 0,
    }])
    .png().toBuffer();
}
const quadOverPlate = () => [
  { x: PLATE.x / PLATE.imgW, y: PLATE.y / PLATE.imgH },
  { x: (PLATE.x + PLATE.w) / PLATE.imgW, y: PLATE.y / PLATE.imgH },
  { x: (PLATE.x + PLATE.w) / PLATE.imgW, y: (PLATE.y + PLATE.h) / PLATE.imgH },
  { x: PLATE.x / PLATE.imgW, y: (PLATE.y + PLATE.h) / PLATE.imgH },
];

/** How much of the plate region is still near-white? A visible plate is white;
 *  the badge is black and red. This is the direct measure of "is it hidden". */
async function whiteShareOverPlate(buffer) {
  const { data, info } = await sharp(buffer)
    .extract({ left: PLATE.x + 20, top: PLATE.y + 20, width: PLATE.w - 40, height: PLATE.h - 40 })
    .raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white += 1;
  }
  return white / (info.width * info.height);
}

/** A car with one uploaded photo, ready to mask. */
async function listingWithPhoto(admin) {
  const auth = { Authorization: `Bearer ${admin}` };
  const seller = await register({ role: 'seller' });
  await pool.query("UPDATE users SET id_verified='approved' WHERE id=$1", [seller.id]);
  const car = await api().post('/cars').set(auth).send({
    seller_id: seller.id, title: 'Plate test car', make: 'Toyota', model: 'Corolla',
    year: 2018, mileage: 60000, price: 9000000, images: [],
  }).expect(201);

  const png = await photoWithPlate();
  const uploaded = await api().post(`/inspections/cars/${car.body.id}/photos`).set(auth)
    .attach('photos', png, { filename: 'front.png', contentType: 'image/png' })
    .expect(200);
  return { carId: car.body.id, photo: uploaded.body.photos[0] };
}

test.after(async () => { await pool.end(); });

// ─── The badge itself ────────────────────────────────────────────────────────

test('the badge is generated at the size it is needed, and never ships wordless', async () => {
  // Generated rather than a stored PNG: a raster stretched to a large plate goes
  // soft and squeezed onto a small one turns the wordmark to mud.
  const shapes = [[900, 240], [420, 300], [300, 70], [1400, 160]];
  for (const [w, h] of shapes) {
    const png = await sharp(badgeSvg(w, h)).png().toBuffer();
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, w, `badge width at ${w}x${h}`);
    assert.equal(meta.height, h, `badge height at ${w}x${h}`);
  }

  // src/lib/contract/fonts.js records pdfkit printing a name as empty boxes.
  // SVG text fails the same way — no fonts means a black slab that looks almost
  // right. This is the guard that refuses to publish one.
  const verdict = await assertBadgeRenders();
  assert.ok(verdict.white_share > 0.005, 'the wordmark must actually draw');
});

test('the geometry refuses anything it cannot cover', () => {
  assert.match(readQuad(null).error, /four corner/i);
  assert.match(readQuad([{ x: 0, y: 0 }]).error, /four corner/i);
  assert.match(readQuad([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]).error, /between 0 and 1/i);
  // A degenerate box would composite a smear that reads as a bug, not a mask.
  assert.match(readQuad([{ x: 0.5, y: 0.5 }, { x: 0.502, y: 0.5 }, { x: 0.502, y: 0.501 }, { x: 0.5, y: 0.501 }]).error, /too small/i);
  const good = readQuad(quadOverPlate());
  assert.equal(good.error, undefined);
  assert.equal(good.points.length, 4);
});

// ─── The plate actually disappears ───────────────────────────────────────────

test('the plate is gone from the pixels, not merely covered in the browser', async () => {
  const original = await photoWithPlate();
  const before = await whiteShareOverPlate(original);
  assert.ok(before > 0.9, `the fixture plate should be white (${before})`);

  const masked = await maskPlate(original, readQuad(quadOverPlate()));
  const after = await whiteShareOverPlate(masked);
  // The badge is black and red; only the wordmark is white, and it is a small
  // fraction of the area.
  assert.ok(after < 0.25, `the plate must be hidden in the file itself (${after})`);
});

// ─── The whole route ─────────────────────────────────────────────────────────

test('masking republishes the photo, hides the original, and moves the gallery with it', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  const before = await pool.query('SELECT plate_state, original_url FROM car_photos WHERE id=$1', [photo.id]);
  assert.equal(before.rows[0].plate_state, 'unreviewed', 'an unchecked photo must not pass for a cleared one');
  assert.equal(before.rows[0].original_url, null);

  const result = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: quadOverPlate() }).expect(200);

  const row = (await pool.query(
    'SELECT url, original_url, plate_state, plate_mask FROM car_photos WHERE id=$1', [photo.id]
  )).rows[0];
  assert.equal(row.plate_state, 'masked');
  assert.ok(row.original_url, 'the original must be kept — it is checklist evidence');
  assert.ok(row.plate_mask.points.length === 4, 'the geometry is stored so it can be re-rendered');
  assert.notEqual(row.url, photo.url, 'a new filename, or every cache keeps serving the plate');

  // The original lives on a path the server denies outright.
  assert.match(row.original_url, /\/uploads\/plate-originals\//);
  const path = row.original_url.slice(row.original_url.indexOf('/uploads/'));
  await api().get(path).expect(403);

  // cars.images is what the public payload reads. If it still held the old URL,
  // the masked file would protect nobody.
  const images = (await pool.query('SELECT images FROM cars WHERE id=$1', [carId])).rows[0].images;
  assert.ok(images.includes(row.url), 'the gallery must carry the masked URL');
  assert.equal(images.includes(photo.url), false, 'and must not carry the unmasked one');
  assert.ok(result.body.photos.some((p) => p.url === row.url));
});

test('re-masking works from the original, so badges never stack', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: quadOverPlate() }).expect(200);
  const first = (await pool.query('SELECT url, original_url FROM car_photos WHERE id=$1', [photo.id])).rows[0];

  // An operator who placed the box badly must be able to try again and get a
  // clean result, not a second badge on top of the first.
  const moved = quadOverPlate().map((p) => ({ x: p.x, y: p.y - 0.02 }));
  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: moved }).expect(200);
  const second = (await pool.query('SELECT url, original_url, plate_mask FROM car_photos WHERE id=$1', [photo.id])).rows[0];

  assert.equal(second.original_url, first.original_url, 'the original is kept once and reused');
  assert.notEqual(second.url, first.url, 'and the published file is replaced again');
  // The stored geometry is the NEW placement, so a re-render uses the corrected
  // box rather than the one the operator was trying to fix.
  assert.ok(
    second.plate_mask.points[0].y < quadOverPlate()[0].y,
    'the second attempt must overwrite the first geometry'
  );
  // And the plate is still hidden after the second pass — proof it re-masked
  // from the untouched original rather than from the already-badged file.
  const republished = second.url.slice(second.url.indexOf('/uploads/'));
  const served = await api().get(republished).expect(200);
  assert.ok(await whiteShareOverPlate(served.body) < 0.25, 'still hidden after re-masking');
});

test('a photo with no plate is cleared as a decision, not left unreviewed', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  // Returns the whole gallery, like every other photo mutation on this router:
  // clearing can now restore a file and reorder cars.images, so a single row is
  // no longer a complete answer.
  const cleared = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ plate_state: 'none' }).expect(200);
  assert.equal(cleared.body.photos.find((p) => p.id === photo.id).plate_state, 'none');

  const row = (await pool.query('SELECT url, plate_state, plate_mask FROM car_photos WHERE id=$1', [photo.id])).rows[0];
  assert.equal(row.plate_state, 'none');
  assert.equal(row.plate_mask, null);
  assert.equal(row.url, photo.url, 'declaring no plate must not touch the file');

  const { rows } = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id=$1 AND action='listing.photo_plate_cleared'", [carId]
  );
  assert.equal(rows.length, 1, 'the decision is on the record');
});

// ─── Getting it wrong, and fixing it ─────────────────────────────────────────
//
// The first version of this feature could place a cover and nothing else. If it
// landed in the wrong spot there was no way back: the editor opened on the
// already-masked file, so the plate being covered was invisible, and the gallery
// payload never reported plate_state, so the dashboard could not even tell a
// masked photo from an unreviewed one.

test('the gallery reports what has actually been decided about each plate', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  // Fresh upload: undecided, and honest about it.
  const fresh = await api().get(`/inspections/cars/${carId}/photos`).set(auth).expect(200);
  const before = fresh.body.photos.find((p) => p.id === photo.id);
  assert.equal(before.plate_state, 'unreviewed');
  assert.equal(before.has_original, false);
  assert.equal(before.plate_mask, null);

  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: quadOverPlate() }).expect(200);

  const after = await api().get(`/inspections/cars/${carId}/photos`).set(auth).expect(200);
  const masked = after.body.photos.find((p) => p.id === photo.id);
  assert.equal(masked.plate_state, 'masked');
  assert.equal(masked.has_original, true, 'the editor needs to know a clean copy exists');
  // The four points, not just a bounding box: the rotation lives in them, and
  // reopening the editor has to put the badge back where it was left.
  assert.equal(masked.plate_mask.points.length, 4);
  assert.ok(masked.plate_mask.bounds.width > 0);
  // The address of the original is never handed out — the path is denied.
  assert.equal(masked.original_url, undefined);
});

test('the editor is served the unmasked photograph, and only to an admin', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  // Before any mask there is no kept original, so the route points at the
  // published file rather than 404ing — one source for both cases.
  const passthrough = await api().get(`/inspections/cars/${carId}/photos/${photo.id}/original`)
    .set(auth).expect(302);
  assert.equal(passthrough.headers.location, photo.url);

  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: quadOverPlate() }).expect(200);

  const original = await api().get(`/inspections/cars/${carId}/photos/${photo.id}/original`)
    .set(auth).expect(200).buffer(true).parse((res, cb) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
  // This is the whole point of the route: the plate is READABLE here, which is
  // what makes placing a cover over it possible.
  assert.ok(await whiteShareOverPlate(original.body) > 0.9, 'the editor sees the real plate');

  // And the file it comes from is still unreachable without an admin session.
  const outsider = await register();
  await api().get(`/inspections/cars/${carId}/photos/${photo.id}/original`)
    .set('Authorization', `Bearer ${outsider.token}`).expect(403);
  await api().get(`/inspections/cars/${carId}/photos/${photo.id}/original`).expect(401);
});

test('a cover placed wrong can be taken off, and the original comes back', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  // Somewhere useless — the sky, not the plate.
  const wrong = [
    { x: 0.05, y: 0.05 }, { x: 0.35, y: 0.05 },
    { x: 0.35, y: 0.16 }, { x: 0.05, y: 0.16 },
  ];
  const maskedState = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: wrong }).expect(200);
  const maskedUrl = maskedState.body.photos.find((p) => p.id === photo.id).url;
  assert.notEqual(maskedUrl, photo.url);

  const removed = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ plate_state: 'none' }).expect(200);
  const restored = removed.body.photos.find((p) => p.id === photo.id);

  assert.equal(restored.plate_state, 'none');
  assert.equal(restored.plate_mask, null);
  assert.equal(restored.has_original, false, 'nothing is masked, so nothing is being kept back');
  assert.notEqual(restored.url, maskedUrl, 'a new address, so no cache serves the badged file');

  // The published pixels are the original again — badge gone, plate back.
  const served = await api().get(new URL(restored.url).pathname).expect(200)
    .buffer(true).parse((res, cb) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
  assert.ok(await whiteShareOverPlate(served.body) > 0.9, 'the original photograph is public again');

  // cars.images has to move with it or the site keeps serving the old file.
  const images = (await pool.query('SELECT images FROM cars WHERE id=$1', [carId])).rows[0].images;
  assert.ok(images.includes(restored.url));
  assert.equal(images.includes(maskedUrl), false);

  const { rows } = await pool.query(
    "SELECT action FROM admin_audit_log WHERE target_id=$1 AND action='listing.photo_plate_cover_removed'", [carId]
  );
  assert.equal(rows.length, 1, 'taking a cover off is a recorded act, not a silent one');
});

test('removing a cover and re-covering correctly leaves one badge, over the plate', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);
  const wrong = [
    { x: 0.05, y: 0.05 }, { x: 0.35, y: 0.05 },
    { x: 0.35, y: 0.16 }, { x: 0.05, y: 0.16 },
  ];

  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`).set(auth).send({ quad: wrong }).expect(200);
  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`).set(auth).send({ plate_state: 'none' }).expect(200);
  const fixed = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: quadOverPlate() }).expect(200);

  const row = fixed.body.photos.find((p) => p.id === photo.id);
  assert.equal(row.plate_state, 'masked');

  const served = await api().get(new URL(row.url).pathname).expect(200)
    .buffer(true).parse((res, cb) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
  // The plate is covered...
  assert.ok(await whiteShareOverPlate(served.body) < 0.25, 'the plate is hidden after the correction');
  // ...and the first, wrong badge is not still sitting in the sky, which is what
  // would happen if the round trip had masked a masked file.
  const sky = await sharp(served.body)
    .extract({ left: 80, top: 60, width: 300, height: 60 }).stats();
  assert.ok(sky.channels[0].max > 60, 'the discarded cover is not baked into the corner');
});

test('the plate routes validate their input and their caller', async () => {
  const admin = await makeAdmin(await register());
  const auth = { Authorization: `Bearer ${admin}` };
  const { carId, photo } = await listingWithPhoto(admin);

  const bad = await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set(auth).send({ quad: [{ x: 0, y: 0 }] }).expect(400);
  assert.equal(bad.body.code, 'PLATE_QUAD_INVALID');

  await api().patch(`/inspections/cars/${carId}/photos/00000000-0000-0000-0000-000000000000/plate`)
    .set(auth).send({ quad: quadOverPlate() }).expect(404);

  const outsider = await register();
  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .set('Authorization', `Bearer ${outsider.token}`).send({ quad: quadOverPlate() }).expect(403);
  await api().patch(`/inspections/cars/${carId}/photos/${photo.id}/plate`)
    .send({ quad: quadOverPlate() }).expect(401);

  // The editor previews the real artwork rather than a CSS lookalike.
  const preview = await api().get('/inspections/plate-badge/preview.png?w=600&h=160').set(auth).expect(200);
  assert.match(preview.headers['content-type'], /image\/png/);
  await api().get('/inspections/plate-badge/preview.png').expect(401);
});
