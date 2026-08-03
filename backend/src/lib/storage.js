const fs = require('fs');
const path = require('path');
const { log } = require('./log');

// ─────────────────────────────────────────────────────────────────────────────
// Where uploaded files live.
//
// Today: a directory inside the API container, on a Docker named volume. That
// makes the API stateful — it pins the service to one machine forever, it is
// not covered by anything that backs up the database, and it blocks the
// "N api containers" scaling path the deployment plan describes. For a business
// whose most expensive asset is 36 professional photographs per car plus
// identity documents that cannot be re-shot, that is the wrong place for it.
//
// Moving to object storage is a real migration (upload path, URL generation,
// existing files, CDN). What this file does is make that migration a change in
// ONE place instead of six routes: everything goes through a driver interface,
// and the local driver is the current behaviour, unchanged.
//
// Adding S3/R2 later means implementing the same four methods and setting
// STORAGE_DRIVER — no route changes, no URL-building changes.
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

/**
 * The driver contract:
 *   save(buffer|path, key)  -> persists, returns the stored key
 *   remove(key)             -> deletes, never throws for a missing file
 *   url(key, opts)          -> public (or signed) URL
 *   exists(key)             -> boolean
 *
 * `key` is always a POSIX-style relative path such as "cars/<id>/front.jpg".
 * Never an absolute path, and never OS-specific — that is what lets the same
 * key mean the same object on disk and in a bucket.
 */

const localDriver = {
  name: 'local',

  resolve(key) {
    // Every path component is confined under UPLOAD_DIR. A key containing ".."
    // must not be able to write outside it, whatever produced the key.
    const safe = path
      .normalize(key)
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .split(/[\\/]/)
      .filter((part) => part && part !== '.' && part !== '..')
      .join(path.sep);
    return path.join(UPLOAD_DIR, safe);
  },

  async save(source, key) {
    const dest = this.resolve(key);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    if (Buffer.isBuffer(source)) await fs.promises.writeFile(dest, source);
    else await fs.promises.rename(source, dest);
    return key;
  },

  async remove(key) {
    try {
      await fs.promises.unlink(this.resolve(key));
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false; // already gone is success
      log.warn('storage: could not remove file', { key, error: err.message });
      return false;
    }
  },

  url(key, { baseUrl = '' } = {}) {
    return `${baseUrl}/uploads/${key.split(path.sep).join('/')}`;
  },

  async exists(key) {
    try {
      await fs.promises.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  },
};

// When an S3/R2 driver lands it registers here and STORAGE_DRIVER selects it.
// Keeping the map explicit means an unknown value fails loudly at boot rather
// than silently falling back to writing files on a machine nobody backs up.
const DRIVERS = { local: localDriver };

const configured = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const driver = DRIVERS[configured];

if (!driver) {
  throw new Error(
    `Unknown STORAGE_DRIVER "${configured}". Available: ${Object.keys(DRIVERS).join(', ')}`
  );
}

if (configured === 'local' && process.env.NODE_ENV === 'production') {
  log.warn(
    'uploads are stored on the container filesystem — they are not covered by the database backup, and pin the API to a single host. ops/backup.sh archives the volume; object storage is the durable answer.'
  );
}

module.exports = { storage: driver, UPLOAD_DIR };
