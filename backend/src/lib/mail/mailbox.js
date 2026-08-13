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

// The standard mailboxes, resolved against what the server actually has.
// Special-use flags (RFC 6154) are authoritative and survive localisation;
// the name candidates are the fallback for servers that don't advertise them.
// Hostinger nests everything under INBOX. — hence the INBOX.* entries.
const SPECIAL_FOLDERS = {
  sent:   { flag: '\\Sent',   names: ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages'] },
  drafts: { flag: '\\Drafts', names: ['Drafts', 'INBOX.Drafts'] },
  junk:   { flag: '\\Junk',   names: ['Junk', 'INBOX.Junk', 'Spam', 'INBOX.Spam'] },
  trash:  { flag: '\\Trash',  names: ['Trash', 'INBOX.Trash', 'Deleted Items', 'Deleted Messages'] },
};

// Folder KEYS are the API surface; IMAP paths never travel to or from the
// client. A client-supplied path would let any admin session open arbitrary
// mailboxes by name — harmless on this single-account server, but the habit
// of validating identifiers at the edge is what keeps it harmless.
let specialPathsCache;
async function resolveSpecialPaths() {
  if (specialPathsCache !== undefined) return specialPathsCache;
  const paths = { inbox: INBOX, sent: null, drafts: null, junk: null, trash: null };
  try {
    const client = await getClient();
    const list = await client.list();
    const hasFlag = (b, f) => b.flags && (b.flags.has ? b.flags.has(f) : b.flags.includes(f));
    for (const [key, spec] of Object.entries(SPECIAL_FOLDERS)) {
      const flagged = list.find((b) => hasFlag(b, spec.flag));
      const byName = flagged || list.find((b) => spec.names.includes(b.path));
      paths[key] = byName ? byName.path : null;
    }
  } catch (err) {
    log.error('could not list mailboxes', { error: err.message });
    specialPathsCache = undefined; // retry on the next call rather than caching a failure
    return paths;
  }
  specialPathsCache = paths;
  return paths;
}

/** Folder key → real IMAP path, or a 404 the client can show. */
async function resolveFolder(key = 'inbox') {
  const paths = await resolveSpecialPaths();
  if (!(key in paths)) throw new MailError('MAIL_NO_FOLDER', 'Unknown folder.', 404);
  const path = paths[key];
  if (!path) throw new MailError('MAIL_NO_FOLDER', 'This mailbox has no such folder.', 404);
  return path;
}

/** The folder rail: which standard folders exist, with message counts. */
async function listFolders() {
  const paths = await resolveSpecialPaths();
  const client = await getClient();
  const folders = [];
  for (const [key, path] of Object.entries(paths)) {
    if (!path) continue;
    try {
      const status = await client.status(path, { messages: true, unseen: true });
      folders.push({ key, total: status.messages || 0, unread: status.unseen || 0 });
    } catch (err) {
      log.error('folder status failed', { folder: key, error: err.message });
    }
  }
  return { folders };
}

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
async function listMessages({ mailbox = INBOX, limit = 25, offset = 0, search = '', flagged = false } = {}) {
  const key = cacheKey(mailbox, limit, offset, `${search}|${flagged ? 1 : 0}`);
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
    if (search || flagged) {
      // Server-side SEARCH: OR across the fields an operator would actually
      // search, AND the \\Flagged criterion when the starred view asks for it.
      const criteria = {};
      if (flagged) criteria.flagged = true;
      if (search) criteria.or = [{ from: search }, { subject: search }, { body: search }];
      uids = await client.search(criteria);
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

function prepareAttachments(attachments = []) {
  if (attachments.length > 5) {
    throw new MailError('MAIL_TOO_MANY_ATTACHMENTS', 'At most 5 attachments are allowed.', 400);
  }
  const totalBytes = attachments.reduce((n, a) => n + (a.size || 0), 0);
  if (totalBytes > 15 * 1024 * 1024) {
    throw new MailError('MAIL_ATTACHMENTS_TOO_LARGE', 'Attachments exceed 15 MB in total.', 400);
  }
  return attachments.map((a, i) => ({
    filename: String(a.originalname || `attachment-${i + 1}`)
      .replace(/[\\/]/g, '_').replace(/[\r\n"]/g, '').slice(0, 200),
    content: a.buffer,
    contentType: a.mimetype || 'application/octet-stream',
  }));
}

async function appendToSent(info) {
  try {
    const sentPath = await resolveSentPath();
    if (sentPath && info && info.message) {
      const client = await getClient();
      await client.append(sentPath, info.message, ['\\Seen']);
    }
  } catch (err) {
    // Delivery already succeeded. Never invite a duplicate send just because
    // the provider refused to archive our copy.
    log.error('could not append outbound message to Sent', { error: err.message });
  }
}

/** Start a new conversation. This remains admin-only at the route and applies
 * strict recipient/subject/body limits so the company mailbox cannot become a
 * bulk-mail endpoint. One compose request sends exactly one message. */
async function sendMessage({ to, subject, text, attachments = [] }) {
  const recipient = String(to || '').trim();
  const title = String(subject || '').trim();
  const body = String(text || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) {
    throw new MailError('MAIL_BAD_RECIPIENT', 'Enter one valid email address.', 422);
  }
  if (!title || title.length > 200 || /[\r\n]/.test(title)) {
    throw new MailError('MAIL_BAD_SUBJECT', 'Subject is required and must be 200 characters or fewer.', 422);
  }
  if (!body) throw new MailError('MAIL_EMPTY_MESSAGE', 'A message is required.', 422);
  if (body.length > 25_000) throw new MailError('MAIL_MESSAGE_TOO_LONG', 'That message is too long to send.', 400);

  const cfg = mailConfig();
  const message = {
    from: `Sawa Cars <${cfg.user}>`, to: recipient, subject: title, text: body,
    ...(attachments.length ? { attachments: prepareAttachments(attachments) } : {}),
  };
  let info;
  try {
    info = await getTransport().sendMail(message);
  } catch (err) {
    log.error('smtp compose failed', { error: err.message });
    throw classify(err);
  }
  await appendToSent(info);
  invalidateListCache();
  return { messageId: info && info.messageId, to: recipient, subject: title };
}

/** Where does this account keep sent mail? Same resolver as the folder rail. */
async function resolveSentPath() {
  const paths = await resolveSpecialPaths();
  return paths.sent;
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
async function sendReply(uid, text, { mailbox = INBOX, attachments = [] } = {}) {
  const body = String(text || '').trim();
  if (!body) throw new MailError('MAIL_EMPTY_REPLY', 'A reply needs a message.', 400);
  if (body.length > 25_000) {
    throw new MailError('MAIL_REPLY_TOO_LONG', 'That reply is too long to send.', 400);
  }

  // Attachment discipline. Per-file size is enforced by multer at the route;
  // the TOTAL is enforced here because most receiving servers cap a whole
  // message around 25 MB and a bounce reads as "Sawa never answered".
  const mailAttachments = prepareAttachments(attachments);

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
    ...(mailAttachments.length ? { attachments: mailAttachments } : {}),
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
  await appendToSent(info);

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
  listFolders,
  resolveFolder,
  listMessages,
  getMessage,
  getAttachment,
  setFlag,
  sendMessage,
  sendReply,
  unreadCount,
  invalidateListCache,
  humanSize,
};
