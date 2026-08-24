const nodemailer = require('nodemailer');
const { log } = require('./log');

// ─── Outbound email ───────────────────────────────────────────────────────────
// Env-gated SMTP. When SMTP_HOST is set, mail really sends; when it isn't,
// senders fall back to their existing behaviour (the reset code is logged
// server-side), so development needs no provider and production only needs
// five env vars:
//   SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS, MAIL_FROM
// Works with any transactional SMTP endpoint (Hostinger, Brevo, Mailgun, SES…).
//
// Design rules, applied to every sender below:
//   • ONE identity — everything sends from MAIL_FROM (no-reply@), while the
//     humans answer from contact@ (routes/mail.js). The two never mix.
//   • Text-first with a minimal HTML wrapper. Deliverability beats decoration:
//     heavy HTML is what lands in Promotions/Spam, and every template here
//     reads perfectly as plain text.
//   • Fire-and-forget at the call sites — a slow mail server must never block
//     a signup, a handover, or a deletion. Only the reset code returns its
//     delivery status, because the route's behaviour depends on it.
//   • This module emails ACCOUNT and BUSINESS events only. Chat messages and
//     price drops are push/in-app territory — emailing those is how a domain
//     trains recipients (and filters) to ignore it.

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

/** True when real email delivery is configured (Resend or SMTP). */
function mailEnabled() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

const SITE = 'https://sawacars.com';
const CONTACT = 'contact@sawacars.com';
const PHONE = '+250 788 308 611';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Email-client CSS support froze somewhere around 2003, so this is built the
// way transactional mail at the serious shops actually is: nested tables with
// role="presentation", every style inline, bgcolor attributes doubled up for
// Outlook, no remote images at all (they get blocked and the mail looks
// broken — the wordmark is typography, not a logo file), a hidden preheader
// so the inbox preview line is chosen rather than accidental, and a
// bulletproof table-based button. It degrades to clean plain text.
const BRAND = '#CC050F';
const INK = '#141414';
const MUTED = '#8A8A8A';
const PAPER = '#FFFFFF';
const GROUND = '#F4F2F2';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * The one template — every email is the same voice in the same clothes.
 *   title      the headline inside the card
 *   preheader  the inbox preview line (falls back to the first string line)
 *   lines      paragraphs; { strong } renders as a centred code/reference box
 *   cta        optional { label, url } — one action, never two
 */
