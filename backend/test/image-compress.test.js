// ─────────────────────────────────────────────────────────────────────────────
// Photographs are made a sane size on the way in.
//
// The numbers in these tests are the ones the middleware was tuned against: a
// real 4000x3000 camera frame goes to roughly 420 KB at 1920px/q78, which is
// about 8% of what arrived and visually indistinguishable on a phone.
//
// Two of these are privacy tests rather than performance tests. A photograph
// taken on a seller's driveway carries their GPS position in its EXIF, and a
// portrait photograph carries an orientation tag that has to be APPLIED before
// the resize or the picture is measured on its side.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

const sharp = require('sharp');
const { compressUploads, MAX_EDGE, LEAVE_ALONE_BYTES } = require('../src/middleware/image-compress');

let workspace;
test.before(async () => {
  workspace = await fsp.mkdtemp(path.join(os.tmpdir(), 'sawa-compress-'));
});
test.after(async () => {
  if (workspace) await fsp.rm(workspace, { recursive: true, force: true });
});

/** A noisy photograph-like image.
 *
 *  Flat colour, or any periodic pattern, compresses to almost nothing and would
 *  prove nothing about a real camera frame — the first version of this helper
 *  used `(i * K) % 256`, whose period is short enough that PNG squeezed a
 *  2600x1900 image down to 118 KB and the "heavy PNG" case never triggered.
 *  A 32-bit xorshift is deterministic (no seeding on the clock, so a failure is
 *  reproducible) and has no structure for either encoder to exploit. */
async function photograph(width, height) {
  const pixels = Buffer.alloc(width * height * 3);
  let state = 0x2545f491;
  for (let i = 0; i < pixels.length; i++) {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;  state >>>= 0;
    pixels[i] = state & 0xff;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } });
}

async function writeUpload(name, buffer) {
  const file = path.join(workspace, name);
  await fsp.writeFile(file, buffer);
  return {
    path: file,
    filename: name,
    size: buffer.length,
    mimetype: name.endsWith('.png') ? 'image/png' : 'image/jpeg',
  };
}

/** Run the middleware the way express would, and resolve when it calls next(). */
const run = (files) => new Promise((resolve, reject) => {
  compressUploads({ files }, {}, (err) => (err ? reject(err) : resolve()));
});

test('a large camera photograph is reduced by an order of magnitude', async () => {
  const original = await (await photograph(4000, 3000))
    .jpeg({ quality: 98, chromaSubsampling: '4:4:4' }).toBuffer();
  assert.ok(original.length > 3 * 1024 * 1024, `the fixture must be big: ${original.length}`);

  const file = await writeUpload('camera.jpg', original);
  await run([file]);

  const after = await fsp.stat(file.path);
  assert.ok(after.size < original.length / 4,
    `expected a large reduction, got ${original.length} -> ${after.size}`);
  assert.equal(file.size, after.size, 'the recorded size matches the file on disk');

  const meta = await sharp(file.path).metadata();
  assert.ok(Math.max(meta.width, meta.height) <= MAX_EDGE,
    `the long edge is capped at ${MAX_EDGE}, got ${meta.width}x${meta.height}`);
});

test('EXIF orientation is applied, not merely carried', async () => {
  // orientation 6 = "rotate 90° clockwise on display". A viewer that honours
  // the tag shows this 400x800 image as 800x400. After compression the pixels
  // themselves must be upright, because the tag is not kept.
  const original = await (await photograph(400, 800))
    .withMetadata({ orientation: 6 }).jpeg({ quality: 95 }).toBuffer();

  const file = await writeUpload('portrait.jpg', Buffer.concat([original]));
  // Force the work: this image is small, so make it heavy enough to qualify.
  if (file.size <= LEAVE_ALONE_BYTES) {
    const big = await (await photograph(2600, 3400))
      .withMetadata({ orientation: 6 }).jpeg({ quality: 98, chromaSubsampling: '4:4:4' }).toBuffer();
    await fsp.writeFile(file.path, big);
    file.size = big.length;
  }

  await run([file]);

  const meta = await sharp(file.path).metadata();
  assert.ok(meta.width > meta.height,
    `orientation 6 must produce a landscape result, got ${meta.width}x${meta.height}`);
  assert.ok(!meta.orientation || meta.orientation === 1,
    'the tag is gone, because the pixels no longer need it');
});

test('GPS coordinates do not survive an upload', async () => {
  const withGps = await (await photograph(3000, 2200))
    .withExif({
      IFD0: { Make: 'TestPhone', Model: 'X1' },
      GPS: { GPSLatitudeRef: 'S', GPSLongitudeRef: 'E' },
    })
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toBuffer();

  const file = await writeUpload('located.jpg', withGps);
  const before = await sharp(file.path).metadata();
  assert.ok(before.exif, 'the fixture really does carry EXIF');

  await run([file]);

  const after = await sharp(file.path).metadata();
  const exif = after.exif ? after.exif.toString('latin1') : '';
  assert.equal(exif.includes('GPS'), false,
    "a seller's photograph must not publish where they live");
});

test('an already-small photograph is left exactly as it arrived', async () => {
  const small = await (await photograph(900, 600)).jpeg({ quality: 70 }).toBuffer();
  assert.ok(small.length < LEAVE_ALONE_BYTES, 'the fixture is genuinely small');

  const file = await writeUpload('small.jpg', small);
  const before = await fsp.readFile(file.path);
  await run([file]);
  const after = await fsp.readFile(file.path);

  assert.deepEqual(after, before,
    're-encoding a small photo costs quality and saves nothing');
});

test('a heavy PNG becomes a JPEG, and the file is renamed to match', async () => {
  const png = await (await photograph(2600, 1900)).png().toBuffer();
  assert.ok(png.length > LEAVE_ALONE_BYTES, `the PNG fixture must be heavy: ${png.length}`);

  const file = await writeUpload('screenshot.png', png);
  await run([file]);

  assert.ok(file.filename.endsWith('.jpg'), `renamed to a jpg, got ${file.filename}`);
  assert.equal(file.mimetype, 'image/jpeg');
  assert.equal(path.basename(file.path), file.filename,
    'the path and the filename agree — publicUploadUrl builds the URL from the filename');
  assert.equal(fs.existsSync(file.path), true, 'the renamed file is on disk');
  assert.equal(fs.existsSync(path.join(workspace, 'screenshot.png')), false,
    'and the PNG it replaced is gone, not left behind to be backed up forever');

  const meta = await sharp(file.path).metadata();
  assert.equal(meta.format, 'jpeg');
});

test('a corrupt file fails the upload rather than the request', async () => {
  const file = await writeUpload('broken.jpg', Buffer.alloc(700 * 1024, 0x41));
  const before = await fsp.readFile(file.path);

  await run([file]);                       // resolves: next() was called with no error

  const after = await fsp.readFile(file.path);
  assert.deepEqual(after, before, 'what could not be compressed is stored as it came');
});

test('no files, or a request that never had any, passes straight through', async () => {
  await run([]);
  await new Promise((resolve, reject) =>
    compressUploads({}, {}, (err) => (err ? reject(err) : resolve())));
});
