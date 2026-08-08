const nodemailer = require('nodemailer');
const { log } = require('./log');

// ─── Outbound email ───────────────────────────────────────────────────────────
// Env-gated SMTP. When SMTP_HOST is set, mail really sends; when it isn't,
// senders fall back to their existing behaviour (the reset code is logged
// server-side), so development needs no provider and production only needs
// four env vars:
//   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, MAIL_FROM
// Works with any transactional SMTP endpoint (Brevo, Mailgun, SES, Zoho…).

let transport = null;

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transport;
}

/** True when real email delivery is configured. */
function mailEnabled() {
  return !!process.env.SMTP_HOST;
}

/**
 * Send, best-effort. Returns true on accepted, false otherwise — callers keep
 * their fallback path; a mail outage must never break the API route around it.
 */
async function sendMail({ to, subject, text }) {
  const t = getTransport();
  if (!t) return false;
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || 'Sawa Cars <no-reply@sawacars.com>',
      to,
      subject,
      text,
    });
    return true;
  } catch (err) {
    log.error('mail send failed', { error: err.message });
    return false;
  }
}

/** The password-reset email — plain text on purpose: fastest to render on any
 *  phone, nothing to land in Promotions, nothing to break. */
async function sendResetCode(email, code) {
  return sendMail({
    to: email,
    subject: `${code} is your Sawa Cars reset code`,
    text:
      `Your password reset code is: ${code}\n\n` +
      `It expires in 30 minutes. If you didn't request this, you can ignore ` +
      `this email — your password stays unchanged.\n\n— Sawa Cars`,
  });
}

module.exports = { mailEnabled, sendMail, sendResetCode };
