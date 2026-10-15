# Cloudflare in front of sawacars.com

Why: the server is in Frankfurt and most visitors are in Rwanda. Cloudflare has
a data centre in Kigali, so with its proxy on, the connection and TLS handshake
finish in Kigali and photos are served from there instead of crossing to Europe
on every request. The API itself answers in 10–30 ms; the rest is distance.

Plan: **Free** is enough. Nothing here needs a paid feature.

Status: **live since 15 Oct 2026** (zone active, nameservers
`magdalena`/`paul.ns.cloudflare.com`, registrar Hostinger). The Caddy file is
installed; SSL Full (strict), Always Use HTTPS off, Bot Fight Mode and AI
Labyrinth off, Rocket Loader off, Email Obfuscation off, Minimum TLS 1.2.
The steps below are kept for a rebuild or a rollback.

**Bot Fight Mode must stay off**: it challenges non-browser clients, which
includes the mobile app's API calls.

---

## 0. Before switching: install the new Caddy file (on the VPS)

`ops/caddy/sawacars.Caddyfile` now reads the visitor's address from
`CF-Connecting-IP`, but **only** when the connection comes from Cloudflare's
published ranges. Without it, every visitor behind the same Cloudflare location
would share one rate-limit bucket and be locked out together. It is safe to
install before Cloudflare exists: nothing matches, behaviour is unchanged.

```bash
cd /srv/sawa                                          # the checkout the deploy updates
sudo cp /etc/caddy/sites/sawacars.Caddyfile /root/sawacars.Caddyfile.bak-$(date +%F)
sudo cp ops/caddy/sawacars.Caddyfile /etc/caddy/sites/sawacars.Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile     # must say "Valid configuration"
sudo systemctl reload caddy                            # only after validate passes
```

Keep the backup **outside** `/etc/caddy/sites/`: the main Caddyfile has
`import sites/*`, so a copy left in that folder is loaded too and validation
fails with `ambiguous site definition` (and Caddy would not start on reboot).

The other project's blocks on this host are not touched.

Also check the **`VPS_HOST`** GitHub secret: it must be the IP
`152.239.122.192` (or a hostname that stays *DNS only*). Cloudflare's proxy
carries HTTP only, so SSH to a proxied name fails and deploys stop.

## 1. Add the site to Cloudflare

1. dash.cloudflare.com → **Add a domain** → `sawacars.com` → Free plan.
2. Cloudflare imports the existing DNS records. **Compare them with the
   registrar's list before going on**; anything it missed must be added by hand.

| Record | Proxy |
|---|---|
| `A sawacars.com → 152.239.122.192` | **Proxied** (orange) |
| `A www → 152.239.122.192` (or CNAME) | **Proxied** |
| `A api → 152.239.122.192` | **Proxied** |
| `A admin → 152.239.122.192` | **Proxied** |
| `MX`, `TXT` (SPF, DMARC, Google/Apple verification) | n/a |
| Resend DKIM records (`resend._domainkey`, `send` MX/TXT) | **DNS only** (grey) |
| Anything for mail (IMAP/SMTP host for `contact@`) | **DNS only** |
| Any name used for SSH | **DNS only** |

A mail record set to Proxied breaks mail. When in doubt, grey.

## 2. Settings (before changing nameservers)

- **SSL/TLS → Overview: Full (strict).** Caddy already has real certificates.
  Never "Flexible": it loops with Caddy's HTTPS redirect.
- **SSL/TLS → Edge Certificates → Always Use HTTPS: Off.** Caddy redirects to
  HTTPS itself and keeps the ACME challenge path open, which is how its
  certificates renew. Turning this on can stop renewal.
- **Speed → Optimization:** Rocket Loader **Off** (it rewrites scripts and
  breaks Next.js). Leave Brotli and HTTP/3 on.
- **Scrape Shield → Email Address Obfuscation: Off.** It rewrites email
  addresses in the HTML, which makes React's hydration fail on pages that show
  one.
- **Network → WebSockets: On** (default). Messaging uses Socket.IO.
- **Caching:** leave the defaults. Photos under `api.sawacars.com/uploads/`
  are already sent with a one-year `immutable` cache header and are cached by
  extension, `?w=` included in the key. Pages and API answers are not cached
  (they are `no-store` or have no cacheable extension), which is correct: they
  depend on who is signed in.
- Do **not** turn on Polish, Mirage or "Cache Everything".

## 3. Switch

1. At the registrar, replace the nameservers with the two Cloudflare shows.
2. Wait for Cloudflare to say **Active** (minutes to a few hours).
3. Check:

```bash
curl -sI https://api.sawacars.com/health | grep -i 'cf-ray'     # present = through Cloudflare
curl -s  https://api.sawacars.com/health/ready
curl -sI "https://api.sawacars.com/uploads/<a car photo>.jpg?w=400" | grep -i cf-cache-status
#   MISS the first time, HIT after
```

Then sign in on the website and the app, send a message (WebSocket), upload a
photo, and confirm an email still arrives (password reset).

## Rolling back

Set the four `A` records to **DNS only** (grey). Traffic goes straight to the
server again within a minute or two; nothing on the server needs to change.

## Notes

- Upload limit on the Free plan is 100 MB per request, the same as Caddy's.
- Cloudflare's IP ranges are pinned in the Caddy file (checked 14 Oct 2026,
  https://www.cloudflare.com/ips). They change rarely; a stale list fails safe
  (that edge is treated as the visitor, the old behaviour).
- Resized photos (`?w=`) are always WebP. They used to follow the `Accept`
  header with `Vary: Accept`, which Cloudflare's Free plan ignores, so the first
  format cached would have gone to everyone.
