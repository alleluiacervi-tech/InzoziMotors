const express = require('express');
const rateLimit = require('express-rate-limit');
const { log } = require('../lib/log');

const router = express.Router();

// JavaScript errors from the mobile app, as one structured log line each.
//
// Until now an app crash left no trace: ErrorBoundary only wrote to the phone's
// own console, and nothing anywhere recorded that it had happened. This is the
// smallest thing that fixes that without a vendor — it lands in the same logs
// as every API error, with the app version and update id, so "which release
// broke it" is answerable. It is not a replacement for a native crash reporter
// (that comes with the next store build); it covers what JavaScript can see.
//
// Deliberately unauthenticated — a crash can happen before sign-in — so it is
// bounded instead: a tight per-IP limit, hard size caps, and no user data. The
// app sends the error and the build, never the account or anything typed.
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports.' },
});

const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : undefined);

router.post('/', limiter, (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = clip(body.message, 500);
  if (!message) return res.status(400).json({ error: 'message is required' });
  log.error('mobile client error', {
    clientMessage: message,
    stack: clip(body.stack, 4000),
    where: clip(body.where, 100),
    appVersion: clip(body.appVersion, 30),
    updateId: clip(body.updateId, 64),
    platform: clip(body.platform, 20),
    osVersion: clip(body.osVersion, 30),
    fatal: body.fatal === true,
  });
  res.status(204).end();
});

module.exports = router;
