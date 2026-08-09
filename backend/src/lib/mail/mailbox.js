const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { log } = require('../log');
const {
  MailError, MAIL_UNREACHABLE, mailConfig, withMailbox, getClient, classify,
} = require('./connection');
const { sanitizeEmailHtml, textToHtml } = require('./sanitize');

// ─────────────────────────────────────────────────────────────────────────────
// Reading and answering the contact@ mailbox.
//
// Design decision recorded here because it drives everything below: this reads
// the mailbox LIVE over IMAP rather than syncing it into Postgres. At this
// scale — one mailbox, a handful of admins — the sync version costs a schema, a
// worker, UID/UIDVALIDITY bookkeeping, deletion reconciliation and a second
// source of truth that drifts, in exchange for benefits (instant loads, full
// text search, joining a thread to a car) that are speculative until we know how
// contact@ actually gets used.
//
// Two things make live IMAP behave acceptably:
//   • ONE pooled connection (see connection.js) rather than connect-per-request
//   • envelopes cached briefly, bodies fetched lazily per message
//
// The API shape is deliberately storage-agnostic, so swapping in a background
// sync later is a change here and nowhere else.
// ─────────────────────────────────────────────────────────────────────────────

const INBOX = 'INBOX';

// Hostinger and most IMAP hosts expose Sent under one of these. Resolved once
// per process by asking the server what actually exists, because APPENDing to a
// folder that is not there silently loses the operator's own reply.
const SENT_CANDIDATES = ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages'];

// ── Envelope cache ───────────────────────────────────────────────────────────
// A short TTL, keyed by mailbox+page. Switching tabs in the dashboard should not
// reopen a mailbox lock, but mail is time-sensitive enough that a minute is the
// most staleness worth trading for it. Invalidated explicitly by any write
// (reply, flag change) so an action's effect is never hidden by the cache.
const LIST_TTL_MS = 60_000;
const listCache = new Map();

function cacheKey(mailbox, limit, offset, search) {
  return `${mailbox}|${limit}|${offset}|${search || ''}`;
}

function invalidateListCache() {
  listCache.clear();
}

/** Bytes are not a display concern, and "12.4 MB" belongs next to a download
 *  button so an admin knows before tapping it on mobile data. */
function humanSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function addressList(addr) {
  if (!addr) return [];
  const list = Array.isArray(addr) ? addr : [addr];
  return list
    .map((a) => ({ name: a.name || '', address: a.address || '' }))
    .filter((a) => a.address || a.name);
}

/**
 * Envelope list, newest first.
 *
 * Envelopes only — no bodies. Fetching bodies for a 25-message page is what makes
 * a naive IMAP inbox feel broken; a body is fetched when a message is opened.
 */
async function listMessages({ mailbox = INBOX, limit = 25, offset = 0, search = '' } = {}) {
  const key = cacheKey(mailbox, limit, offset, search);
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.value;

  const value = await withMailbox(mailbox, async (client) => {
    const status = await client.status(mailbox, { messages: true, unseen: true });
    const total = status.messages || 0;
    const unread = status.unseen || 0;

    if (total === 0) {
      return { messages: [], total: 0, unread: 0, limit, offset, mailbox };
    }

    // Search narrows the set server-side; otherwise page by sequence number from
    // the end, which is the cheapest way to get "newest first" out of IMAP.
    let uids = null;
    if (search) {
      // OR across the fields an operator would actually search. IMAP SEARCH is
      // server-side, so this does not pull the mailbox down to filter locally.
      uids = await client.search({
        or: [{ from: search }, { subject: search }, { body: search }],
      });
      if (!uids || !uids.length) {
        return { messages: [], total: 0, unread, limit, offset, mailbox, search };
      }
      uids = uids.slice().sort((a, b) => b - a); // newest first
    }

    const messages = [];

    if (uids) {
      const page = uids.slice(offset, offset + limit);
      if (page.length) {
        for await (const msg of client.fetch(
          page.join(','),
          { uid: true, envelope: true, flags: true, size: true, bodyStructure: true },
          { uid: true }
        )) {
          messages.push(toEnvelope(msg));
        }
      }
      // Sort again: IMAP may return in any order regardless of the request.
      messages.sort((a, b) => b.uid - a.uid);
      return { messages, total: uids.length, unread, limit, offset, mailbox, search };
    }

    // No search: sequence-number window from the newest end.
    const end = Math.max(1, total - offset);
    const start = Math.max(1, end - limit + 1);
    if (end >= 1 && total > offset) {
      for await (const msg of client.fetch(
        `${start}:${end}`,
        { uid: true, envelope: true, flags: true, size: true, bodyStructure: true }
      )) {
        messages.push(toEnvelope(msg));
      }
    }
    messages.sort((a, b) => b.uid - a.uid);
    return { messages, total, unread, limit, offset, mailbox };
  });

  listCache.set(key, { at: Date.now(), value });
  return value;
}

/** Does this structure carry anything a human would call an attachment? Computed
 *  from bodyStructure so the list can show a paperclip without fetching bodies. */
