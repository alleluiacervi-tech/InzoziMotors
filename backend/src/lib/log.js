const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// Logging and error reporting.
//
// The API logged with bare console.error(err.stack) into Docker's json-file
// driver with no rotation, no request context and no severity — so "did the
// deploy break checkout?" could only be answered by reading a wall of stack
// traces and guessing which belonged together. There was no crash reporting at
// all, on any of the four surfaces.
//
// Two deliberate choices:
//
//   No logging library. JSON on stdout is what every log shipper already
//   understands, and the container runtime is doing the collection. A
//   dependency here would buy formatting we do not need.
//
//   No error-tracking vendor. Picking one is a business decision, so this
//   exposes a single reportError() seam instead. Wire Sentry (or anything
//   else) to it in one place, or leave it and the errors still reach the logs
//   with full context.
//
// Development gets readable lines; production gets one JSON object per line.
// ─────────────────────────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] || (IS_TEST ? LEVELS.error : LEVELS.info);

// Anything that must never reach a log line, whatever nests it.
const REDACTED = new Set([
  'password', 'current_password', 'new_password', 'password_hash',
  'token', 'jwt', 'authorization', 'sig', 'code', 'secret',
  'id_front_url', 'id_back_url', 'selfie_url',
]);

/** Recursively strips credentials and identity-document URLs. A log line is
 *  the easiest place in a system to leak a secret by accident. */
function redact(value, depth = 0) {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = REDACTED.has(key.toLowerCase()) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

function emit(level, message, context = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const entry = {
    level,
    msg: message,
    time: new Date().toISOString(),
    ...redact(context),
  };
  const line = IS_PRODUCTION
    ? JSON.stringify(entry)
    : `${level.toUpperCase().padEnd(5)} ${message}` +
      (Object.keys(entry).length > 3 ? ` ${JSON.stringify(redact(context))}` : '');
  (level === 'error' ? console.error : console.log)(line);
}

const log = {
  debug: (msg, ctx) => emit('debug', msg, ctx),
  info: (msg, ctx) => emit('info', msg, ctx),
  warn: (msg, ctx) => emit('warn', msg, ctx),
  error: (msg, ctx) => emit('error', msg, ctx),
};

// ─── Error reporting seam ────────────────────────────────────────────────────
// Replace this with a real reporter and every handled error in the codebase
// starts flowing to it, without touching a single call site:
//
//   const Sentry = require('@sentry/node');
//   Sentry.init({ dsn: process.env.SENTRY_DSN });
//   setErrorReporter((err, ctx) => Sentry.captureException(err, { extra: ctx }));
let reporter = null;

function setErrorReporter(fn) {
  reporter = typeof fn === 'function' ? fn : null;
}

/**
 * Records an error. Always logs; additionally forwards to the configured
 * reporter. Never throws — a failing error reporter must not become the error.
 */
function reportError(err, context = {}) {
  log.error(err?.message || String(err), {
    ...context,
    stack: err?.stack,
    code: err?.code,
  });
  if (reporter) {
    try {
      reporter(err, redact(context));
    } catch (reportingError) {
      log.error('error reporter failed', { cause: reportingError.message });
    }
  }
}

// ─── Request logging ─────────────────────────────────────────────────────────
/**
 * Assigns each request an id and logs one line when it completes. The id goes
 * out on the response too, so a user reporting "it failed at 14:32" can be
 * matched to the exact request rather than a time range.
 */
function requestLogger(req, res, next) {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  res.set('X-Request-Id', req.id);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    // 4xx is the client's problem and 5xx is ours — different severities so
    // "show me only real failures" is a filter rather than a reading exercise.
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    emit(level, `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode}`, {
      requestId: req.id,
      status: res.statusCode,
      durationMs: Math.round(ms),
      userId: req.user?.id,
      ip: req.ip,
    });
  });
  next();
}

module.exports = { log, reportError, setErrorReporter, requestLogger, redact };
