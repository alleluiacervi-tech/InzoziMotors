const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireUuid } = require('../middleware/validate');

// ─────────────────────────────────────────────────────────────────────────────
// Public seller and showroom profiles (G9 in docs/WEB-PARITY-PLAN.md).
//
// A profile is public for exactly the sellers whose listings are public: the
// same five conditions GET /cars joins on (invariant 4 in CLAUDE.md). A
// suspended, deleted, closed, unverified or unverified-showroom account
// answers 404, the same as a listing that isn't public — never 403, which
// would confirm the account exists.
//
// Allow-list only. No phone, WhatsApp, email or ID fields ever leave here:
// contact disclosure stays behind POST /cars/:id/contact and its three gates
// (invariant 3).
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

// GET /sellers/:id
router.get('/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.created_at,
              COALESCE(u.seller_type, 'individual') AS seller_type,
              u.business_name, u.business_verified,
              u.completed_sales, u.response_rate
         FROM users u
        WHERE u.id = $1
          AND u.role = 'seller'
          AND u.id_verified = 'approved'
          AND u.account_status = 'active'
          AND u.deleted_at IS NULL
          AND (COALESCE(u.seller_type, 'individual') <> 'showroom' OR u.business_verified = TRUE)`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Seller not found' });
    const seller = rows[0];
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      id: seller.id,
      name: seller.name,
      avatar_url: seller.avatar_url,
      member_since: seller.created_at,
      seller_type: seller.seller_type,
      is_showroom: seller.seller_type === 'showroom',
      business_name: seller.business_name,
      // Only an approved account reaches this line, so this is always true;
      // it is sent so clients render the badge from data, not assumption.
      id_verified: true,
      business_verified: seller.business_verified === true,
      completed_sales: seller.completed_sales ?? 0,
      response_rate: seller.response_rate ?? 0,
    });
  } catch (err) {
    log.error('seller profile error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
