const net = require('net');

// ─────────────────────────────────────────────────────────────────────────────
// Who is on the other end of a request.
//
// req.ip is already the visitor's address: Caddy strips any client-sent
// X-Forwarded-For and writes the one address it settled on (the Cloudflare
// visitor, or the connecting address), and Express trusts exactly that hop
// (server.js, trust proxy 1). The website's server forwards its own visitor's
// address the same way when it calls this API on their behalf (web
// src/lib/api.ts), so a web sign-in is not recorded as the web container.
//
// The country is Cloudflare's CF-IPCountry. Caddy removes that header from any
// request that did not come through Cloudflare (ops/caddy/sawacars.Caddyfile),
// so it cannot be typed in by someone calling the server directly. It is
// Cloudflare's estimate, shown to the team as such. "T1" means Tor.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeIp(value) {
  if (!value) return null;
  let ip = String(value).trim();
  if (ip.startsWith('::ffff:') && net.isIPv4(ip.slice(7))) ip = ip.slice(7);
  return net.isIP(ip) ? ip : null;
}

// Loopback, private and link-local ranges: this server's own containers (the
// website when it did not forward a visitor), development and tests. Never a
// visitor, so never a reason to suspect one.
const INTERNAL = new net.BlockList();
INTERNAL.addSubnet('127.0.0.0', 8, 'ipv4');
INTERNAL.addSubnet('10.0.0.0', 8, 'ipv4');
INTERNAL.addSubnet('172.16.0.0', 12, 'ipv4');
INTERNAL.addSubnet('192.168.0.0', 16, 'ipv4');
INTERNAL.addSubnet('169.254.0.0', 16, 'ipv4');
INTERNAL.addAddress('::1', 'ipv6');
INTERNAL.addSubnet('fc00::', 7, 'ipv6');
INTERNAL.addSubnet('fe80::', 10, 'ipv6');

function isInternalIp(ip) {
  if (!ip) return false;
  return INTERNAL.check(ip, net.isIPv6(ip) ? 'ipv6' : 'ipv4');
}

function clientIp(req) {
  return normalizeIp(req.ip || (req.socket && req.socket.remoteAddress));
}

function clientCountry(req) {
  const raw = String(req.headers['cf-ipcountry'] || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]$/.test(raw) || raw === 'XX') return null;
  return raw;
}

function clientAgent(req) {
  const ua = String(req.headers['user-agent'] || '').trim();
  return ua ? ua.slice(0, 300) : null;
}

module.exports = { normalizeIp, isInternalIp, clientIp, clientCountry, clientAgent };
