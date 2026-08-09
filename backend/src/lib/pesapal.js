const pool = require('../db');
const { log } = require('./log');

// ─── Pesapal API 3.0 client ───────────────────────────────────────────────────
// Hosted checkout: we submit an order, redirect the renter to Pesapal's page
// (cards + MTN MoMo + Airtel Money), and confirm server-side. Their IPN
// carries NO signature — the security model is "never trust the callback,
// always ask GetTransactionStatus yourself", and every function here follows
// it.
//
// Env-gated exactly like the mailbox (MAIL_*): unset means paymentsEnabled()
// is false, callers degrade to the pay-at-center flow, and nothing else
// breaks. Never refuse to boot over a payment key — the marketplace must not
// go down over a rentals feature.
//
//   PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET  — from the merchant portal
//   PESAPAL_ENV                                     — 'sandbox' (default) | 'live'
//   PESAPAL_CALLBACK_URL                            — where the browser returns
//   PESAPAL_IPN_URL                                 — our public IPN endpoint

const HOSTS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
};

const FETCH_TIMEOUT_MS = 10_000;

function paymentsEnabled() {
  return Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET);
}

function baseUrl() {
  return HOSTS[process.env.PESAPAL_ENV === 'live' ? 'live' : 'sandbox'];
}

class PaymentError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function postJson(path, body, token) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PaymentError('GATEWAY_HTTP', `Pesapal ${path} returned ${res.status}`, 502);
  }
  return data;
}

async function getJson(path, token) {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PaymentError('GATEWAY_HTTP', `Pesapal ${path} returned ${res.status}`, 502);
  }
  return data;
}

// ── Auth token — expires in ~5 minutes; cached for 4 ─────────────────────────
let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  if (!paymentsEnabled()) {
    throw new PaymentError('PAYMENTS_NOT_CONFIGURED', 'Online payment is not configured.', 503);
  }
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const data = await postJson('/api/Auth/RequestToken', {
    consumer_key: process.env.PESAPAL_CONSUMER_KEY,
    consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
  });
  if (!data.token) {
    throw new PaymentError('GATEWAY_AUTH', 'Pesapal did not issue a token.', 502);
  }
  tokenCache = { token: data.token, expiresAt: Date.now() + 4 * 60_000 };
  return data.token;
}

// ── IPN registration — once, persisted ────────────────────────────────────────
// Pesapal mints an ipn_id per registered URL; it is reused on every order.
// Persisted in payment_config so restarts don't re-register endlessly.
async function getIpnId() {
  const { rows } = await pool.query(
    "SELECT value FROM payment_config WHERE key = 'pesapal_ipn_id'"
  );
  const url = process.env.PESAPAL_IPN_URL;
  const { rows: savedUrl } = await pool.query(
    "SELECT value FROM payment_config WHERE key = 'pesapal_ipn_url'"
  );
  // Re-register only when the URL changed (or never registered).
  if (rows.length && savedUrl.length && savedUrl[0].value === url) return rows[0].value;

  if (!url) throw new PaymentError('PAYMENTS_MISCONFIGURED', 'PESAPAL_IPN_URL is not set.', 503);
  const token = await getToken();
  const data = await postJson('/api/URLSetup/RegisterIPN', {
    url,
    ipn_notification_type: 'POST',
  }, token);
  if (!data.ipn_id) {
    throw new PaymentError('GATEWAY_IPN', 'Pesapal did not return an IPN id.', 502);
  }
  await pool.query(
    `INSERT INTO payment_config (key, value) VALUES ('pesapal_ipn_id', $1), ('pesapal_ipn_url', $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [data.ipn_id, url]
  );
  return data.ipn_id;
}

/**
 * Create a hosted-checkout order. Returns { orderTrackingId, redirectUrl }.
 *
 * merchantRef is OUR unique id for the attempt (the payments.merchant_ref
 * row) — Pesapal echoes it back on the IPN, and it is what makes a duplicate
 * submission detectable.
 */
async function submitOrder({ merchantRef, amount, currency, description, email, phone, name }) {
  const token = await getToken();
  const ipnId = await getIpnId();

  const data = await postJson('/api/Transactions/SubmitOrderRequest', {
    id: merchantRef,
    currency,
    amount,
    description: String(description || '').slice(0, 100),
    callback_url: process.env.PESAPAL_CALLBACK_URL,
    notification_id: ipnId,
    billing_address: {
      email_address: email || undefined,
      phone_number: phone || undefined,
      first_name: String(name || '').split(' ')[0] || undefined,
      last_name: String(name || '').split(' ').slice(1).join(' ') || undefined,
    },
  }, token);

  if (data.error || !data.order_tracking_id || !data.redirect_url) {
    const msg = data.error?.message || data.error?.code || 'Order was not accepted.';
    throw new PaymentError('GATEWAY_ORDER', `Pesapal rejected the order: ${msg}`, 502);
  }
  return { orderTrackingId: data.order_tracking_id, redirectUrl: data.redirect_url };
}

/**
 * The ONLY source of payment truth. Maps Pesapal's status vocabulary onto
 * ours; anything unrecognised stays 'pending' — a payment is never failed on
 * a parsing guess.
 */
async function getTransactionStatus(orderTrackingId) {
  const token = await getToken();
  const data = await getJson(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    token
  );
  const desc = String(data.payment_status_description || '').toUpperCase();
  const status =
    desc === 'COMPLETED' ? 'completed'
    : desc === 'FAILED' || desc === 'INVALID' ? 'failed'
    : desc === 'REVERSED' ? 'reversed'
    : 'pending';
  return {
    status,
    method: data.payment_method || null,
    confirmationCode: data.confirmation_code || null,
    amount: data.amount != null ? Number(data.amount) : null,
    currency: data.currency || null,
    raw: data,
  };
}

/** Test hook — clears the token cache. */
function _resetForTests() {
  tokenCache = { token: null, expiresAt: 0 };
}

module.exports = {
  paymentsEnabled,
  getToken,
  getIpnId,
  submitOrder,
  getTransactionStatus,
  PaymentError,
  _resetForTests,
};