function render({ title, preheader, lines, cta }) {
  const text =
    `${title}\n\n` +
    lines.map((l) => (typeof l === 'string' ? l : l.strong)).join('\n\n') +
    (cta ? `\n\n${cta.label}: ${cta.url}` : '') +
    `\n\n— Sawa Cars\n${SITE} · ${CONTACT} · ${PHONE}`;

  const preview = preheader || lines.find((l) => typeof l === 'string') || title;

  const paragraphs = lines.map((l) =>
    typeof l === 'string'
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3D3D3D">${esc(l)}</p>`
      : // The reference box — a reset code or booking ref, made unmissable and
        // easy to read aloud over a phone call.
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px">` +
        `<tr><td align="center" bgcolor="${GROUND}" style="background:${GROUND};border-radius:10px;padding:18px 12px;` +
        `font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:0.12em;color:${INK}">${esc(l.strong)}</td></tr></table>`
  ).join('');

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px">` +
      `<tr><td align="center" bgcolor="${BRAND}" style="background:${BRAND};border-radius:10px">` +
      `<a href="${esc(cta.url)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};` +
      `font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none">${esc(cta.label)}</a>` +
      `</td></tr></table>`
    : '';

  const html =
    `<!doctype html><html><body style="margin:0;padding:0;background:${GROUND}" bgcolor="${GROUND}">` +
    // Preheader: visible to the inbox list, invisible in the mail itself.
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">` +
    `${esc(typeof preview === 'string' ? preview : title)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${GROUND}" style="background:${GROUND}">` +
    `<tr><td align="center" style="padding:32px 16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">` +
    // The real logo, served from our own domain. Gmail and Apple Mail load
    // images by default for SPF/DKIM-authenticated senders, which we are; for
    // the clients that don't (Outlook desktop's first open), the styled alt
    // text renders the wordmark in brand red in the same spot — the header
    // never looks broken, with or without images.
    `<tr><td style="padding:0 4px 18px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="vertical-align:middle"><img src="${SITE}/brand/email-logo.png" width="40" height="40" ` +
    `alt="Sawa" style="display:block;border:0;font-family:${FONT};font-size:19px;font-weight:800;color:${BRAND}"></td>` +
    `<td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:19px;font-weight:800;` +
    `letter-spacing:-0.01em;color:${BRAND}">Sawa <span style="color:${INK}">Cars</span></td>` +
    `</tr></table></td></tr>` +
    // The card.
    `<tr><td bgcolor="${PAPER}" style="background:${PAPER};border-radius:14px;padding:32px 28px">` +
    `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:21px;line-height:1.35;font-weight:800;color:${INK}">${esc(title)}</h1>` +
    `<div style="font-family:${FONT}">${paragraphs}</div>` +
    button +
    `</td></tr>` +
    // Footer, outside the card.
    `<tr><td style="padding:22px 4px 0;font-family:${FONT};font-size:12px;line-height:1.7;color:${MUTED}">` +
    `Sawa Cars · Kigali, Rwanda — every car inspected on 150 points.<br>` +
    `<a href="${SITE}" style="color:${MUTED}">${SITE.replace('https://', '')}</a> · ` +
    `<a href="mailto:${CONTACT}" style="color:${MUTED}">${CONTACT}</a> · ${PHONE}` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`;

  return { text, html };
}

async function sendViaResend({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || 'Sawa Cars <no-reply@sawacars.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Resend API error ${res.status}`);
  }
  return true;
}

/**
 * Send, best-effort. Returns true on accepted, false otherwise — callers keep
 * their fallback path; a mail outage must never break the API route around it.
 */
async function sendMail({ to, subject, text, html }) {
  if (process.env.RESEND_API_KEY) {
    try {
      await sendViaResend({ to, subject, text, html });
      log.info('email sent via resend', { to, subject });
      return true;
    } catch (err) {
      log.error('resend email failed', { error: err.message, to, subject });
      if (!process.env.SMTP_HOST) return false;
    }
  }

  const t = getTransport();
  if (!t) return false;
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || 'Sawa Cars <no-reply@sawacars.com>',
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return true;
  } catch (err) {
    log.error('mail send failed', { error: err.message });
    return false;
  }
}

/** Templated send that never throws and never blocks — the shape every
 *  business-event sender below uses. */
function sendTemplate(to, subject, body) {
  if (!to) return Promise.resolve(false);
  const { text, html } = render(body);
  return sendMail({ to, subject, text, html }).catch((err) => {
    log.error('mail send failed', { error: err?.message, subject });
    return false;
  });
}

// ─── Account security ─────────────────────────────────────────────────────────

/** The password-reset email. The ONE sender whose result matters to its route. */
async function sendResetCode(email, code) {
  return sendTemplate(email, `${code} is your Sawa Cars reset code`, {
    title: 'Your password reset code',
    lines: [
      { strong: code },
      'It expires in 30 minutes. If you didn’t request this, you can ignore this email — your password stays unchanged.',
    ],
  });
}

function sendWelcome(email, name) {
  return sendTemplate(email, 'Welcome to Sawa Cars', {
    title: `Welcome, ${name || 'there'}.`,
    lines: [
      'Your Sawa Cars account is ready. Public vehicle listings carry their recorded 150-point inspection information and come from eligible verified sellers.',
      'Browse and save cars, contact sellers directly, or submit and track your own vehicle — all from this one account in the app or on the website.',
      'Sawa Cars does not hold transaction funds, issue the users’ contract, or guarantee a vehicle, payment, delivery, rental, or external agreement.',
      `Questions? Write to ${CONTACT} or call ${PHONE} — a real person answers.`,
    ],
    cta: { label: 'Browse reviewed cars', url: `${SITE}/cars` },
  });
}

