const express = require('express');
const { log } = require('../lib/log');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { withTransaction } = require('../lib/tx');
const { notifyUser } = require('../lib/notify');
const { sendRentalPaymentReceipt } = require('../lib/mailer');
const { paymentsEnabled, getTransactionStatus } = require('../lib/pesapal');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Payment confirmation, two doors, one truth:
//
//   /payments/ipn      — Pesapal's server calls it (public, unauthenticated)
//   /payments/:ref     — the app polls it after the browser returns
//
// Neither door TRUSTS its caller. Pesapal's IPN carries no signature, and the
// app can say anything — so both converge on the same confirm() below, which
// asks Pesapal's status API and transitions under a row lock. An IPN
// delivered five times, or an IPN racing the app's poll, produces exactly one
// state change: the payments row is locked, re-checked, and the ledger insert
// is ON CONFLICT DO NOTHING (the certification-fee pattern).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify against the gateway and settle the local state. Idempotent and safe
 * under concurrency. Returns the fresh payment row (or null when the ref is
 * unknown).
 */
async function confirm(paymentRow) {
  // Terminal already — nothing to ask the gateway.
  if (paymentRow.status !== 'pending') return paymentRow;
  if (!paymentRow.order_tracking_id) return paymentRow; // order never reached the gateway

  const gw = await getTransactionStatus(paymentRow.order_tracking_id);
  if (gw.status === 'pending') return paymentRow; // still on the page — nothing to record

  const settled = await withTransaction(async (client) => {
    // Lock and re-read: the IPN and the app's poll can arrive together.
    const { rows } = await client.query(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentRow.id]
    );
    const p = rows[0];
    if (!p || p.status !== 'pending') return p || null;

    const { rows: updated } = await client.query(
      `UPDATE payments
       SET status = $1, method = $2, confirmation_code = $3, raw_status = $4,
           confirmed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE confirmed_at END
       WHERE id = $5
       RETURNING *`,
      [gw.status, gw.method, gw.confirmationCode, JSON.stringify(gw.raw), p.id]
    );

    if (gw.status !== 'completed') return updated[0];

    // Money arrived: the hold becomes a real booking — unless it can't. The
    // renter may have cancelled while on the gateway page, or the hold may
    // have aged out and the dates been re-taken by someone else. A completed
    // payment must never manufacture a double-booking, so the flip re-checks
    // the overlap the original hold guaranteed.
    const { rows: bookings } = await client.query(
      `UPDATE rental_bookings b
       SET status = 'upcoming', paid_at = NOW()
       WHERE b.id = $1 AND b.status IN ('pending_payment', 'upcoming')
         AND NOT EXISTS (
           SELECT 1 FROM rental_bookings o
           WHERE o.rental_car_id = b.rental_car_id
             AND o.id <> b.id
             AND o.status IN ('upcoming', 'active')
             AND o.start_date < b.start_date + b.days
             AND o.start_date + o.days > b.start_date
         )
       RETURNING *`,
      [p.booking_id]
    );
    const booking = bookings[0];

    if (booking) {
      // The ledger hears about it, exactly once. platform_fees is the money
      // book — rental revenue was invisible to it until now.
      await client.query(
        `INSERT INTO platform_fees (booking_id, fee_type, amount, currency, status)
         VALUES ($1, 'rental', $2, $3, 'paid')
         ON CONFLICT (booking_id) WHERE fee_type = 'rental' DO NOTHING`,
        [p.booking_id, p.amount, p.currency]
      );
      await notifyUser(client, {
        user_id: booking.renter_id,
        type: 'listing_update',
        title: 'Payment received — rental confirmed',
        body: `Your rental ${booking.booking_ref} is paid and confirmed. The refundable deposit is handled at the center.`,
        meta: JSON.stringify({ bookingRef: booking.booking_ref, rentalCarId: booking.rental_car_id }),
      });
    } else {
      // Completed money, no confirmable booking. NOT revenue — it is owed
      // back (or rebooked), so no ledger row. Put humans on it: this is the
      // credit/manual-refund path, and silence here would be theft by bug.
      const { rows: orphan } = await client.query(
        'SELECT * FROM rental_bookings WHERE id = $1', [p.booking_id]
      );
      const b = orphan[0];
      log.error('payment completed but booking unconfirmable', {
        merchantRef: p.merchant_ref, booking: b?.booking_ref, bookingStatus: b?.status,
      });
      if (b) {
        await notifyUser(client, {
          user_id: b.renter_id,
          type: 'listing_update',
          title: 'Payment received — booking needs attention',
          body: `We received your payment for ${b.booking_ref}, but the booking could not be confirmed automatically. Our team will contact you to rebook or refund — your money is safe.`,
          meta: JSON.stringify({ bookingRef: b.booking_ref, rentalCarId: b.rental_car_id }),
        });
        const { rows: admins } = await client.query("SELECT id FROM users WHERE role = 'admin'");
        for (const a of admins) {
          await notifyUser(client, {
            user_id: a.id,
            type: 'listing_update',
            title: 'Rental payment needs manual resolution',
            body: `Payment ${p.merchant_ref} completed for booking ${b.booking_ref} (status: ${b.status}) but the dates could not be confirmed. Rebook or refund.`,
            meta: JSON.stringify({ bookingRef: b.booking_ref }),
          });
        }
      }
    }
    return { ...updated[0], _booking: booking || null };
  });

  // Receipt AFTER the commit — a mail outage must never roll back a payment.
  const booking = settled && settled._booking;
  if (booking) {
    pool.query(
      `SELECT u.email, u.name, rc.title FROM users u, rental_cars rc
       WHERE u.id = $1 AND rc.id = $2`,
      [booking.renter_id, booking.rental_car_id]
    ).then(({ rows: r }) => r[0] && sendRentalPaymentReceipt(
      r[0].email, r[0].name, r[0].title, booking.booking_ref,
      settled.amount, settled.currency, settled.confirmation_code
    )).catch(() => {});
  }
  return settled;
}

