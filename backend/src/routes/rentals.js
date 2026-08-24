const crypto = require('crypto');
const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requireUuid } = require('../middleware/validate');
const { withTransaction } = require('../lib/tx');
const { notifyUser } = require('../lib/notify');
const { recordAdminAction } = require('../lib/admin-audit');
const {
  MARKETPLACE_TERMS_VERSION,
  DIRECT_DEAL_NOTICE,
  contactAvailability,
  ensureMarketplaceAcknowledgement,
} = require('../lib/marketplace');

const router = express.Router();
const MAX_RENTAL_PHOTOS = 40;

function rentalGalleryError(images, required = false) {
  if (!Array.isArray(images)) return 'images must be an array';
  if (required && images.length < 1) return 'At least one vehicle image is required for an active rental listing';
  if (images.length > MAX_RENTAL_PHOTOS) return `A rental listing may contain at most ${MAX_RENTAL_PHOTOS} images`;
  if (images.some((url) => typeof url !== 'string' || !/^https:\/\//i.test(url.trim()))) {
    return 'Every rental image must be a valid HTTPS URL';
  }
  return null;
}

async function verifiedRentalProvider(db, providerId) {
  const provider = await db.query(
    `SELECT 1 FROM users WHERE id=$1 AND role='seller' AND id_verified='approved'
     AND business_verified=TRUE AND account_status='active' AND deleted_at IS NULL`,
    [providerId]
  );
  return provider.rowCount > 0;
}

const PROVIDER_COLUMNS = `
  u.name AS provider_name,
  u.business_name AS provider_business_name,
  u.role AS provider_role,
  u.seller_type AS provider_seller_type,
  u.id_verified AS provider_id_verified,
  u.business_verified AS provider_business_verified,
  u.phone AS provider_phone,
  u.whatsapp_phone AS provider_whatsapp,
  u.phone_visible AS provider_phone_visible,
  u.whatsapp_visible AS provider_whatsapp_visible,
  u.account_status AS provider_account_status,
  u.deleted_at AS provider_deleted_at`;

function publicRental(row, includeContact = false) {
  const available = contactAvailability({
    id_verified: row.provider_id_verified,
    role: row.provider_role,
    seller_type: row.provider_seller_type,
    business_verified: row.provider_business_verified,
    account_status: row.provider_account_status,
    deleted_at: row.provider_deleted_at,
    phone: row.provider_phone,
    whatsapp_phone: row.provider_whatsapp,
    phone_visible: row.provider_phone_visible,
    whatsapp_visible: row.provider_whatsapp_visible,
  });
  const result = {
    ...row,
    provider_contact_available: available,
    direct_deal_notice: DIRECT_DEAL_NOTICE,
    marketplace_terms_version: MARKETPLACE_TERMS_VERSION,
  };
  if (!includeContact) {
    result.provider_phone = null;
    result.provider_whatsapp = null;
  }
  delete result.provider_phone_visible;
  delete result.provider_whatsapp_visible;
  delete result.provider_account_status;
  delete result.provider_deleted_at;
  return result;
}

// Public rental catalogue. Rates are provider-supplied estimates; Sawa neither
// blocks dates nor confirms a booking.
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}
       FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       WHERE rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL
       ORDER BY rc.daily_rate ASC`
    );
    res.json(rows.map((row) => publicRental(row)));
  } catch (err) {
    log.error('rentals list error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/fleet', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}
       FROM rental_cars rc LEFT JOIN users u ON u.id = rc.provider_id
       ORDER BY rc.created_at DESC`
    );
    res.json(rows.map((row) => publicRental(row, true)));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/inquiries/my', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ri.*, rc.title AS car_title, rc.images AS car_images,
              rc.location AS car_location, u.name AS provider_name,
              u.business_name AS provider_business_name
       FROM rental_inquiries ri
       JOIN rental_cars rc ON rc.id = ri.rental_car_id
       LEFT JOIN users u ON u.id = ri.provider_id
       WHERE ri.renter_id = $1
       ORDER BY ri.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Provider accounts can see only their own leads; admins can see every lead.