function sendShowroomInvite(email, name, businessName, token) {
  const url = `${SITE}/activate-showroom?token=${encodeURIComponent(token)}`;
  return sendTemplate(email, `Activate your ${businessName} showroom account`, {
    title: 'Your showroom account is ready',
    preheader: 'Create your private password to activate the account.',
    lines: [
      `Hi ${name || 'there'} — a Sawa Cars administrator created a verified showroom account for ${businessName}.`,
      'For security, no reusable password is included in this email. Use the private link below to create your password. The link expires in 48 hours and can only be used once.',
      'After activation, you can manage your showroom vehicles through Sawa Cars. Never share your password or verification codes with anyone.',
    ],
    cta: { label: 'Create my password', url },
  });
}

function sendImportUpdate(email, name, orderRef, title, detail) {
  return sendTemplate(email, `${orderRef} — ${title}`, {
    title,
    preheader: `${orderRef}: ${detail}`,
    lines: [
      `Hi ${name || 'there'} — ${detail}`,
      `Order reference: ${orderRef}. Your agreement, verified payment status, documents and shipping milestones are available in your Sawa Cars dashboard.`,
      'Only pay using the corporate bank instructions displayed on your official order. Sawa Cars never asks you to pay an employee or personal account.',
    ],
    cta: { label: 'Track my import', url: `${SITE}/dashboard/imports` },
  });
}

/** After change-password AND after a completed reset: if it wasn't the owner,
 *  this email is the only way they ever find out. */
function sendPasswordChanged(email, name) {
  return sendTemplate(email, 'Your Sawa Cars password was changed', {
    title: 'Your password was changed',
    lines: [
      `Hi ${name || 'there'} — the password on your Sawa Cars account was just changed. Every other signed-in device has been signed out.`,
      `If this was you, there is nothing to do. If it was NOT you, reply to ${CONTACT} immediately or use “Forgot password” to take the account back.`,
    ],
  });
}

function sendAccountDeleted(email, name) {
  return sendTemplate(email, 'Your Sawa Cars account has been deleted', {
    title: 'Your account is deleted',
    lines: [
      `Hi ${name || 'there'} — your Sawa Cars account, saved cars, saved searches and identity documents have been permanently deleted, as you asked.`,
      'Records of sales that already completed are kept as the law requires, but they no longer carry your name or contact details.',
      'This is the last email you will receive from us. If you change your mind, you are always welcome to create a new account.',
    ],
  });
}

// ─── Business events — the paper trail ────────────────────────────────────────

function sendPurchaseRequested(email, name, carTitle) {
  return sendTemplate(email, 'Your vehicle enquiry was recorded', {
    title: 'Vehicle enquiry recorded',
    lines: [
      `Hi ${name || 'there'} — your historical enquiry about the ${carTitle} was recorded. An enquiry does not reserve the vehicle or create a contract.`,
      'Contact the seller directly to arrange any viewing, independent checks, written terms, payment, transfer and delivery. Sawa Cars is not a party to that agreement.',
      `Need to reach us sooner? ${CONTACT} · ${PHONE}`,
    ],
  });
}

function sendHandoverConfirmed(email, name, carTitle, when) {
  return sendTemplate(email, `Handover confirmed — ${carTitle}`, {
    title: 'Your handover is confirmed',
    lines: [
      `Hi ${name || 'there'} — the handover for the ${carTitle} is confirmed${when ? ` for ${when}` : ''}.`,
      'This is a historical service record only. The users remain responsible for their own contract, payment, ownership transfer and delivery arrangements.',
    ],
  });
}