async function findPayment({ trackingId, merchantRef }) {
  const { rows } = await pool.query(
    `SELECT * FROM payments
     WHERE ${trackingId ? 'order_tracking_id = $1' : 'merchant_ref = $1'}`,
    [trackingId || merchantRef]
  );
  return rows[0] || null;
}

// ── The IPN — public by necessity, trusted never ──────────────────────────────
// Pesapal POSTs JSON (or GETs with query params, depending on registration).
// Always answered 200 with their expected shape so they stop retrying;
// failures on our side are logged and the app's poll is the safety net.
async function handleIpn(req, res) {
  const trackingId = req.body?.OrderTrackingId || req.query?.OrderTrackingId;
  const merchantRef = req.body?.OrderMerchantReference || req.query?.OrderMerchantReference;
  try {
    if (paymentsEnabled() && (trackingId || merchantRef)) {
      const payment = await findPayment({ trackingId, merchantRef });
      if (payment) await confirm(payment);
      else log.warn('ipn for unknown payment', { trackingId, merchantRef });
    }
  } catch (err) {
    log.error('ipn processing failed', { error: err.message, trackingId });
  }
  res.json({
    orderNotificationType: 'IPNCHANGE',
    orderTrackingId: trackingId || null,
    orderMerchantReference: merchantRef || null,
    status: 200,
  });
}

router.post('/ipn', handleIpn);
router.get('/ipn', handleIpn);

// ── The app's poll after the browser returns ─────────────────────────────────
// Also the safety net for a missed IPN: polling a still-pending payment asks
// the gateway live through the same confirm() path.
router.get('/:merchantRef', requireAuth, async (req, res) => {
  const ref = String(req.params.merchantRef || '');
  if (!/^SP-[A-F0-9]{12}$/.test(ref)) {
    return res.status(400).json({ error: 'Invalid payment reference' });
  }
  try {
    let payment = await findPayment({ merchantRef: ref });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Owner or admin only — a payment row names amounts and references.
    const { rows: b } = await pool.query(
      'SELECT renter_id FROM rental_bookings WHERE id = $1', [payment.booking_id]
    );
    const isOwner = b[0] && b[0].renter_id === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'pending' && paymentsEnabled()) {
      payment = (await confirm(payment)) || payment;
    }

    // Re-read AFTER confirm() — it may have just moved the booking, and a
    // completed payment does not always mean a confirmed booking (the
    // conflict path above leaves it where it was).
    const { rows: fresh } = await pool.query(
      'SELECT booking_ref, status FROM rental_bookings WHERE id = $1', [payment.booking_id]
    );

    res.json({
      merchant_ref: payment.merchant_ref,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      confirmation_code: payment.confirmation_code,
      booking_ref: fresh[0]?.booking_ref,
      booking_status: fresh[0]?.status,
    });
  } catch (err) {
    log.error('payment status error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
