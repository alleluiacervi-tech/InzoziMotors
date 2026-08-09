const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const { log } = require('../lib/log');
const {
  MailError, mailboxConfigured, MAIL_NOT_CONFIGURED,
} = require('../lib/mail/connection');
const {
  listFolders, resolveFolder, listMessages, getMessage, getAttachment,
  setFlag, sendReply, unreadCount,
} = require('../lib/mail/mailbox');

// Reply attachments ride in memory to nodemailer — never the disk, so nothing
// to clean up and nothing an upload can overwrite. Per-file cap here; the
// 15 MB total is enforced in sendReply where the whole message is assembled.
const replyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 8 * 1024 * 1024 },
});

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// The contact@ mailbox, for admins only.
//
// Every route is requireAdmin. Nothing here is reachable by a buyer or seller,
// and the browser never speaks to the mail server — the IMAP and SMTP
// conversations happen in this process, with credentials that exist only in the
// environment.
// ─────────────────────────────────────────────────────────────────────────────

// Outbound mail is a spam vector and this is the company's real address: a
// runaway loop or a careless script here gets sawacars.com blacklisted, which
// takes days to undo and breaks password resets on the way. Deliberately tight —
// a human answering mail does not send 30 replies a minute.
const replyLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many replies sent. Wait a minute.', code: 'MAIL_RATE_LIMITED' },
});

/**
 * One error shape for every mail failure, so the client can branch on `code`
 * instead of pattern-matching prose.
 *
 * The distinction that matters most: MAIL_UNREACHABLE and MAIL_AUTH_FAILED must
 * never be presented as an empty inbox. That confusion is exactly the bug this
 * dashboard already had on seven other pages.
 */
function fail(res, err, where) {
  if (err instanceof MailError) {
    if (err.code !== 'MAIL_NOT_FOUND') {
      log.error(`mail ${where} failed`, { code: err.code, error: err.message });
    }
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  log.error(`mail ${where} error`, { error: err.message });
  return res.status(502).json({
    error: 'The mailbox could not be read.',
    code: 'MAIL_UNREACHABLE',
  });
}

/** 503 with a named code when no mailbox is configured, so the UI can say "not
 *  set up yet" rather than "broken". */
function requireMailbox(req, res, next) {
  if (!mailboxConfigured()) {
    return res.status(503).json({
      error: 'No mailbox is configured on the server.',
      code: MAIL_NOT_CONFIGURED,
    });
  }
  next();
}

/** Clamping is right for PAGINATION: ?limit=500 should quietly become 100. */
const clampInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
};

/**
 * Clamping is WRONG for an IDENTIFIER, and this is a separate function because
 * using clampInt here was a real bug: clampInt('0', NaN, 1, MAX) returns 1, so
 * GET /mail/messages/0 silently opened message 1 — the admin reads a different
 * message from the one they asked for, and /messages/-5 did the same. An id that
 * is not a positive integer has no nearest valid value; it is a bad request.
 *
 * Returns null for anything that is not a plain positive integer, including
 * "12abc", "1e3", "0", "-1" and " 12" — IMAP UIDs are unsigned and 32-bit.
 */
const parseUid = (v) => {
  if (!/^[0-9]+$/.test(String(v))) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 4294967295) return null;
  return n;
};

/** Attachment index: zero IS valid here, so it has its own bounds. */
const parseIndex = (v) => {
  if (!/^[0-9]+$/.test(String(v))) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 200) return null;
  return n;
};

/** Folder KEYS are the whole client vocabulary — raw IMAP paths never cross
 *  this boundary in either direction. */
const FOLDER_KEYS = ['inbox', 'sent', 'drafts', 'junk', 'trash'];
const parseFolder = (v) => {
  const key = String(v || 'inbox').toLowerCase();
  return FOLDER_KEYS.includes(key) ? key : null;
};

// GET /mail/folders — the rail: which standard folders exist, with counts
router.get('/folders', requireAdmin, requireMailbox, async (req, res) => {
  try {
    res.json(await listFolders());
  } catch (err) {
    fail(res, err, 'folders');
  }
});

// GET /mail/messages — envelope list, newest first.
// ?folder=inbox|sent|drafts|junk|trash, ?starred=1 for the flagged view.
router.get('/messages', requireAdmin, requireMailbox, async (req, res) => {
  const limit = clampInt(req.query.limit, 25, 1, 100);
  const offset = clampInt(req.query.offset, 0, 0, 100_000);
  const search = String(req.query.q || '').trim().slice(0, 200);
  const folder = parseFolder(req.query.folder);
  if (folder === null) return res.status(400).json({ error: 'Unknown folder' });
  const flagged = req.query.starred === '1';
  try {
    const mailbox = await resolveFolder(folder);
    res.json({ ...(await listMessages({ mailbox, limit, offset, search, flagged })), folder });
  } catch (err) {
    fail(res, err, 'list');
  }
});