router.get('/inquiries', requireAuth, async (req, res) => {
  const status = String(req.query.status || '');
  if (status && !['new', 'contacted', 'closed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid inquiry status' });
  }
  try {
    const params = [];
    const where = [];
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      where.push(`ri.provider_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`ri.status = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT ri.*, rc.title AS car_title,
              renter.name AS renter_name, renter.phone AS renter_phone,
              renter.whatsapp_phone AS renter_whatsapp,
              provider.name AS provider_name,
              provider.business_name AS provider_business_name
       FROM rental_inquiries ri
       JOIN rental_cars rc ON rc.id = ri.rental_car_id
       JOIN users renter ON renter.id = ri.renter_id
       LEFT JOIN users provider ON provider.id = ri.provider_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ri.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    log.error('rental inquiries error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/inquiries/:id/status', requireAuth, requireUuid('id'), async (req, res) => {
  const status = String(req.body.status || '');
  if (!['contacted', 'closed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be contacted, closed, or cancelled' });
  }
  try {
    const result = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM rental_inquiries WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const e = new Error('Inquiry not found'); e.status = 404; throw e; }
      const inquiry = current.rows[0];
      const isAdmin = req.user.role === 'admin';
      const isProvider = inquiry.provider_id === req.user.id;
      const isRenter = inquiry.renter_id === req.user.id;
      if (!isAdmin && !isProvider && !isRenter) { const e = new Error('Forbidden'); e.status = 403; throw e; }
      if (isRenter && !isAdmin && !isProvider && status !== 'cancelled') {
        const e = new Error('Renters may only cancel their own inquiry'); e.status = 403; throw e;
      }
      if (['closed', 'cancelled'].includes(inquiry.status)) {
        const e = new Error('This inquiry is already closed'); e.status = 409; throw e;
      }
      const { rows } = await client.query(
        `UPDATE rental_inquiries SET status=$1, updated_at=NOW(),
           closed_at=CASE WHEN $1 IN ('closed','cancelled') THEN NOW() ELSE NULL END
         WHERE id=$2 RETURNING *`,
        [status, req.params.id]
      );
      if (isAdmin) {
        await recordAdminAction(client, {
          actorId: req.user.id, action: 'rental_inquiry.status_changed',
          targetType: 'rental_inquiry', targetId: inquiry.id,
          summary: `${inquiry.inquiry_ref} moved to ${status}`,
          metadata: { previous_status: inquiry.status, status },
        });
      }
      return rows[0];
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental inquiry status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Old clients must not silently create the transaction-style booking that was
// removed. A 410 produces a clear upgrade path without accepting a deal.
router.post('/:id/book', requireAuth, requireUuid('id'), (_req, res) => {
  res.status(410).json({
    error: 'Rental checkout has been replaced by direct provider inquiries. Update the app and use Request availability.',
    code: 'RENTAL_BOOKING_RETIRED',
  });
});

router.post('/:id/inquire', requireAuth, requireUuid('id'), async (req, res) => {
  const startDate = req.body.start_date ? String(req.body.start_date) : null;
  const days = req.body.days == null || req.body.days === '' ? null : Number(req.body.days);
  const preferredChannel = String(req.body.preferred_channel || 'in_app');
  const message = String(req.body.message || '').trim().slice(0, 1500) || null;
  const pickupLocation = String(req.body.pickup_location || '').trim().slice(0, 200) || null;
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return res.status(400).json({ error: 'start_date is required in YYYY-MM-DD format' });
  const parsedStart = new Date(`${startDate}T00:00:00.000Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (Number.isNaN(parsedStart.getTime()) || parsedStart.toISOString().slice(0, 10) !== startDate || startDate < today) {
    return res.status(400).json({ error: 'start_date must be a valid date that is today or later' });
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) return res.status(400).json({ error: 'days is required and must be between 1 and 365' });
  if (!['in_app', 'phone', 'whatsapp'].includes(preferredChannel)) return res.status(400).json({ error: 'Invalid preferred channel' });
  try {
    const inquiry = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT rc.*, ${PROVIDER_COLUMNS},
                buyer.marketplace_terms_accepted_at,
                buyer.marketplace_terms_version
         FROM rental_cars rc
         JOIN users u ON u.id = rc.provider_id
         JOIN users buyer ON buyer.id = $2
         WHERE rc.id = $1 AND rc.status = 'active'
           AND u.role = 'seller' AND u.id_verified = 'approved'
           AND u.business_verified = TRUE AND u.account_status = 'active'
           AND u.deleted_at IS NULL
         FOR UPDATE OF rc`,
        [req.params.id, req.user.id]
      );
      if (!rows.length) { const e = new Error('Active rental car not found'); e.status = 404; throw e; }
      const car = rows[0];
      if (car.provider_id === req.user.id) { const e = new Error('You cannot inquire about your own rental car'); e.status = 400; throw e; }
      await ensureMarketplaceAcknowledgement(client, {
        id: req.user.id,
        marketplace_terms_accepted_at: car.marketplace_terms_accepted_at,
        marketplace_terms_version: car.marketplace_terms_version,
      }, req.body.acknowledge === true);

      const available = contactAvailability({
        id_verified: car.provider_id_verified,
        role: car.provider_role,
        seller_type: car.provider_seller_type,
        business_verified: car.provider_business_verified,
        account_status: car.provider_account_status,
        deleted_at: car.provider_deleted_at,
        phone: car.provider_phone,
        whatsapp_phone: car.provider_whatsapp,
        phone_visible: car.provider_phone_visible,
        whatsapp_visible: car.provider_whatsapp_visible,
      });
      if (preferredChannel !== 'in_app' && !available[preferredChannel]) {
        const e = new Error(`The provider has not made ${preferredChannel === 'whatsapp' ? 'WhatsApp' : 'phone'} contact available. Send an in-app inquiry instead.`);
        e.status = 409; e.code = 'CONTACT_NOT_AVAILABLE'; e.available = available; throw e;
      }

      const ref = 'RI-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const inserted = await client.query(
        `INSERT INTO rental_inquiries
           (inquiry_ref, rental_car_id, renter_id, provider_id, start_date, days,
            pickup_location, message, preferred_channel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [ref, car.id, req.user.id, car.provider_id, startDate, days, pickupLocation, message, preferredChannel]
      );
      if (car.provider_id) {
        await notifyUser(client, {
          user_id: car.provider_id,
          type: 'listing_update',
          title: 'New rental inquiry',
          body: `${car.title} has a new availability request (${ref}). Contact the renter directly to confirm terms.`,
          meta: JSON.stringify({ inquiryId: inserted.rows[0].id, rentalCarId: car.id }),
        });
      }
      return {
        ...inserted.rows[0],
        provider_name: car.provider_name,
        provider_business_name: car.provider_business_name,
        provider_contact_available: available,
        contact: preferredChannel === 'phone' ? car.provider_phone
          : preferredChannel === 'whatsapp' ? car.provider_whatsapp : null,
      };
    });
    res.status(201).json({
      ...inquiry,
      notice: DIRECT_DEAL_NOTICE,
      message: 'Inquiry sent. The rental provider—not Sawa—will confirm availability, price and terms.',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({
      error: err.message, code: err.code, available: err.available, notice: err.notice,
    });
    log.error('rental inquiry create error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rentals/:id — public detail after fixed route names above.
router.get('/:id', requireUuid('id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rc.*, ${PROVIDER_COLUMNS}
       FROM rental_cars rc JOIN users u ON u.id = rc.provider_id
       WHERE rc.id = $1 AND rc.status = 'active' AND u.role = 'seller'
         AND u.id_verified = 'approved' AND u.business_verified = TRUE
         AND u.account_status = 'active' AND u.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Rental car not found' });
    res.json(publicRental(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin rental-company inventory CRUD ─────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { provider_id, title, make, model, year, category, seats, fuel,
          transmission, mileage, daily_rate, weekly_rate, deposit, min_days,
          inspection_score, location, images } = req.body;
  if (!provider_id || !title || !daily_rate) return res.status(400).json({ error: 'provider_id, title and daily_rate are required' });
  if (!Number.isFinite(Number(daily_rate)) || Number(daily_rate) <= 0) return res.status(400).json({ error: 'daily_rate must be a positive number' });
  const galleryError = rentalGalleryError(images, true);
  if (galleryError) return res.status(400).json({ error: galleryError });
  try {
    const created = await withTransaction(async (client) => {
      if (!await verifiedRentalProvider(client, provider_id)) {
        const error = new Error('Provider must be an active, identity- and business-verified seller');
        error.status = 400;
        throw error;
      }
      const { rows } = await client.query(
        `INSERT INTO rental_cars
           (provider_id,title,make,model,year,category,seats,fuel,transmission,mileage,
            daily_rate,weekly_rate,deposit,min_days,inspection_score,location,images)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [provider_id, String(title).trim(), make, model, year, category, seats || 5, fuel,
         transmission, mileage, daily_rate, weekly_rate || Number(daily_rate) * 6,
         deposit || 0, min_days || 1, inspection_score, location, images.map((url) => url.trim())]
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.created', targetType: 'rental_car', targetId: rows[0].id,
        summary: `${rows[0].title} added for a verified rental provider`, metadata: { provider_id, daily_rate: rows[0].daily_rate },
      });
      return rows[0];
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental create error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const EDITABLE = ['provider_id', 'title', 'make', 'model', 'year', 'category',
    'seats', 'fuel', 'transmission', 'mileage', 'daily_rate', 'weekly_rate',
    'deposit', 'min_days', 'inspection_score', 'location', 'images', 'status'];
  const fields = EDITABLE.filter((field) => req.body[field] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No editable fields provided' });
  if (req.body.status && !['active', 'maintenance', 'retired'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  if (req.body.title !== undefined && !String(req.body.title).trim()) return res.status(400).json({ error: 'title cannot be empty' });
  for (const field of ['daily_rate', 'weekly_rate', 'deposit', 'min_days']) {
    if (req.body[field] !== undefined && (!Number.isFinite(Number(req.body[field])) || Number(req.body[field]) < (field === 'min_days' || field === 'daily_rate' ? 1 : 0))) {
      return res.status(400).json({ error: `${field} has an invalid value` });
    }
  }
  if (req.body.images !== undefined) {
    const galleryError = rentalGalleryError(req.body.images, false);
    if (galleryError) return res.status(400).json({ error: galleryError });
  }
  try {
    const updated = await withTransaction(async (client) => {
      const current = await client.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!current.rowCount) { const error = new Error('Rental car not found'); error.status = 404; throw error; }
      const before = current.rows[0];
      const providerId = req.body.provider_id !== undefined ? req.body.provider_id : before.provider_id;
      const status = req.body.status !== undefined ? req.body.status : before.status;
      const images = req.body.images !== undefined ? req.body.images : (before.images || []);
      if (status === 'active') {
        if (!await verifiedRentalProvider(client, providerId)) {
          const error = new Error('An active rental listing requires an active, identity- and business-verified provider');
          error.status = 409;
          throw error;
        }
        const galleryError = rentalGalleryError(images, true);
        if (galleryError) { const error = new Error(galleryError); error.status = 409; throw error; }
      }
      const normalized = { ...req.body };
      if (normalized.title !== undefined) normalized.title = String(normalized.title).trim();
      if (normalized.images !== undefined) normalized.images = normalized.images.map((url) => url.trim());
      const params = fields.map((field) => normalized[field]);
      const assignments = fields.map((field, index) => `${field}=$${index + 1}`);
      if (req.body.status === 'retired') assignments.push('retired_at=NOW()');
      if (req.body.status && req.body.status !== 'retired') assignments.push('retired_at=NULL', 'retirement_reason=NULL');
      params.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE rental_cars SET ${assignments.join(', ')} WHERE id=$${params.length} RETURNING *`, params
      );
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.updated', targetType: 'rental_car', targetId: rows[0].id,
        summary: `${rows[0].title} rental listing updated`, metadata: { changed_fields: fields },
      });
      return rows[0];
    });
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    log.error('rental update error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, requireUuid('id'), async (req, res) => {
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (!reason) return res.status(400).json({ error: 'A retirement reason is required' });
  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE rental_cars SET status='retired', retired_at=NOW(), retirement_reason=$1
         WHERE id=$2 RETURNING *`, [reason, req.params.id]
      );
      if (!rows.length) { const e = new Error('Rental car not found'); e.status = 404; throw e; }
      await recordAdminAction(client, {
        actorId: req.user.id, action: 'rental_car.retired', targetType: 'rental_car', targetId: req.params.id,
        summary: `${rows[0].title} retired`, metadata: { reason },
      });
      return rows[0];
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
