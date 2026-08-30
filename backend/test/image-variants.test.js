// ─────────────────────────────────────────────────────────────────────────────
// Photos at the size they are drawn.
//
// Every uploaded photo is a single 1600×1200 JPEG averaging 460 KB, so a phone
// rendering a 400-pixel card was downloading the whole thing and discarding
// most of the pixels — roughly nine megabytes of covers for a twenty-car feed,
// on mobile data.
//
// These tests measure the saving rather than asserting a header exists, because
// the only claim worth making is a number: a card-sized variant must be a small
// fraction of the original or the middleware is not earning its complexity.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const sharp = require('sharp');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_at_least_32_characters_long';

const { app } = require('../server');
const pool = require('../src/db');

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const DIR = path.join(UPLOAD_ROOT, 'cars', 'variant-test');
const NAME = `photo-${Date.now()}.jpg`;

/** A photograph-like image: real detail, so the numbers mean something. A flat
 *  colour would compress to nothing at every size and prove nothing. */
async function realisticPhoto() {
  const w = 1600; const h = 1200;
  const noise = Buffer.alloc(w * h * 3);
  for (let i = 0; i < noise.length; i += 3) {
    const x = (i / 3) % w; const y = Math.floor(i / 3 / w);
    noise[i] = (Math.sin(x / 40) * 90 + 130 + Math.random() * 25) & 255;
    noise[i + 1] = (Math.cos(y / 30) * 80 + 120 + Math.random() * 25) & 255;
    noise[i + 2] = ((x * y) % 200) + Math.random() * 40;
  }
  return sharp(noise, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 82, progressive: true }).toBuffer();
}

const fetchBinary = (req) => req.buffer(true).parse((res, cb) => {
  const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks)));
});

let originalBytes = 0;

test.before(async () => {
  await fs.promises.mkdir(DIR, { recursive: true });
  const photo = await realisticPhoto();
  originalBytes = photo.length;
  await fs.promises.writeFile(path.join(DIR, NAME), photo);
});

test('a card-sized request costs a fraction of the full photo', async () => {
  const url = `/uploads/cars/variant-test/${NAME}`;

  const full = await fetchBinary(request(app).get(url)).expect(200);
  assert.equal(full.body.length, originalBytes, 'no width asked for means the original');

  const card = await fetchBinary(
    request(app).get(`${url}?w=400`).set('Accept', 'image/webp,image/*')
  ).expect(200);

  assert.equal(card.headers['content-type'], 'image/webp', 'WebP when the client accepts it');
  const meta = await sharp(card.body).metadata();
  assert.equal(meta.width, 400, 'resized to the width asked for');

  const ratio = card.body.length / originalBytes;
  assert.ok(ratio < 0.2,
    `a 400px card should cost well under a fifth of the original — got ${(ratio * 100).toFixed(1)}% `
    + `(${(card.body.length / 1024).toFixed(0)}KB of ${(originalBytes / 1024).toFixed(0)}KB)`);
  console.log(`      400px WebP: ${(card.body.length / 1024).toFixed(0)}KB `
    + `vs ${(originalBytes / 1024).toFixed(0)}KB original — ${(100 - ratio * 100).toFixed(0)}% smaller`);
});

test('a client that cannot read WebP still gets a resized JPEG', async () => {
  const res = await fetchBinary(
    request(app).get(`/uploads/cars/variant-test/${NAME}?w=400`).set('Accept', 'image/*')
  ).expect(200);
  assert.equal(res.headers['content-type'], 'image/jpeg');
  assert.equal((await sharp(res.body).metadata()).width, 400);
  assert.ok(res.body.length < originalBytes);
  // Any shared cache must key on Accept, or a WebP body reaches a client that
  // cannot decode it.
  assert.match(String(res.headers.vary || ''), /Accept/i);
});

test('photos are cacheable for a year, which they were not', async () => {
  const variant = await request(app).get(`/uploads/cars/variant-test/${NAME}?w=800`)
    .set('Accept', 'image/webp').expect(200);
  assert.match(variant.headers['cache-control'], /max-age=31536000/);
  assert.match(variant.headers['cache-control'], /immutable/);

  // The original too. It used to be `max-age=0`, so every phone revalidated
  // every photo on every screen.
  const original = await request(app).get(`/uploads/cars/variant-test/${NAME}`).expect(200);
  assert.match(original.headers['cache-control'], /max-age=31536000/);
  assert.doesNotMatch(original.headers['cache-control'], /max-age=0/);
});

test('the width parameter cannot be used to fill the disk', async () => {
  const cacheDir = path.join(UPLOAD_ROOT, '.variants');
  const before = fs.existsSync(cacheDir) ? (await fs.promises.readdir(cacheDir)).length : 0;

  // Widths outside the allowlist are served the original rather than refused:
  // a slightly-too-large photo beats a broken one.
  for (const w of [1, 7, 13, 399, 401, 99999, -100]) {
    const res = await fetchBinary(request(app).get(`/uploads/cars/variant-test/${NAME}?w=${w}`)
      .set('Accept', 'image/webp')).expect(200);
    assert.equal(res.body.length, originalBytes, `w=${w} is not a cacheable size`);
  }
  for (const w of ['abc', '', '400px', '4e2']) {
    await request(app).get(`/uploads/cars/variant-test/${NAME}?w=${w}`).expect(200);
  }

  const after = fs.existsSync(cacheDir) ? (await fs.promises.readdir(cacheDir)).length : 0;
  assert.equal(after, before, 'not one cache file was created by any of that');
});

