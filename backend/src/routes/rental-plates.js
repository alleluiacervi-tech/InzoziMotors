const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../db');
const { log } = require('../lib/log');
const { requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { withTransaction } = require('../lib/tx');
const { recordAdminAction } = require('../lib/admin-audit');
const { publicApiOrigin } = require('../lib/public-origin');
const { readQuad, maskPlate } = require('../lib/plate-badge');
const {
  UPLOAD_ROOT, localPathForUrl, uploadRelative, removeLocalUpload,
} = require('../lib/upload-paths');

// ─────────────────────────────────────────────────────────────────────────────
// Hiding the registration plate on a rental car's photos, for the team.
//
// The same rules as sale-car photos (routes/inspections.js, "Hiding the
// registration plate"): masking is destructive on purpose. The published file
// is re-encoded with the Sawa Cars badge burned in, the untouched original is
// kept under /uploads/plate-originals/rentals/<car>/ (denied by server.js), and
// the old public file is deleted. A display-time overlay would leave the plate
// one dev-tools click away.
//
// Rental photos are plain URLs in rental_cars.images, so a photo is addressed by
// its current URL, and rental_photo_plates (migration 0067) remembers the
// original and the badge position for each masked one.
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

class PlateError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

/** The car's gallery and the masks that still apply to it. */
async function plateState(db, carId) {
  const car = await db.query('SELECT images FROM rental_cars WHERE id = $1', [carId]);
  if (!car.rowCount) return null;
  const images = car.rows[0].images || [];
  const { rows } = await db.query(
    'SELECT url, plate_mask FROM rental_photo_plates WHERE rental_car_id = $1 AND url = ANY($2::text[])',
    [carId, images]
  );
  return { images, plates: rows };
}

/** Index of `url` in the gallery, or a 404. */
function indexOf(images, url) {
  const i = images.indexOf(url);
  if (i === -1) throw new PlateError(404, 'That photo is not on this car any more. Refresh and try again.', 'PLATE_PHOTO_GONE');
  return i;
}

function localSource(url) {
  const filePath = localPathForUrl(url);
  // Two failures, told apart because one is worth retrying and one never is.
  if (!filePath) {
    throw new PlateError(409,
      'This photo is stored outside this server (external media storage), so its plate cannot be covered here.',
      'PLATE_SOURCE_REMOTE');
  }
  if (!fs.existsSync(filePath)) {
    throw new PlateError(409,
      'The original photo file is missing from this server. Remove this photo and upload it again.',
      'PLATE_SOURCE_MISSING');
  }
  return filePath;
}

/** Publish `buffer` as a new public file for the car. New name every time:
 *  caches and CDN edges keep serving whatever was at an old address. */
async function publish(req, carId, prefix, buffer, ext) {
  const dir = path.join(UPLOAD_ROOT, 'rental-cars', carId);
  await fsp.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${prefix}-${crypto.randomUUID()}${ext}`);
  await fsp.writeFile(file, buffer);
  return `${publicApiOrigin(req)}/uploads/${uploadRelative(file)}`;
}

/** Swap one gallery entry, only if it is still what we read (a concurrent edit
 *  wins rather than being overwritten). */
async function replaceImage(client, carId, index, fromUrl, toUrl) {
  const res = await client.query(
    `UPDATE rental_cars SET images[$2] = $4
      WHERE id = $1 AND images[$2] = $3`,
    [carId, index + 1, fromUrl, toUrl]
  );
  if (!res.rowCount) {
    throw new PlateError(409, 'The photos changed while you were working. Refresh and try again.', 'PLATE_GALLERY_CHANGED');
  }
}

function fail(res, err, what) {
  if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
  log.error(`rental plate ${what} failed`, { error: err.message });
  return res.status(500).json({ error: 'Could not update the photo' });
}

// GET /rentals/:id/photo-plates — the gallery and which photos carry a cover.
router.get('/:id/photo-plates', requireAdmin, requireUuid('id'), async (req, res) => {
  try {
    const state = await plateState(pool, req.params.id);
    if (!state) return res.status(404).json({ error: 'Rental car not found' });
    res.json(state);
  } catch (err) {
    fail(res, err, 'read');
  }
});

// GET /rentals/:id/photo-plates/original?url=<published url>
// The unmasked photograph, for the editor only: placing a badge on a file that
// already has one burned in means aiming at a plate you cannot see. A photo
// never masked IS its own original, so that case redirects to it.
router.get('/:id/photo-plates/original', requireAdmin, requireUuid('id'), async (req, res) => {
  const url = String(req.query.url || '');
  try {
    const state = await plateState(pool, req.params.id);
    if (!state) return res.status(404).json({ error: 'Rental car not found' });
    indexOf(state.images, url);
    const { rows } = await pool.query(
      'SELECT original_url FROM rental_photo_plates WHERE rental_car_id = $1 AND url = $2',
      [req.params.id, url]
    );
    if (!rows.length) return res.redirect(302, url);
    const filePath = localSource(rows[0].original_url);
    res.type(path.extname(filePath) || '.jpg');
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    fail(res, err, 'original');
  }
});

// PATCH /rentals/:id/photo-plates
// { url, quad: [{x,y} x 4] } covers the plate (or moves an existing cover);
// { url, plate_state: 'none' } removes a cover and republishes the original.
router.patch('/:id/photo-plates', requireAdmin, requireUuid('id'), async (req, res) => {
  const carId = req.params.id;
  const url = String((req.body && req.body.url) || '');
  const removing = req.body && req.body.plate_state === 'none';
  const quad = removing ? null : readQuad(req.body && req.body.quad);
  if (!removing && quad.error) return res.status(400).json({ error: quad.error, code: 'PLATE_QUAD_INVALID' });

  try {
    const state = await plateState(pool, carId);
    if (!state) return res.status(404).json({ error: 'Rental car not found' });
    const index = indexOf(state.images, url);
    const { rows: [existing] } = await pool.query(
      'SELECT id, original_url FROM rental_photo_plates WHERE rental_car_id = $1 AND url = $2',
      [carId, url]
    );

    if (removing) {
      if (!existing) return res.json(state); // nothing covered, nothing to undo
      const originalPath = localSource(existing.original_url);
      const restoredUrl = await publish(req, carId, 'restored', await fsp.readFile(originalPath),
        path.extname(originalPath) || '.jpg');
      const next = await withTransaction(async (client) => {
        await replaceImage(client, carId, index, url, restoredUrl);
        await client.query('DELETE FROM rental_photo_plates WHERE id = $1', [existing.id]);
        await recordAdminAction(client, {
          actorId: req.user.id, action: 'rental_car.photo_plate_cover_removed',
          targetType: 'rental_car', targetId: carId,
          summary: 'Removed a plate cover and restored the original rental photo',
        });
        return plateState(client, carId);
      }).catch((err) => { removeLocalUpload(restoredUrl); throw err; });
      // After the commit, so a rollback never deletes a file the car points at.
      removeLocalUpload(url);
      fs.unlink(originalPath, () => {});
      return res.json(next);
    }

    // Always cut from the ORIGINAL: re-masking a masked file would stack badges.
    const sourcePath = localSource(existing ? existing.original_url : url);
    const masked = await maskPlate(await fsp.readFile(sourcePath), quad);

    // Keep the original once, on the denied path, before anything public changes.
    let originalUrl = existing && existing.original_url;
    if (!originalUrl) {
      const dir = path.join(UPLOAD_ROOT, 'plate-originals', 'rentals', carId);
      await fsp.mkdir(dir, { recursive: true });
      const kept = path.join(dir, `${crypto.randomUUID()}${path.extname(sourcePath) || '.jpg'}`);
      await fsp.copyFile(sourcePath, kept);
      originalUrl = `${publicApiOrigin(req)}/uploads/${uploadRelative(kept)}`;
    }
    const maskedUrl = await publish(req, carId, 'masked', masked, '.jpg');
    const plateMask = JSON.stringify({ points: quad.points, bounds: quad.bounds });

    const next = await withTransaction(async (client) => {
      await replaceImage(client, carId, index, url, maskedUrl);
      if (existing) {
        await client.query(
          `UPDATE rental_photo_plates SET url = $2, plate_mask = $3::jsonb, masked_by = $4, updated_at = NOW()
            WHERE id = $1`,
          [existing.id, maskedUrl, plateMask, req.user.id]
        );
      } else {
        await client.query(
          `INSERT INTO rental_photo_plates (rental_car_id, url, original_url, plate_mask, masked_by)
           VALUES ($1, $2, $3, $4::jsonb, $5)`,
          [carId, maskedUrl, originalUrl, plateMask, req.user.id]
        );
      }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.photo_plate_masked',
        targetType: 'rental_car', targetId: carId,
        summary: existing ? 'Moved the plate cover on a rental photo' : 'Covered the registration plate on a rental photo',
        metadata: { bounds: quad.bounds },
      });
      return plateState(client, carId);
    }).catch((err) => {
      // Nothing points at the new file, and a first-time original copy is not
      // recorded anywhere either: remove both rather than leave orphans.
      removeLocalUpload(maskedUrl);
      if (!existing) removeLocalUpload(originalUrl);
      throw err;
    });
    // The superseded public file: the unmasked original (now kept privately) or
    // an earlier masked copy. Deleted so the plate is not left at its old address.
    removeLocalUpload(url);
    res.json(next);
  } catch (err) {
    fail(res, err, 'mask');
  }
});

module.exports = router;
