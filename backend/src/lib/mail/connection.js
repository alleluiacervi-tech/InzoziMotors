const { ImapFlow } = require('imapflow');
const { log } = require('../log');

// ─────────────────────────────────────────────────────────────────────────────
// One long-lived IMAP connection, shared by every request.
//
// The obvious implementation — connect, fetch, disconnect, per request — costs
// a TLS handshake plus a LOGIN plus a SELECT on every page load (300ms–2s), and
// shared mail hosts cap concurrent IMAP connections per account. Two admins with
// three tabs each would exhaust that cap and start getting authentication
// failures that look like a wrong password.
//
// So: one connection, opened on first use, kept alive, and reused. IMAP is a
// stateful protocol with one selected mailbox per connection, so every consumer
// has to take a lock before touching it — imapflow provides that, and
// `withMailbox` below is the only sanctioned way in.
//
// ── Credentials ──────────────────────────────────────────────────────────────
// Environment only, and deliberately a DIFFERENT set from the transactional
// SMTP_* vars used by lib/mailer.js. Those two are separate identities on
// purpose: password resets come from no-reply@ (nobody reads replies), while
// this mailbox is contact@ and every reply must come FROM it and land in ITS
// Sent folder. Merging them would either send resets from the support address
// or send support replies from an address customers cannot answer.
//
//   MAIL_USER        contact@sawacars.com
//   MAIL_PASS        the mailbox password
//   MAIL_IMAP_HOST   imap.hostinger.com
//   MAIL_IMAP_PORT   993 (default)
//   MAIL_SMTP_HOST   smtp.hostinger.com
//   MAIL_SMTP_PORT   465 (default)
//
// Nothing in this directory logs MAIL_PASS, and nothing returns it to a client.
// ─────────────────────────────────────────────────────────────────────────────

/** Distinct codes so the UI can tell "the mail host is down" from "the password
 *  is wrong" from "there is no mail" — three states that look identical if you
 *  only pass a message through. */
class MailError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'MailError';
    this.code = code;
    this.status = status;
  }
}

const MAIL_UNREACHABLE = 'MAIL_UNREACHABLE';
const MAIL_AUTH_FAILED = 'MAIL_AUTH_FAILED';
const MAIL_NOT_CONFIGURED = 'MAIL_NOT_CONFIGURED';
const MAIL_TIMEOUT = 'MAIL_TIMEOUT';

function mailConfig() {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;
  if (!user || !pass) return null;
  return {
    user,
    pass,
    imapHost: process.env.MAIL_IMAP_HOST || 'imap.hostinger.com',
    imapPort: parseInt(process.env.MAIL_IMAP_PORT || '993', 10),
    smtpHost: process.env.MAIL_SMTP_HOST || 'smtp.hostinger.com',
    smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '465', 10),
  };
}

/** True when a mailbox is configured. Routes 503 rather than 500 when it isn't,
 *  because "not set up" is not a crash. */
function mailboxConfigured() {
  return mailConfig() !== null;
}

let client = null;
let connecting = null;

/**
 * Classify a connection failure. imapflow surfaces authentication problems as
 * an error with authenticationFailed set, or a message containing AUTHENTICATE;
 * everything else at connect time is the host being unreachable.
 *
 * This distinction is the whole point: a wrong password is a thing an admin can
 * fix, and a dead host is a thing they must wait out. Reporting both as "mail
 * error" makes the operator guess.
 */
function classify(err) {
  const msg = String(err && err.message ? err.message : err);
  if (err && err.authenticationFailed) {
    return new MailError(MAIL_AUTH_FAILED, 'The mail server rejected the mailbox credentials.', 502);
  }
  if (/AUTHENTICATE|Invalid credentials|LOGIN failed|authentication/i.test(msg)) {
    return new MailError(MAIL_AUTH_FAILED, 'The mail server rejected the mailbox credentials.', 502);
  }
  if (/timed? ?out|ETIMEDOUT/i.test(msg)) {
    return new MailError(MAIL_TIMEOUT, 'The mail server did not respond in time.', 504);
  }
  return new MailError(MAIL_UNREACHABLE, 'Could not reach the mail server.', 502);
}

async function connect() {
  const cfg = mailConfig();
  if (!cfg) {
    throw new MailError(
      MAIL_NOT_CONFIGURED,
      'No mailbox is configured. Set MAIL_USER and MAIL_PASS.',
      503
    );
  }

  const next = new ImapFlow({
    host: cfg.imapHost,
    port: cfg.imapPort,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    // imapflow logs the full IMAP conversation at info level by default, which
    // includes the LOGIN command. Silenced, and failures are logged by us
    // without the credential.
    logger: false,
    // Keep the socket alive through NAT timeouts rather than discovering it is
    // dead on the next request.
    socketTimeout: 60_000,
    greetingTimeout: 15_000,
    connectionTimeout: 15_000,
  });

  // A dropped connection must not poison the cached handle: clear it so the next
  // request reconnects instead of writing into a closed socket forever.
  next.on('error', (err) => {
    log.error('imap connection error', { error: err.message });
    if (client === next) client = null;
  });
  next.on('close', () => {
    if (client === next) client = null;
  });

  try {
    await next.connect();
  } catch (err) {
    log.error('imap connect failed', { error: err.message, host: cfg.imapHost });
    throw classify(err);
  }
  return next;
}

/** The shared connection, opened on demand. Concurrent callers await the same
 *  in-flight connect rather than opening several. */
async function getClient() {
  if (client && client.usable) return client;
  if (!connecting) {
    connecting = connect()
      .then((c) => { client = c; return c; })
      .finally(() => { connecting = null; });
  }
  return connecting;
}

/**
 * Run `fn` with a mailbox selected and locked.
 *
 * The lock is not optional. IMAP has ONE selected mailbox per connection, so two
 * concurrent requests sharing this connection would otherwise fetch from
 * whichever mailbox the other one selected last — returning another folder's
 * messages under the caller's UIDs. imapflow's getMailboxLock serialises that.
 */
async function withMailbox(path, fn) {
  const c = await getClient();
  let lock;
  try {
    lock = await c.getMailboxLock(path);
  } catch (err) {
    // A failure here is usually the connection dying between getClient and the
    // lock. Drop the handle so the next attempt reconnects.
    if (client === c) client = null;
    throw classify(err);
  }
  try {
    return await fn(c);
  } finally {
    lock.release();
  }
}

/** Close the shared connection. Used by tests and shutdown, not by requests. */
async function closeMail() {
  const c = client;
  client = null;
  if (c && c.usable) {
    try { await c.logout(); } catch { /* already gone */ }
  }
}

module.exports = {
  MailError,
  MAIL_UNREACHABLE,
  MAIL_AUTH_FAILED,
  MAIL_NOT_CONFIGURED,
  MAIL_TIMEOUT,
  mailConfig,
  mailboxConfigured,
  classify,
  getClient,
  withMailbox,
  closeMail,
};