function countAttachments(node) {
  if (!node) return 0;
  let n = 0;
  const walk = (part) => {
    if (!part) return;
    const disp = String(part.disposition || '').toLowerCase();
    const type = String(part.type || '').toLowerCase();
    if (disp === 'attachment') n += 1;
    else if (disp !== 'inline' && !type.startsWith('text/') && !type.startsWith('multipart/')) n += 1;
    (part.childNodes || []).forEach(walk);
  };
  walk(node);
  return n;
}

function toEnvelope(msg) {
  const env = msg.envelope || {};
  const flags = msg.flags instanceof Set ? [...msg.flags] : (msg.flags || []);
  return {
    uid: msg.uid,
    subject: env.subject || '(no subject)',
    from: addressList(env.from)[0] || { name: '', address: '' },
    to: addressList(env.to),
    date: env.date || null,
    // \Seen is the IMAP flag; the UI wants the positive statement.
    unread: !flags.includes('\\Seen'),
    answered: flags.includes('\\Answered'),
    flagged: flags.includes('\\Flagged'),
    size: msg.size || 0,
    sizeLabel: humanSize(msg.size),
    attachmentCount: countAttachments(msg.bodyStructure),
    messageId: env.messageId || null,
  };
}

/**
 * One message, parsed and sanitised.
 *
 * `markSeen` defaults to true because opening a message IS reading it — leaving
 * the unread count untouched after an admin has read something makes the badge
 * useless. Attachment BODIES are not returned; only their metadata, so a 20 MB
 * PDF never travels inside a JSON response.
 */
async function getMessage(uid, { mailbox = INBOX, markSeen = true, loadRemoteImages = false } = {}) {
  return withMailbox(mailbox, async (client) => {
    const raw = await client.download(String(uid), undefined, { uid: true });
    if (!raw || !raw.content) {
      throw new MailError('MAIL_NOT_FOUND', 'That message is no longer in the mailbox.', 404);
    }

    const parsed = await simpleParser(raw.content);

    let bodyHtml;
    let blockedImages = 0;
    if (parsed.html) {
      const res = sanitizeEmailHtml(parsed.html, { loadRemoteImages });
      bodyHtml = res.html;
      blockedImages = res.blockedImages;
    } else {
      bodyHtml = textToHtml(parsed.text || '');
    }

    const attachments = (parsed.attachments || []).map((a, i) => ({
      index: i,
      filename: a.filename || `attachment-${i + 1}`,
      contentType: a.contentType || 'application/octet-stream',
      size: a.size || 0,
      sizeLabel: humanSize(a.size),
      // cid lets the UI tell an inline image apart from a real attachment.
      cid: a.cid || null,
      inline: String(a.contentDisposition || '').toLowerCase() === 'inline',
    }));

    if (markSeen) {
      try {
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        invalidateListCache();
      } catch (err) {
        // Not fatal: the admin can still read it. Failing the whole request
        // because a flag did not stick would be the wrong trade.
        log.error('imap flag add failed', { error: err.message, uid });
      }
    }

    return {
      uid: Number(uid),
      mailbox,
      subject: parsed.subject || '(no subject)',
      from: addressList(parsed.from && parsed.from.value)[0] || { name: '', address: '' },
      to: addressList(parsed.to && parsed.to.value),
      cc: addressList(parsed.cc && parsed.cc.value),
      date: parsed.date || null,
      messageId: parsed.messageId || null,
      // Carried so a reply can thread correctly — see sendReply.
      references: parsed.references
        ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references])
        : [],
      inReplyTo: parsed.inReplyTo || null,
      bodyHtml,
      blockedImages,
      hasHtml: Boolean(parsed.html),
      attachments,
    };
  });
}

/** A single attachment as a buffer, for streaming to the client. Kept separate
 *  from getMessage so opening a message never moves attachment bytes. */
