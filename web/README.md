# Sawa — website

The public web platform for Sawa: the certified marketplace, the rental
fleet, the seller journey, and every buyer's account. Next.js 15 (App Router),
React 19, Tailwind 3.4, TypeScript strict. No other runtime dependencies.

It is the **third** client of one backend, not a separate product:

```
backend/   Node + Express + PostgreSQL API   →  the single source of truth
├── src/       Expo app (iOS + Android)      →  App Store / Play Store
├── admin/     Next.js admin dashboard       →  Sawa team only, port 3001
└── web/       this — the public website     →  port 3002
```

Same database, same JWT, same business rules. A car published by the admin
dashboard appears here and in the app within one revalidation cycle, and a buyer
who signs in here is signed in to the same account in the app.

---

## Running it

```bash
cp .env.example .env.local     # then edit — see the comments in that file
npm install
npm run dev                    # http://localhost:3002
```

The backend must be running for anything beyond static pages. The quickest way
is the whole stack from the repo root:

```bash
docker compose up --build      # api :3000 · admin :3001 · web :3002 · postgres :5432
```

Other scripts: `npm run build`, `npm start` (production server on 3002),
`npm run typecheck` (`tsc --noEmit`, which must be clean before any commit).

---

## Architecture decisions

**The JWT lives in an httpOnly cookie, not in localStorage.** The app keeps its
token in Expo SecureStore because it owns its own process; a browser does not —
anything on the page can read `localStorage`, so a token there is one XSS away
from account takeover. Here, `src/app/actions/auth.ts` posts the credentials to
the Next server, which calls the same `/auth/login` the app uses and stores the
returned JWT in an httpOnly, SameSite=Lax cookie. Every authenticated request is
then made server-side with `getToken()` from `src/lib/session.ts`. **The browser
never holds the token.** The backend is untouched: it still sees
`Authorization: Bearer <jwt>`.

**The catalogue is server-rendered.** Listing pages are Server Components with
revalidated fetches (`CATALOGUE_REVALIDATE`, 60s in `src/lib/api.ts`), so every
live car is a real indexable URL with real HTML. That is the entire reason the
site exists alongside the app — a client-rendered marketplace earns no search
traffic. `'use client'` appears only where there is genuine interactivity.

**Business logic is mirrored, not re-invented.** `src/lib/business.ts` ports the
formulas from the Expo app's `src/data/*` — certification tiers, the RWF rate,
the finance estimate, the RRA duty calculation, the status vocabulary. Each block
names the mobile file it mirrors. A seller who sees one valuation in the app and
another on the site stops trusting both, so these change in the same commit or
not at all. (The repo has no npm workspace and the mobile side is JS, so a shared
package would mean restructuring Metro resolution across three apps. Extracting
`packages/shared` is the natural next step once the monorepo adopts workspaces.)

**Nothing is invented on screen.** Market position renders only when the backend
found three or more real comparables (`hasRealMarketData()`); "high demand" is a
true save count; there are no testimonials and no headline statistics. If a
figure is not in the API, the copy is written so it is not needed.

**Red discipline.** Brand red (`#CC050F`) appears only as a price, a primary
action, a selected state, the Certified+ badge, an inline action link, or a
section eyebrow — carried over from the app. Informational icons are
`content-secondary` / `content-muted`. Colours come from the Tailwind theme in
`tailwind.config.ts`, which is itself a literal port of `src/theme/colors.js`.

---

## SEO and app-linking surfaces

| File | Serves | Notes |
|---|---|---|
| `src/app/sitemap.ts` | `/sitemap.xml` | Static routes + every live car + every active rental. Every fetch is caught: a sitemap that throws fails `next build`. Regenerates hourly. |
| `src/app/robots.ts` | `/robots.txt` | Allows the public site, disallows `/dashboard` and `/api/`, points at the absolute sitemap URL. |
| `src/app/manifest.ts` | `/manifest.webmanifest` | Installable PWA. Icons are SVG so they can never drift from `Logo.tsx`. |
| `src/app/icon.tsx` | `/icon` | 32×32 favicon, generated with `next/og`. |
| `src/app/apple-icon.tsx` | `/apple-icon` | 180×180 home-screen icon. |
| `src/app/opengraph-image.tsx` | `/opengraph-image` | 1200×630 share card — the first thing most Rwandan buyers see, because links travel by WhatsApp. |
| `src/app/download/` | `/download` | App landing page and the fallback target for every app link. Accepts `?to=car/<uuid>` and tries to hand off to the native app before falling back to the store. |
| `public/.well-known/` | Android App Links, iOS Universal Links | **Placeholders — see below.** |

