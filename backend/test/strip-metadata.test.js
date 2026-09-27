// ─────────────────────────────────────────────────────────────────────────────
// B4: uploaded photos lose their metadata (GPS, device, timestamps) but not a
// single pixel. No database needed — this exercises the file transform only.
//
// Each format is checked two ways: sharp can no longer find EXIF, and the
// decoded pixels are identical to the original's, which is the promise that
// lets identity documents skip re-encoding.
// ─────────────────────────────────────────────────────────────────────────────
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { stripFile, stripPng } = require('../src/middleware/strip-metadata');

const EXIF = { IFD0: { Make: 'TestPhone', Model: 'Model X', ImageDescription: 'taken at home' } };

async function base(width = 64, height = 48) {
  // Noise, not a flat colour, so a re-encode would actually change pixels.
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 1) raw[i] = (i * 37 + (i >> 5) * 11) % 256;
  return sharp(raw, { raw: { width, height, channels: 3 } });
}

function tmpFile(name, buf) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'strip-')), name);
  fs.writeFileSync(file, buf);
  return file;
}

async function pixels(buf) {
  return sharp(buf).raw().toBuffer();
}

test('JPEG: EXIF is removed and the image data is byte-identical', async () => {
  const withExif = await (await base()).jpeg({ quality: 90 }).withExif(EXIF).toBuffer();
  assert.ok((await sharp(withExif).metadata()).exif, 'fixture must carry EXIF');

  const file = tmpFile('id.jpg', withExif);
  assert.equal(await stripFile(file), 'stripped');
  const after = fs.readFileSync(file);

  assert.equal((await sharp(after).metadata()).exif, undefined);
  assert.ok(!after.includes(Buffer.from('taken at home')), 'no trace of the EXIF text may remain');
  assert.deepEqual(await pixels(after), await pixels(withExif), 'pixels must not change');
  assert.ok(after.length < withExif.length);
});

test('JPEG: an ICC colour profile is kept', async () => {
  const withIcc = await (await base()).jpeg().withIccProfile('srgb').withExif(EXIF).toBuffer();
  assert.ok((await sharp(withIcc).metadata()).icc, 'fixture must carry an ICC profile');

  const file = tmpFile('icc.jpg', withIcc);
  await stripFile(file);
  const meta = await sharp(fs.readFileSync(file)).metadata();
  assert.ok(meta.icc, 'the ICC profile changes how colours decode and must survive');
  assert.equal(meta.exif, undefined);
});

test('JPEG: a rotated photo is turned upright and loses the tag', async () => {
  // Stored 64x48 with orientation 6 = displayed as 48x64.
  const sideways = await (await base(64, 48)).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const file = tmpFile('rotated.jpg', sideways);

  assert.equal(await stripFile(file), 'rotated');
  const meta = await sharp(fs.readFileSync(file)).metadata();
  assert.equal(meta.width, 48);
  assert.equal(meta.height, 64);
  assert.ok(!meta.orientation || meta.orientation === 1);
  assert.equal(meta.exif, undefined);
});

test('WebP: EXIF is removed, the VP8X flag is cleared, and pixels are identical', async () => {
  const withExif = await (await base()).webp({ lossless: true }).withExif(EXIF).toBuffer();
  assert.ok((await sharp(withExif).metadata()).exif, 'fixture must carry EXIF');

  const file = tmpFile('photo.webp', withExif);
  assert.equal(await stripFile(file), 'stripped');
  const after = fs.readFileSync(file);

  assert.equal((await sharp(after).metadata()).exif, undefined);
  assert.equal(after.readUInt32LE(4), after.length - 8, 'RIFF size must match the new length');
  assert.deepEqual(await pixels(after), await pixels(withExif));
});

// sharp doesn't write PNG text chunks, so the fixture inserts one by hand.
function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

test('PNG: text and time chunks are removed and pixels are identical', async () => {
  const plain = await (await base()).png().toBuffer();
  const ihdrEnd = 8 + 12 + plain.readUInt32BE(8);
  const withText = Buffer.concat([
    plain.subarray(0, ihdrEnd),
    pngChunk('tEXt', Buffer.from('Location\0-1.9441,30.0619', 'latin1')),
    pngChunk('tIME', Buffer.from([0x07, 0xea, 9, 27, 12, 0, 0])),
    plain.subarray(ihdrEnd),
  ]);

  const file = tmpFile('scan.png', withText);
  assert.equal(await stripFile(file), 'stripped');
  const after = fs.readFileSync(file);

  assert.ok(!after.includes(Buffer.from('Location')), 'text chunk must be gone');
  assert.ok(!after.includes(Buffer.from('tIME', 'latin1')));
  assert.deepEqual(after, plain, 'removing the added chunks gives back the original file exactly');
});

test('a file with nothing to remove is left untouched', async () => {
  const plain = await (await base()).png().toBuffer();
  const file = tmpFile('plain.png', plain);
  assert.equal(await stripFile(file), 'unchanged');
  assert.deepEqual(fs.readFileSync(file), plain);
});

test('files it does not understand are left alone rather than corrupted', async () => {
  const garbage = Buffer.from('not an image at all, just some bytes');
  const file = tmpFile('note.jpg', garbage);
  assert.equal(await stripFile(file), 'unchanged');
  assert.deepEqual(fs.readFileSync(file), garbage);

  // A PNG cut off mid-chunk is refused by the walker, not truncated further.
  const plain = await (await base()).png().toBuffer();
  assert.equal(stripPng(plain.subarray(0, 40)), null);
});