async function getAttachment(uid, index, { mailbox = INBOX } = {}) {
  return withMailbox(mailbox, async (client) => {
    const raw = await client.download(String(uid), undefined, { uid: true });
    if (!raw || !raw.content) {
      throw new MailError('MAIL_NOT_FOUND', 'That message is no longer in the mailbox.', 404);
    }
    const parsed = await simpleParser(raw.content);
    const att = (parsed.attachments || [])[Number(index)];
    if (!att) {
      throw new MailError('MAIL_NOT_FOUND', 'That attachment is not on this message.', 404);
    }
    return {
      // Strip any path the sender put in the filename. A filename is attacker
      // controlled, and this value ends up in a Content-Disposition header.
      filename: String(att.filename || `attachment-${Number(index) + 1}`)
        .replace(/[\\/]/g, '_')
        .replace(/[\r\n"]/g, '')
        .slice(0, 200),
      contentType: att.contentType || 'application/octet-stream',
      content: att.content,
      size: att.size || (att.content ? att.content.length : 0),
    };
  });
}

async function setFlag(uid, flag, on, { mailbox = INBOX } = {}) {
  const allowed = { seen: '\\Seen', flagged: '\\Flagged' };
  const imapFlag = allowed[flag];
  if (!imapFlag) throw new MailError('MAIL_BAD_FLAG', 'Unsupported flag.', 400);
  await withMailbox(mailbox, async (client) => {
    if (on) await client.messageFlagsAdd(String(uid), [imapFlag], { uid: true });
    else await client.messageFlagsRemove(String(uid), [imapFlag], { uid: true });
  });
  invalidateListCache();
}

// ── Sending ──────────────────────────────────────────────────────────────────

let transport = null;
function getTransport() {
  const cfg = mailConfig();
  if (!cfg) throw new MailError('MAIL_NOT_CONFIGURED', 'No mailbox is configured.', 503);
  if (!transport) {
    transport = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      // 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: cfg.smtpPort === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return transport;
}

/** Where does this account keep sent mail? Asked once, then remembered. */
let sentPathCache;
async function resolveSentPath() {
  if (sentPathCache !== undefined) return sentPathCache;
  try {
    const client = await getClient();
    const list = await client.list();
    // Prefer the folder the server itself flags as \Sent — that is authoritative
    // and survives localisation, where a name match would not.
    const flagged = list.find((b) => (b.flags && (b.flags.has ? b.flags.has('\\Sent') : b.flags.includes('\\Sent'))));
    if (flagged) { sentPathCache = flagged.path; return sentPathCache; }
    const byName = list.find((b) => SENT_CANDIDATES.includes(b.path));
    sentPathCache = byName ? byName.path : null;
  } catch (err) {
    log.error('could not list mailboxes to find Sent', { error: err.message });
    sentPathCache = null;
  }
  return sentPathCache;
}

/**
 * Reply to a message in the thread it belongs to.
 *
 * Deliberately reply-ONLY: the recipient is taken from the message being
 * answered, never from the request body. A free `to` field would turn an admin
 * page into a send-anything-from-contact@ console — an open relay with a login
 * screen — and the mailbox is the company's real address, so abuse gets the
 * domain blacklisted.
 *
 * Threading matters for the customer, not for us: without In-Reply-To and
 * References their client shows the reply as a new unrelated message.
 */
async function sendReply(uid, text, { mailbox = INBOX } = {}) {
  const body = String(text || '').trim();
  if (!body) throw new MailError('MAIL_EMPTY_REPLY', 'A reply needs a message.', 400);
  if (body.length > 25_000) {
    throw new MailError('MAIL_REPLY_TOO_LONG', 'That reply is too long to send.', 400);
  }

  const cfg = mailConfig();
  // Read the original WITHOUT marking it seen: replying already implies read,
  // and getMessage's own flag write happens below via the answered flag.
  const original = await getMessage(uid, { mailbox, markSeen: false });
  const recipient = original.from && original.from.address;
  if (!recipient) {
    throw new MailError('MAIL_NO_RECIPIENT', 'That message has no reply address.', 422);
  }

  const subject = /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
  const references = [...original.references];
  if (original.messageId && !references.includes(original.messageId)) {
    references.push(original.messageId);
  }

  const message = {
    from: `Sawa Cars <${cfg.user}>`,
    to: recipient,
    subject,
    text: body,
    ...(original.messageId ? { inReplyTo: original.messageId } : {}),
    ...(references.length ? { references } : {}),
  };

  let info;
  try {
    info = await getTransport().sendMail(message);
  } catch (err) {
    log.error('smtp reply failed', { error: err.message });
    throw classify(err);
  }

  // Mark the original answered so the list shows it was dealt with. Best effort:
  // the reply is already gone, and failing the request now would invite a
  // duplicate send.
  try {
    await withMailbox(mailbox, (client) =>
      client.messageFlagsAdd(String(uid), ['\\Answered'], { uid: true }));
  } catch (err) {
    log.error('could not flag message answered', { error: err.message, uid });
  }

  // APPEND to Sent, or the reply exists only in the recipient's mailbox and the
  // team's own webmail shows no record of having answered.
  try {
    const sentPath = await resolveSentPath();
    if (sentPath && info && info.message) {
      const client = await getClient();
      await client.append(sentPath, info.message, ['\\Seen']);
    }
  } catch (err) {
    log.error('could not append reply to Sent', { error: err.message });
  }

  invalidateListCache();
  return { messageId: info && info.messageId, to: recipient, subject };
}

/** Unread count for the sidebar badge. Cheap: STATUS, not a fetch. */
async function unreadCount({ mailbox = INBOX } = {}) {
  const client = await getClient();
  try {
    const status = await client.status(mailbox, { unseen: true, messages: true });
    return { unread: status.unseen || 0, total: status.messages || 0 };
  } catch (err) {
    throw classify(err);
  }
}

module.exports = {
  INBOX,
  listMessages,
  getMessage,
  getAttachment,
  setFlag,
  sendReply,
  unreadCount,
  invalidateListCache,
  humanSize,
};
