require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { log, reportError, requestLogger } = require('./src/lib/log');
const { parseConfiguredOrigin } = require('./src/lib/public-origin');

const app = express();
const server = http.createServer(app);

// Node's historical defaults allow a peer to keep a socket or incomplete
// request around for minutes. A small number of slow connections can then tie
// up every worker before any application rate limit runs. These values leave
// ample room for a mobile photo upload on a normal connection while making
// resource use bounded. Keep headers below requestTimeout as required by Node.
server.headersTimeout = 65_000;
server.requestTimeout = 120_000;
server.keepAliveTimeout = 5_000;

// Nginx terminates TLS in front of this process, so without trust proxy every
// request appears to come from 127.0.0.1 — which would collapse all rate limits
// below into a single shared bucket for the entire internet.
app.set('trust proxy', 1);

// ─── Security headers ─────────────────────────────────────────────────────────
// This API serves JSON and, from /uploads, listing photographs — never HTML.
// CSP is therefore left off (nothing here is a document), but nosniff, frame
// denial and referrer policy all matter: an uploaded image must never be
// re-interpreted as script, and the KYC document route must never leak its URL
// through a Referer header.
app.use(helmet({
  contentSecurityPolicy: false,
  // Photos are loaded cross-origin by the website, the admin dashboard and the
  // app; the default 'same-origin' would break every listing image.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── Startup configuration checks ─────────────────────────────────────────────
// The documented deploy flow is `cp .env.example .env`, which means every
// development default is one forgotten edit away from production. These checks
// make that forgetting loud instead of silent: the process refuses to start
// rather than serving traffic with a known secret or an open CORS policy.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function assertProductionConfig() {
  const problems = [];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    problems.push('JWT_SECRET is not set.');
  } else if (secret.length < 32) {
    problems.push('JWT_SECRET is shorter than 32 characters.');
  } else if (/dev|change|secret_here|example|test/i.test(secret)) {
    problems.push('JWT_SECRET still looks like the example value.');
  }

  if (!process.env.DB_PASSWORD) {
    problems.push('DB_PASSWORD is not set.');
  } else if (process.env.DB_PASSWORD === 'sawa_dev') {
    problems.push('DB_PASSWORD is still the development default.');
  }

  const origins = process.env.CORS_ORIGINS;
  if (!origins || origins.split(',').map((s) => s.trim()).includes('*')) {
    problems.push('CORS_ORIGINS is unset or "*" — list the real origins explicitly.');
  }

  // Documented as local-only, but a stray export would hand every account,
  // admin included, to any unauthenticated caller.
  if (process.env.RESET_CODE_ECHO === 'true') {
    problems.push('RESET_CODE_ECHO must not be enabled in production.');
  }

  try {
    const publicApiOrigin = parseConfiguredOrigin(process.env.PUBLIC_API_URL);
    if (!publicApiOrigin) {
      problems.push('PUBLIC_API_URL is not set. Use the browser-reachable API origin.');
    } else if (!publicApiOrigin.startsWith('https://')) {
      problems.push('PUBLIC_API_URL must use HTTPS in production.');
    }
  } catch (err) {
    problems.push(err.message);
  }

  if (problems.length) {
    console.error('\nRefusing to start in production with unsafe configuration:');
    for (const p of problems) console.error('  •', p);
    console.error('\nFix these in the environment, then restart.\n');
    process.exit(1);
  }
}

if (IS_PRODUCTION) {
  assertProductionConfig();
} else if (!process.env.JWT_SECRET) {
  // Outside production a missing secret is not fatal, but every token signed
  // with `undefined` throws deep inside jsonwebtoken with an opaque message.
  console.warn('⚠  JWT_SECRET is not set — authentication will fail. Copy .env.example to .env.');
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// `credentials: true` alongside `origin: '*'` is a combination browsers reject
// outright, so the wildcard path deliberately drops it rather than shipping a
// policy that only appears to work.
const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
const allowAnyOrigin = allowedOrigins.includes('*');
app.use(cors({
  origin: allowAnyOrigin ? '*' : allowedOrigins,
  credentials: !allowAnyOrigin,
}));

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
  },
});
require('./src/socket')(io);
// Routes broadcast through the same io instance (REST is the single write
// path for chat; the socket layer is delivery only — see routes/messages.js).
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
// Request logging first, so even a request rejected by the body parser or a
// rate limiter still produces a line with its id and status.
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded car photos publicly; KYC identity docs and sale contracts are
// NEVER served here — they go through admin-gated routes
// (GET /id-verification/doc/:filename and GET /contracts/:id/file).
// Both 403s are mounted BEFORE the static handler so they win.
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads/id-docs', (req, res) => res.status(403).json({ error: 'Forbidden' }));
app.use('/uploads/contracts', (req, res) => res.status(403).json({ error: 'Forbidden' }));
app.use('/uploads/documents', (req, res) => res.status(403).json({ error: 'Forbidden' }));
app.use('/uploads', express.static(uploadDir));

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Three tiers, because the endpoints differ in what abuse of them costs.
//
// /auth/login and /auth/register verify or produce a bcrypt hash at cost 12 —
// roughly a quarter-second of CPU each. That makes them both the credential
// stuffing target AND the cheapest denial-of-service in the codebase: a few
// requests a second saturates a core with no attacker effort at all.
//
// The password-reset endpoints already throttle per account (one code a minute,
// five wrong guesses burns it). What they lacked was a per-IP ceiling, without
// which one address can enumerate accounts or mail-bomb a user's inbox.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Failed attempts are what we are limiting; a person who signs in correctly
  // ten times in a quarter hour is not the problem.
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please wait an hour and try again.' },
});