test('resizing cannot reach a denied directory or escape the upload root', async () => {
  // The denied prefixes answer before this middleware, so no variant of an ID
  // scan or an unmasked plate can be produced. Asserted because the whole point
  // of burning a plate badge in is that the readable original is unreachable.
  await request(app).get('/uploads/id-docs/anything.jpg?w=400').expect(403);
  await request(app).get('/uploads/plate-originals/x/anything.jpg?w=400').expect(403);
  await request(app).get('/uploads/contracts/x.jpg?w=400').expect(403);

  for (const attempt of [
    '/uploads/../server.js?w=400',
    '/uploads/cars/../../server.js?w=400',
    '/uploads/%2e%2e/server.js?w=400',
  ]) {
    const res = await request(app).get(attempt);
    assert.notEqual(res.status, 200, `${attempt} must not be served`);
  }
});

test('a re-masked photo does not keep serving the old derivative', async () => {
  // The cache key includes mtime and size. Without that, masking a plate on a
  // photo whose card-sized variant was already cached would keep showing the
  // readable plate at card size — the exact failure the masking feature exists
  // to prevent.
  const name = `remask-${Date.now()}.jpg`;
  const file = path.join(DIR, name);
  await fs.promises.writeFile(file, await realisticPhoto());
  const first = await fetchBinary(request(app).get(`/uploads/cars/variant-test/${name}?w=400`)
    .set('Accept', 'image/webp')).expect(200);

  // A different image at the same path, as a re-mask would produce.
  await new Promise((r) => setTimeout(r, 1100));   // ensure a distinct mtime
  await fs.promises.writeFile(file, await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: { r: 10, g: 10, b: 10 } },
  }).jpeg({ quality: 82 }).toBuffer());

  const second = await fetchBinary(request(app).get(`/uploads/cars/variant-test/${name}?w=400`)
    .set('Accept', 'image/webp')).expect(200);
  assert.notEqual(second.body.length, first.body.length,
    'the derivative followed the file it came from');
});

test.after(async () => {
  await fs.promises.rm(DIR, { recursive: true, force: true });
  await pool.end();
});

// ─────────────────────────────────────────────────────────────────────────────
// The cache is bounded.
//
// The key includes the source file's mtime and size — which is what stops a
// re-masked plate serving a stale derivative, and also means every re-mask
// strands up to eight files under a key nothing will request again. Nothing
// deleted them, so the directory could only ever grow.
// ─────────────────────────────────────────────────────────────────────────────
const { sweepCache, CACHE_LIMIT_BYTES } = require('../src/middleware/image-variants');

test('the variant cache evicts least-recently-used files once it is over its limit', async () => {
  const cacheRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'sawa-variants-'));
  try {
    // Comfortably over the limit, with distinct access times so "oldest first"
    // is a real ordering rather than a coin toss.
    const chunk = Math.ceil(CACHE_LIMIT_BYTES / 8);
    const names = [];
    for (let i = 0; i < 10; i++) {
      const name = `${String(i).padStart(2, '0')}.jpeg`;
      const file = path.join(cacheRoot, name);
      await fsp.writeFile(file, Buffer.alloc(chunk, i));
      // i = 0 is the oldest access, i = 9 the newest.
      const when = new Date(Date.now() - (10 - i) * 3600_000);
      await fsp.utimes(file, when, when);
      names.push(name);
    }

    const before = await fsp.readdir(cacheRoot);
    assert.equal(before.length, 10);

    await sweepCache(cacheRoot);

    const after = await fsp.readdir(cacheRoot);
    assert.ok(after.length < before.length, 'something was actually evicted');

    let total = 0;
    for (const name of after) total += (await fsp.stat(path.join(cacheRoot, name))).size;
    assert.ok(total <= CACHE_LIMIT_BYTES, `swept back under the limit: ${total}`);

    // The survivors are the most recently used ones, not an arbitrary subset.
    const survivorIndexes = after.map((n) => Number(n.slice(0, 2))).sort((a, b) => a - b);
    const evictedIndexes = names.map((n) => Number(n.slice(0, 2)))
      .filter((i) => !survivorIndexes.includes(i));
    assert.ok(Math.max(...evictedIndexes) < Math.min(...survivorIndexes),
      `evicted ${evictedIndexes} but kept ${survivorIndexes} — eviction must be oldest-first`);
  } finally {
    await fsp.rm(cacheRoot, { recursive: true, force: true });
  }
});

test('a sweep of a cache that does not exist is not an error', async () => {
  await sweepCache(path.join(os.tmpdir(), 'sawa-variants-never-created'));
});

test('a half-written derivative is never evicted out from under the request writing it', async () => {
  const cacheRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'sawa-variants-tmp-'));
  try {
    const chunk = Math.ceil(CACHE_LIMIT_BYTES / 4);
    for (let i = 0; i < 6; i++) {
      await fsp.writeFile(path.join(cacheRoot, `${i}.jpeg`), Buffer.alloc(chunk, i));
    }
    const inFlight = path.join(cacheRoot, 'abc.jpeg.1234.tmp');
    await fsp.writeFile(inFlight, Buffer.alloc(chunk, 9));

    await sweepCache(cacheRoot);

    assert.equal(fs.existsSync(inFlight), true,
      'a .tmp file belongs to a request that has not finished writing it');
  } finally {
    await fsp.rm(cacheRoot, { recursive: true, force: true });
  }
});
