# Sawa

Rwanda's certified used-car marketplace. Sawa is the middleman: every car is
physically inspected on a 150-point check and photographed by our team before
it is listed. Sellers submit cars — they never publish directly.

**There is no marketplace payment or guarantee feature.** Sawa reviews listings
and provides communication tools. Buyers, sellers and rental providers contact
one another directly and independently handle due diligence, contracts,
payments, transfers, collection and disputes. Sawa does not reserve vehicles or
act as a party to their deal.

---

## What's in this repository

One repo, four deployables that ship to completely different places.

| Path | What it is | Where it goes |
|---|---|---|
| `/` (`src/`, `App.js`) | Expo / React Native app | App Store + Play Store |
| `backend/` | Node + Express + PostgreSQL API | VPS — `api.sawacars.com` |
| `web/` | Next.js public marketplace | VPS `:3002` — `sawacars.com` |
| `admin/` | Next.js internal dashboard | VPS `:3001` — `admin.sawacars.com` |

The backend is the single source of truth. Nothing else touches PostgreSQL.
All three clients share one `users` row, one JWT format, and one set of business
rules — so a backend change affects every surface at once.

```
 Expo app (phone) ─┐
 Website (browser)─┼─→  api.sawacars.com  →  Node + PostgreSQL
 Admin dashboard  ─┘
```

---

## Running it locally

The API, database, website and admin dashboard come up together:

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Admin dashboard | http://localhost:3001 |
| Website | http://localhost:3002 |
| PostgreSQL | localhost:5432 (`sawa` / `sawa_dev`) |

The Expo app is **not** part of that stack — it runs on a device and reaches the
API over the LAN:

```bash
npm install
npm start          # then scan the QR code, or press a / i / w
```

`src/api/client.js` resolves the API host automatically: an explicit
`EXPO_PUBLIC_API_URL`, then the Metro host's LAN address, then the Android
emulator loopback. A physical phone cannot reach `localhost`, which is why this
is not a constant.

Useful targets:

```bash
make dev        # docker compose up --build
make reset      # wipe volumes and rebuild from scratch
make typecheck  # tsc --noEmit for both Next apps
```

---

## Token storage differs by surface, on purpose

| Surface | Store | Why |
|---|---|---|
| Expo app | `expo-secure-store` | The app owns its process. |
| Website | httpOnly cookie, calls made server-side | Anything a browser script can read is one XSS from account takeover. |
| Admin | httpOnly cookie + same-origin proxy | Same reasoning, and this token can read national ID scans. |

All three send the identical `Authorization: Bearer <jwt>` the backend expects.

---

## Things worth knowing before you change something

- **Business logic is mirrored, not shared.** `web/src/lib/business.ts` is a
  deliberate port of `src/data/{certification,finance,marketData}.js`, and each
  block names its counterpart. Change both in the same commit or a seller sees
  one valuation in the app and a different one on the web. (A real shared
  package is blocked on adopting npm workspaces across the Expo/Metro resolver.)
- **The app must never invent data.** Demo fixtures and offline fallbacks are
  gated behind `DEMO_MODE` in `src/context/AppContext.js` and compile out of
  release builds. A release build that shows a car which does not exist is the
  exact problem this product was built to solve.
- **Honesty gates.** `APP.storesLive`, `CONTACT.whatsappVerified`
  (`web/src/lib/site.ts`) and `WHATSAPP_VERIFIED` (`src/utils/whatsapp.js`) keep
  placeholder store badges and phone numbers off every surface until the real
  values land. Flip them in the same commit that sets the value.
- **Capability differences are stated, not hidden.** The web cannot capture ID
  documents or the 36-angle shoot, so it routes those steps to the app rather
  than pretending. Everything else works on both.
- **Deep links use the website's own paths.** `sawa://cars/<id>` and
  `https://sawacars.com/cars/<id>` resolve through one entry in
  `src/navigation/linking.js`. Both `.well-known` files still need real
  signing credentials before the OS will verify them.

---

## Tech

Expo SDK 54 · React Native 0.81 · React Navigation 7 · Next.js 15 · Tailwind ·
Node 20 · Express 4 · PostgreSQL 16 · Socket.io · Docker Compose

## Documentation

| File | Contents |
|---|---|
| `CLAUDE.md` | Product blueprint, pipeline, roles, deployment guide |
| `docs/PRODUCTION-LAUNCH-PLAN.md` | Server architecture, launch sequence |
| `docs/BACKEND-AUDIT.md` | Backend gap audit and what was closed |
| `docs/UX-AUDIT.md` | UX review |