// Everything else. Generous on purpose — browse is the product, and a shared
// office or a carrier-grade NAT in Kigali puts many real users behind one IP.
// This is a runaway-script backstop, not a usage policy.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// UGC and upload writes: fast enough for any human, slow enough that one
// account cannot flood chats, reviews, the moderation queue, or the KYC
// upload directory before the global backstop notices. GETs are unaffected.
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
const postOnly = (limiter) => (req, res, next) =>
  (req.method === 'POST' ? limiter(req, res, next) : next());

app.use(globalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/change-password', authLimiter);
app.use('/auth/accept-showroom-invite', authLimiter);
app.use('/auth/accept-invite', authLimiter);
app.use('/auth/forgot-password', resetLimiter);
app.use('/auth/reset-password', resetLimiter);
app.use('/messages', postOnly(writeLimiter));
app.use('/reviews', postOnly(writeLimiter));
app.use('/disputes', postOnly(writeLimiter));
app.use('/id-verification', postOnly(writeLimiter));

const transactionFeatureRetired = (req, res, next) => {
  if (['GET', 'HEAD'].includes(req.method)) return next();
  return res.status(410).json({
    error: 'Sawa no longer creates or manages buyer-seller transactions. Contact the other party directly.',
    code: 'DIRECT_DEAL_MARKETPLACE',
  });
};

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth',            require('./src/routes/auth'));
app.use('/cars',            require('./src/routes/cars'));
app.use('/submissions',     require('./src/routes/submissions'));
// Historical records remain readable, but no new handover, sale contract or
// transaction dispute can be created or advanced.
app.use('/handovers', transactionFeatureRetired, require('./src/routes/handovers'));
app.use('/contracts', transactionFeatureRetired, require('./src/routes/contracts'));
app.use('/messages',        require('./src/routes/messages'));
app.use('/notifications',   require('./src/routes/notifications'));
app.use('/inspections',     require('./src/routes/inspections'));
app.use('/id-verification', require('./src/routes/id-verification'));
app.use('/saved-searches',  require('./src/routes/saved-searches'));
app.use('/reviews', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/') return transactionFeatureRetired(req, res, next);
  next();
}, require('./src/routes/reviews'));
app.use('/rentals',         require('./src/routes/rentals'));
app.use('/referrals',       require('./src/routes/referrals'));
app.use('/disputes', (req, res, next) => req.method === 'POST'
  ? transactionFeatureRetired(req, res, next) : next(), require('./src/routes/disputes'));
