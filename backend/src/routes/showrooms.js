const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { sellerDisplayName } = require('../lib/seller-display');
const { validInspectionExists } = require('./cars');

// ─────────────────────────────────────────────────────────────────────────────
// GET /showrooms — the verified showrooms that have something to show.
//
// A showroom is a business, not a brand: one showroom sells Toyota, Hyundai
// and Mercedes side by side. So its brands are never chosen or stored; they
// are read off the cars it has live right now, with a count each, and they
// change the moment its stock does.
//
// Only cars that are public count — the same five seller conditions and the
// same inspection evidence GET /cars applies (invariants 1 and 4) — so a
// showroom with nothing public does not appear, and a count here always
// matches what a buyer finds on its page. Allow-list only: no contact fields.
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `WITH live AS (
         SELECT c.seller_id, c.make, c.images, c.listed_at, c.location
           FROM cars c
           JOIN users u ON u.id = c.seller_id
          WHERE c.status = 'live'
            AND u.role = 'seller'
            AND u.id_verified = 'approved'
            AND u.account_status = 'active'
            AND u.deleted_at IS NULL AND u.is_test = FALSE
            AND u.seller_type = 'showroom'
            AND u.business_verified = TRUE
            AND ${validInspectionExists('c')}
       )
       SELECT u.id,
              ${sellerDisplayName('u')} AS name,
              u.avatar_url,
              u.created_at AS member_since,
              u.sawa_affiliated,
              -- Already public on the storefront (GET /sellers/:id); here so a
              -- card can say "Open · Closes at 21:00" without a second request.
              u.business_hours AS hours,
              -- Whether cover_image is the showroom itself or only its newest car.
              (u.business_cover_url IS NOT NULL) AS cover_is_showroom,
              (SELECT COUNT(*)::int FROM live l WHERE l.seller_id = u.id) AS live_count,
              -- The showroom's own photo when the team set one, else its newest car.
              COALESCE(u.business_cover_url,
                (SELECT l.images[1] FROM live l
                  WHERE l.seller_id = u.id AND cardinality(l.images) > 0
                  ORDER BY l.listed_at DESC NULLS LAST LIMIT 1)) AS cover_image,
              (SELECT l.location FROM live l
                WHERE l.seller_id = u.id AND NULLIF(BTRIM(l.location), '') IS NOT NULL
                GROUP BY l.location ORDER BY COUNT(*) DESC, l.location LIMIT 1) AS location,
              COALESCE((SELECT json_agg(json_build_object('make', b.make, 'count', b.n) ORDER BY b.n DESC, b.make)
                          FROM (SELECT MIN(BTRIM(l.make)) AS make, COUNT(*)::int AS n FROM live l
                                 WHERE l.seller_id = u.id GROUP BY lower(BTRIM(l.make))) b), '[]') AS brands
         FROM users u
        WHERE u.id IN (SELECT seller_id FROM live)
        ORDER BY live_count DESC, name ASC
        LIMIT 50`
    );
    res.set('Cache-Control', 'public, max-age=300');
    res.json(rows.map((row) => ({ ...row, business_verified: true })));
  } catch (err) {
    log.error('showrooms list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
