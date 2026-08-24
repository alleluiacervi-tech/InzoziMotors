function parseConfiguredOrigin(raw) {
  if (!raw || !String(raw).trim()) return null;

  let parsed;
  try {
    parsed = new URL(String(raw).trim());
  } catch {
    throw new Error('PUBLIC_API_URL must be a valid absolute URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('PUBLIC_API_URL must use http or https');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('PUBLIC_API_URL must be an origin without credentials, query parameters, or a fragment');
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error('PUBLIC_API_URL must not contain a path');
  }

  return parsed.origin;
}

function firstForwarded(req, name) {
  const value = req.get?.(name) || req.headers?.[name.toLowerCase()];
  return String(value || '').split(',')[0].trim();
}

/**
 * The browser-reachable API origin.
 *
 * Web and admin server components call the API over Docker as `api:3000`.
 * That internal host is correct for the request transport and invalid in a URL
 * persisted for a phone or browser. Production therefore always supplies the
 * canonical public origin explicitly. Forwarded/request headers remain a
 * development convenience only.
 */
function publicApiOrigin(req) {
  const configured = parseConfiguredOrigin(process.env.PUBLIC_API_URL);
  if (configured) return configured;

  const host = firstForwarded(req, 'x-forwarded-host') || req.get?.('host');
  const protocol = firstForwarded(req, 'x-forwarded-proto') || req.protocol || 'http';
  if (!host) throw new Error('Unable to determine the public API host');
  return `${protocol}://${host}`.replace(/\/$/, '');
}

module.exports = { parseConfiguredOrigin, publicApiOrigin };