// GET /mail/unread — just the badge count
router.get('/unread', requireAdmin, requireMailbox, async (req, res) => {
  try {
    res.json(await unreadCount());
  } catch (err) {
    fail(res, err, 'unread');
  }
});

// GET /mail/messages/:uid — one message, sanitised, marked read.
// UIDs are PER-FOLDER in IMAP, so the folder must travel with the uid.
router.get('/messages/:uid', requireAdmin, requireMailbox, async (req, res) => {
  const uid = parseUid(req.params.uid);
  if (uid === null) return res.status(400).json({ error: 'Invalid message id' });
  const folder = parseFolder(req.query.folder);
  if (folder === null) return res.status(400).json({ error: 'Unknown folder' });
  // Opt-in only: remote images are tracking pixels until the admin says otherwise.
  const loadRemoteImages = req.query.images === '1';
  const markSeen = req.query.peek !== '1';
  try {
    const mailbox = await resolveFolder(folder);
    res.json(await getMessage(uid, { mailbox, markSeen, loadRemoteImages }));
  } catch (err) {
    fail(res, err, 'get');
  }
});

// GET /mail/messages/:uid/attachments/:index — streamed download
router.get('/messages/:uid/attachments/:index', requireAdmin, requireMailbox, async (req, res) => {
  const uid = parseUid(req.params.uid);
  const index = parseIndex(req.params.index);
  if (uid === null || index === null) {
    return res.status(400).json({ error: 'Invalid attachment reference' });
  }
  const folder = parseFolder(req.query.folder);
  if (folder === null) return res.status(400).json({ error: 'Unknown folder' });
  try {
    const att = await getAttachment(uid, index, { mailbox: await resolveFolder(folder) });
    // ALWAYS an attachment, never inline. An HTML or SVG attachment rendered
    // inline would execute in the dashboard's origin — the sanitiser only
    // protects the message body, not a file the admin opens.
    res.setHeader('Content-Disposition',
      `attachment; filename="${att.filename}"`);
    // And never let the browser second-guess the type into something scriptable.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Content-Length', String(att.size));
    res.send(att.content);
  } catch (err) {
    fail(res, err, 'attachment');
  }
});

// PATCH /mail/messages/:uid/flags — mark read/unread, flag/unflag
router.patch('/messages/:uid/flags', requireAdmin, requireMailbox, async (req, res) => {
  const uid = parseUid(req.params.uid);
  if (uid === null) return res.status(400).json({ error: 'Invalid message id' });
  const { flag, value } = req.body || {};
  if (!['seen', 'flagged'].includes(flag)) {
    return res.status(400).json({ error: 'flag must be seen or flagged' });
  }
  const folder = parseFolder(req.body?.folder);
  if (folder === null) return res.status(400).json({ error: 'Unknown folder' });
  try {
    await setFlag(uid, flag, Boolean(value), { mailbox: await resolveFolder(folder) });
    res.json({ ok: true, flag, value: Boolean(value) });
  } catch (err) {
    fail(res, err, 'flag');
  }
});

// POST /mail/messages/:uid/reply — reply in-thread to the sender, with
// optional attachments (multipart; ≤5 files, ≤8 MB each, ≤15 MB together).
//
// INBOX only, structurally: in Sent the "sender" is contact@ itself and in
// Drafts there may be no recipient at all — replying only means anything to a
// message someone sent US.
router.post(
  '/messages/:uid/reply',
  requireAdmin,
  requireMailbox,
  replyLimiter,
  (req, res, next) => replyUpload.array('attachments', 5)(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Each attachment must be 8 MB or smaller.'
        : 'Attachments could not be read.';
      return res.status(400).json({ error: msg, code: 'MAIL_BAD_ATTACHMENT' });
    }
    next();
  }),
  async (req, res) => {
    const uid = parseUid(req.params.uid);
    if (uid === null) return res.status(400).json({ error: 'Invalid message id' });
    const { text } = req.body || {};
    try {
      const sent = await sendReply(uid, text, { attachments: req.files || [] });
      log.info('mail reply sent', {
        uid, to: sent.to, attachments: (req.files || []).length,
      });
      res.status(201).json(sent);
    } catch (err) {
      fail(res, err, 'reply');
    }
  }
);

module.exports = router;