Two decisions in the three generated images are worth knowing about.

**They use only the font `next/og` ships with (Noto Sans 400).** Loading Inter
over the network would make every build depend on Google being up, so hierarchy
in those images comes from size, colour and letter-spacing rather than weight.

**They declare `runtime = 'edge'`.** The Node build of the bundled `@vercel/og`
locates its own font and wasm with `path.join(import.meta.url, …)`, which
produces a broken path on Windows — verified against Next 15.1.3, where
`next build` fails on `/icon` with `ERR_INVALID_URL` on a Windows machine while
succeeding in the Linux image. The edge build resolves those assets through the
bundler and works on both, which matters because development here happens on
Windows. The cost is that the three routes are rendered on demand instead of
prerendered; `ImageResponse` sets `cache-control: public, immutable,
max-age=31536000`, so browsers fetch each one once. If crawler traffic ever
makes that visible, cache `/icon`, `/apple-icon` and `/opengraph-image` in
Nginx. Revisit and drop back to the Node runtime once the upstream bug is fixed.
(Edge routes are supported by `next start` and by `output: 'standalone'` — both
were checked before this was adopted.)

---

## Before launch — real values still needed

Everything below is a deliberate placeholder. Search for the exact strings.

1. **`public/.well-known/assetlinks.json`** —
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`.
   Google Play Console → your app → **Test and release → Setup → App integrity →
   App signing** → *App signing key certificate*, SHA-256 fingerprint. Use the
   **app signing** key, not the upload key; Play re-signs every release, so the
   upload key's fingerprint will not match what ships. Include both if you also
   distribute a self-signed APK.

2. **`public/.well-known/apple-app-site-association`** —
   `REPLACE_WITH_APPLE_TEAM_ID` (twice). developer.apple.com → **Membership
   details → Team ID** (10 characters). The `appID` is `<TeamID>.com.sawacars.app`.
   Universal Links also require the **Associated Domains** capability
   (`applinks:sawacars.com`) on the iOS build.

3. **`src/lib/site.ts` → `APP.appStoreUrl`** — currently `id0000000000`. The real
   Apple ID appears in App Store Connect once the app record exists.

4. **`src/lib/site.ts` → `CONTACT.whatsapp`** — currently `250788000000`. The same
   placeholder lives in the app's `src/utils/whatsapp.js`; change both together.

5. **`NEXT_PUBLIC_SITE_URL`** — must be the real origin in production. It backs
   `metadataBase`, canonical URLs, the sitemap and the OG card, so a wrong value
   silently poisons every shared link.

6. **The Expo app has no deep-link route table yet.** `app.config.js` declares
   `scheme: 'sawa'`, but `src/navigation/RootNavigator.js` has no
   `linking` config, so `sawa://car/<id>` currently opens the app on its
   home screen rather than the car. Both `.well-known` files and
   `useDeepLink.ts` are ready for it; the app side needs the matching `linking`
   prefixes and screen map before app links are worth announcing. Add
   `/rentals/*` to the AASA `components` list at the same time if rentals get a
   linkable screen.

7. **Commit a lockfile.** `web/` has no `package-lock.json`, so the Dockerfile
   falls back to `npm install`. Run `npm install` once and commit the result to
   make image builds reproducible.

---

## Deploying

Standalone output (`output: 'standalone'` in `next.config.ts`), same shape as
`admin/`. Two ways:

**Docker (what `docker-compose.yml` already wires up):**

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.sawacars.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://sawacars.com \
  -t sawa-web .

docker run -p 3002:3002 -e API_URL=http://127.0.0.1:3000 sawa-web
```

`NEXT_PUBLIC_*` are **build args** — they are baked into the browser bundle, so
they must be browser-reachable addresses. `API_URL` is **runtime** and may be a
private address (`http://api:3000` in Compose, `http://127.0.0.1:3000` on a
single VPS). The image runs as the unprivileged `node` user on port 3002.

**Directly on the VPS**, alongside the API and admin dashboard:

```bash
cd web && npm ci && npm run build
pm2 start .next/standalone/server.js --name web --update-env
```

Then an Nginx server block for the apex domain proxying to `localhost:3002`,
and Certbot for the certificate. Buying the VPS, pointing DNS and running
Certbot are human tasks — see section 8 of the root `CLAUDE.md`.

Two things Nginx must get right:

- `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association`
  have to be served from **this** app over HTTPS with no redirect. The AASA file
  has no extension; `next.config.ts` already sets its `Content-Type` to
  `application/json`.
- Keep `X-Frame-Options`, HSTS and the rest from `next.config.ts` rather than
  duplicating them in Nginx — duplicated security headers are how they end up
  contradicting each other.