app.use('/devices',         require('./src/routes/devices'));
// Mounted ahead of /admin so the pipeline reads keep their own module rather
// than growing the admin router further. Both are admin-gated identically.
app.use('/admin/journey',   require('./src/routes/journey'));
app.use('/admin',           require('./src/routes/admin'));
app.use('/imports',         require('./src/routes/imports'));
// Inspection centers. Admin-only CRUD over the table submissions.js already
// enforces booking capacity against — see the header of routes/centers.js.
app.use('/centers',         require('./src/routes/centers'));
// The platform USD/RWF rate — public display data, cached and provenance-
// stamped. See src/lib/fx.js for the provider chain.
// Explicit retirement response for installed app versions that still contain
// the old hosted-checkout screen. No payment provider is called or mounted.
app.use('/payments', (_req, res) => res.status(410).json({
  error: 'Payments are not processed by Sawa Cars. Buyers and providers arrange transactions independently.',
  code: 'PAYMENTS_RETIRED',
}));
app.use('/fx',              require('./src/routes/fx'));
// The contact@ mailbox, read over IMAP and answered over SMTP. Admin-only;
// see src/lib/mail/ for why it is a live read rather than a synced copy.
app.use('/mail',            require('./src/routes/mail'));

// ─── Health ───────────────────────────────────────────────────────────────────
// Two endpoints, because "is the process up?" and "can it serve a request?" are
// different questions and were previously answered by the same 200.
//
// /health answered OK while Postgres was unreachable, so every uptime monitor
// and load balancer would report green through a total outage — the one moment
// the check exists for.
const pool = require('./src/db');

// Liveness: is this process running? Cheap, no dependencies. Restart on failure.
app.get('/health', (req, res) => {
  // No env echo: which mode the server runs in is fingerprinting data, and
  // nothing that monitors this endpoint ever needed it.
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Readiness: can it actually do its job? Fails with 503 when the database is
// unreachable, which is what a monitor should page on.
app.get('/health/ready', async (req, res) => {
  const started = Date.now();
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'up',
      latency_ms: Date.now() - started,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error('readiness check failed:', err.message);
    res.status(503).json({
      status: 'degraded',
      database: 'unreachable',
      ts: new Date().toISOString(),
    });
  }
});

// ─── 404 & error handler ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  // Multer and file-filter errors are client mistakes, not server faults
  if (err && (err.name === 'MulterError' || /image files/i.test(err.message || ''))) {
    return res.status(400).json({ error: err.message });
  }
  reportError(err, {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    userId: req.user?.id,
  });
  // The request id goes back with the error so a support conversation can
  // start from "here is the exact request" rather than an approximate time.
  res.status(500).json({ error: 'Internal server error', requestId: req.id });
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Only when run directly. Required as a module — which is how the test suite
// drives it — the app is returned without binding a port, so tests need no
// free port, no startup race and no teardown of a stray listener.
const PORT = parseInt(process.env.PORT || '3000');

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    log.info('Sawa API listening', { port: PORT, env: process.env.NODE_ENV || 'development' });
  });

  // A rejected promise nobody caught used to vanish, or take the process down
  // with a bare stack trace depending on the Node flags. Either way nothing
  // recorded it. Both handlers report, and only an uncaught exception — which
  // leaves the process in an unknown state — exits so the supervisor restarts.
  process.on('unhandledRejection', (reason) => {
    reportError(reason instanceof Error ? reason : new Error(String(reason)), {
      fatal: false,
      source: 'unhandledRejection',
    });
  });

  process.on('uncaughtException', (err) => {
    reportError(err, { fatal: true, source: 'uncaughtException' });
    // Stop accepting new work, give in-flight requests a moment, then go.
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
  });

  // Docker and systemd both send SIGTERM. Draining beats being killed
  // mid-transaction on every deploy.
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      log.info('shutting down', { signal });
      server.close(() => {
        pool.end().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(0), 10000).unref();
    });
  }
}

module.exports = { app, server, io };