/** Historical completion record. Current transaction writes are retired. */
function sendHandoverComplete(email, name, carTitle, isBuyer) {
  return sendTemplate(email, `Completed — ${carTitle}`, {
    title: isBuyer ? 'The car is yours' : 'Your car is sold',
    lines: [
      isBuyer
        ? `Congratulations ${name || ''} — the handover of the ${carTitle} is complete and the sale is recorded.`
        : `Hi ${name || 'there'} — the handover of your ${carTitle} is complete and the sale is recorded.`,
      'Sawa Cars does not provide a transaction warranty, return promise, escrow or refund guarantee. Any rights or remedies come from the users’ agreement and applicable law.',
      `This email is a historical platform record. Keep your own contract and payment records; for platform-content concerns, contact ${CONTACT}.`,
    ],
  });
}

function sendIdDecision(email, name, approved, notes) {
  return sendTemplate(
    email,
    approved ? 'You are verified — start selling on Sawa Cars' : 'Your ID verification needs another look',
    approved
      ? {
          title: 'Identity verified ✓',
          lines: [
            `Hi ${name || 'there'} — your identity documents are approved. Your account now carries the Verified Seller badge, and eligible inspected listings can proceed toward publication.`,
            'If you have not submitted a car yet, start from the Sell tab. If one is already in the inspection pipeline, you can continue tracking it.',
          ],
          cta: { label: 'Start selling', url: `${SITE}/sell` },
        }
      : {
          title: 'We couldn’t verify your documents',
          lines: [
            `Hi ${name || 'there'} — we couldn’t verify the documents you sent${notes ? `: ${notes}` : '.'}`,
            'Re-submit from the app with a clear, well-lit photo of the front and back of your ID and a matching selfie. It usually takes one more try.',
          ],
        }
  );
}

function sendRentalBooked(email, name, carTitle, startDate, days, ref) {
  return sendTemplate(email, `Rental booked — ${carTitle}`, {
    title: 'Your rental is booked',
    lines: [
      `Hi ${name || 'there'} — your booking for the ${carTitle} is in.`,
      ...(ref ? [{ strong: `Booking reference: ${ref}` }] : []),
      `${startDate ? `Pick-up: ${startDate}` : 'Pick-up date'}${days ? ` · ${days} day${days === 1 ? '' : 's'}` : ''}. Condition photos are taken together at pick-up and return — the deposit comes back after the documented return check.`,
    ],
  });
}

/** The paid-rental receipt — sent only when the gateway confirmed the money.
 *  The confirmation code is the line the renter reads out at the center. */
function sendRentalPaymentReceipt(email, name, carTitle, ref, amount, currency, code) {
  const money = `RWF ${Number(amount).toLocaleString('en-RW')}`;
  return sendTemplate(email, `Payment received — ${ref}`, {
    title: 'Payment received',
    lines: [
      `Hi ${name || 'there'} — your payment of ${money} for the ${carTitle} is confirmed. This email is your receipt.`,
      { strong: `${ref}${code ? ` · ${code}` : ''}` },
      'The refundable deposit is handled at the center at pick-up, and comes back after the documented return check. Bring your driving licence and ID.',
    ],
  });
}

function sendDisputeUpdate(email, name, opened, resolution) {
  return sendTemplate(
    email,
    opened ? 'We’ve received your dispute' : 'Your dispute has been reviewed',
    opened
      ? {
          title: 'Dispute received',
          lines: [
            `Hi ${name || 'there'} — your dispute is logged and a member of our team is on it. We aim to come back to you within 2 business days.`,
            'You can follow its status under Disputes in the app.',
          ],
        }
      : {
          title: 'Dispute reviewed',
          lines: [
            `Hi ${name || 'there'} — our team has reviewed your dispute.`,
            ...(resolution ? [resolution] : []),
            `If this doesn’t settle it, reply to ${CONTACT} and a person will pick it up.`,
          ],
        }
  );
}

module.exports = {
  mailEnabled,
  sendMail,
  sendResetCode,
  sendWelcome,
  sendShowroomInvite,
  sendImportUpdate,
  sendPasswordChanged,
  sendAccountDeleted,
  sendPurchaseRequested,
  sendHandoverConfirmed,
  sendHandoverComplete,
  sendIdDecision,
  sendRentalBooked,
  sendRentalPaymentReceipt,
  sendDisputeUpdate,
};
