const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireUuid } = require('../middleware/validate');
const { sellerDisplayName } = require('../lib/seller-display');
const { sellerReplyTime } = require('../lib/showroom-profile');

// ─────────────────────────────────────────────────────────────────────────────
// Public seller and showroom profiles (G9 in docs/WEB-PARITY-PLAN.md).
//
// A profile is public for exactly the sellers whose listings are public: the
// same conditions GET /cars joins on (invariant 4 in CLAUDE.md), plus not a
// test account (migration 0066). A suspended, deleted, closed, unverified,
// unverified-showroom or test account answers 404, the same as a listing that
// isn't public — never 403, which would confirm the account exists.
//
// Allow-list only. No phone, WhatsApp, email or ID fields ever leave here:
// contact disclosure stays behind POST /cars/:id/contact and its three gates
// (invariant 3). A showroom is named by its business name only; the person
// who holds the account is not part of its public profile.
//
// Only facts that are true are sent. "Completed sales", reviews and the trust
// score came from the retired deal flow and could never move, and the cached
// response rate was never recalculated when people replied; they are no longer
// part of this answer. `reply_time` is measured from real conversations
// (lib/showroom-profile.js) and is null until there is enough to measure.
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

// GET /sellers/:id
router.get('/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, ${sellerDisplayName('u')} AS display_name, u.avatar_url, u.created_at,
              COALESCE(u.seller_type, 'individual') AS seller_type,
              u.business_name, u.business_verified,
              u.business_about, u.business_address, u.business_hours, u.business_cover_url,
              u.sawa_affiliated
         FROM users u
        WHERE u.id = $1
          AND u.role = 'seller'
          AND u.id_verified = 'approved'
          AND u.account_status = 'active'
          AND u.deleted_at IS NULL
          AND u.is_test = FALSE
          AND (COALESCE(u.seller_type, 'individual') <> 'showroom' OR u.business_verified = TRUE)`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Seller not found' });
    const seller = rows[0];
    const isShowroom = seller.seller_type === 'showroom';
    const replyTime = await sellerReplyTime(pool, seller.id);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      id: seller.id,
      name: seller.display_name,
      avatar_url: seller.avatar_url,
      member_since: seller.created_at,
      seller_type: seller.seller_type,
      is_showroom: isShowroom,
      business_name: isShowroom ? seller.business_name : null,
      // Only an approved account reaches this line, so this is always true;
      // it is sent so clients render the badge from data, not assumption.
      id_verified: true,
      business_verified: seller.business_verified === true,
      // Owned by the company that runs Sawa Cars: disclosed on its storefront.
      sawa_affiliated: isShowroom && seller.sawa_affiliated === true,
      reply_time: replyTime,
      // A showroom's storefront details, written by the team. Never contact
      // details. Null for an individual seller.
      about: isShowroom ? seller.business_about : null,
      address: isShowroom ? seller.business_address : null,
      hours: isShowroom ? seller.business_hours : null,
      cover_url: isShowroom ? seller.business_cover_url : null,
    });
  } catch (err) {
    log.error('seller profile error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
