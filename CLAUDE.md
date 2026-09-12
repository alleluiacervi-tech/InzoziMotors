# Sawa Cars — project context

Rwanda-focused **verified vehicle classifieds**. Staff verify seller identity,
inspect sale vehicles against a 150-point checklist, and publish listings.
Buyers and renters browse, message, and contact providers **directly**.

> **The single most important rule: Sawa Cars is not a party to any deal.**
> No checkout, no escrow, no held funds, no managed handover, no guarantee.
> Users agree price, contract, payment, delivery, transfer, pickup, return and
> disputes among themselves. Every surface must say so, and no code may
> contradict it. This is a deliberate, enforced position — see *Retired* below.

Last verified against the codebase: **24 Aug 2026** (main @ `6233952`).

---

## 1. Repo layout — four deployables, one repo

```
/                 Expo app (React Native)   → App Store + Play Store
backend/          Node + Express + Postgres → VPS, https://api.sawacars.com
web/              Next.js 15 public site    → VPS :3002, https://sawacars.com
admin/            Next.js 15 team console   → VPS :3001, https://admin.sawacars.com
```

The backend is the only thing that talks to Postgres; the other three are its
clients and share one `users` row and one JWT. **A backend change affects all
three at once.** `web/src/lib/business.ts` is a deliberate port of the mobile
`src/data/*` logic — change both in the same commit or the numbers disagree.

Live and healthy. `GET /health` (liveness, no deps) and `GET /health/ready`
(503 when Postgres is unreachable).

---

## 2. What the product actually does

**Buyers/renters** browse listings and inspection reports, save and compare
vehicles, see financing and duty estimates, message in-app, and — after
acknowledging the direct-deal notice — request a seller's phone/WhatsApp if
that seller opted in. Rentals take a **non-binding availability inquiry**, not
a booking.

**Sellers** submit a vehicle, book an inspection slot, and control which
contact channels may be disclosed. They cannot publish; only an admin can.

**Showrooms** are admin-invited (one-use 48h activation link → `/activate-showroom`),
need `business_verified`, and may hold rental inventory.

**Admin** runs the Action Center triage queue, submissions, inspections,
rental inquiries, listings, users/ID checks, imports, reported content, the
`contact@` mailbox, centers, settings, and an append-only activity log.

**Imports** (`/imports`) is the one money-adjacent flow: Japan/UAE import
orders with quote → agreement → 50/50 milestones evidenced by **uploaded bank
transfer proof**. No gateway; an admin reviews the proof.

---

## 3. The invariants — do not weaken these

Enforced in code and locked in `platform_settings` (rows are `editable = FALSE`;
`marketplace_mode=verified_classifieds`, `payments_enabled=false`,
`guarantees_enabled=false`, `rental_mode=inquiry_only`).

1. **A listing is only public with valid inspection evidence.**
   `validInspectionExists()` (`backend/src/routes/cars.js`) requires an
   inspection that is `complete`, `checklist_version='sawa-150-v1'`, `passed`,
   `score >= 105`, zero critical failures — **and** whose submission matches the
   car on seller, make, model and year. Failing it returns **404, not 403**.
2. **Inspection is evidence, not publication.** Passing sets `inspected`; it
   never publishes. Failing actively demotes `live`/`approved` → `under_review`.
   A critical failure blocks publication at any score.
3. **Contact disclosure is triple-gated**: authenticated buyer + seller's
   per-channel consent (`phone_visible`/`whatsapp_visible`) + acknowledgement
   of the current terms version (else **428 `MARKETPLACE_TERMS_REQUIRED`**).
   Every disclosure writes a `listing_contact_events` row — **without the
   number**, keeping PII out of analytics. Public payloads never carry numbers.
4. **Seller eligibility**: `role='seller'` + `id_verified='approved'` +
   `account_status='active'` + not deleted + (not a showroom OR `business_verified`).
5. **Sessions are re-checked every request** (`verifyLiveSession`): deleted or
   suspended takes effect on the *next request*, not the next login.
6. **Revoking an ID verification cascades**: sessions die, contact visibility is
   forced off, listings → `under_review`, rentals → `maintenance`.
7. **Money is RWF whole francs, canonically, in the database.** Never convert in
   presentation code. Format with `formatMoney` (`web/src/lib/business.ts`).

Single source of truth for the checklist: `backend/src/lib/inspection-policy.js`
— 150 one-point items across 7 categories; it **throws at require-time** if the
counts don't reconcile.

---

## 4. Retired — present in the tree, deliberately unreachable

`transactionFeatureRetired` (`backend/server.js`) lets GET/HEAD through and
answers **410** to everything else, so old app builds fail loudly and history
stays readable:

- `/handovers`, `/contracts` — whole routers
- `POST /reviews`, `POST /disputes`, `POST /rentals/:id/book`
- `/payments` — an inline 410 stub; **no provider client exists** (Pesapal was
  removed wholesale, PR #64)
- Web `/rentals/payment-return`, `/dashboard/requests` and admin `/fees`,
  `/handovers`, `/contracts`, `/disputes`, `/rentals` are redirect stubs

The commission calculation that used to live in `backend/src/routes/handovers.js`
(`PATCH /:id/complete`) has been deleted — it was unreachable dead code, kept
alive only by this middleware, and a landmine if `/handovers` were ever
remounted without it. `platform_fees.fee_type` still allows `'commission'` and
the vestigial `'certification'` (scaffolded in the 0001 baseline, never
billed by any code path) so historical rows keep validating, but nothing
writes either value anymore.

Do not reintroduce: checkout, escrow, held funds, Sawa-managed handover,
transaction protection, a seven-day guarantee, or a percentage-of-sale
commission.

---

## 5. Mobile release configuration

| | |
|---|---|
| Bundle id / package | `com.sawacars.app` |
| Slug / EAS project | `sawa-cars` / `9c7aebc4-04b3-4950-b4db-0021e7836e65` |
| Version | `1.0.0`; build numbers are **remote** (`appVersionSource: remote`, auto-increment) |
| Apple Team ID | `5Z2LA9U639` · ASC app id `6803097569` |
| Android | Play App Signing SHA-256 registered in `assetlinks.json`; target/compile SDK 36 |
| OTA | EAS Update, `runtimeVersion: appVersion`, channel `production` via `.github/workflows/mobile-update.yml` |

**Push notifications: code is real, delivery is not live yet.** `expo-notifications`
is a real dependency; `src/utils/push.js` registers the device, mints an Expo
push token and syncs it to `POST /devices/token`; `src/utils/pushNavigation.js`
routes a tap on the OS notification through `navigationRef` (same resolver as
NotificationCenter's own in-app tap — `src/utils/notificationRouting.js`).
AppContext's contextual ask (`maybeAskForPush`, fired the first time push has
an obvious payoff — saving a car) and the Settings toggle were already built
around this and needed no changes. The backend's fan-out
(`backend/src/lib/push.js` → Expo's HTTP push API) has been ready the whole
time. What is still missing is **credentials, not code**: Expo's push service
is a relay, not a certificate authority — it cannot deliver to a real device
without an APNs key (iOS) and FCM server config (Android) uploaded via `eas
credentials`, and because `expo-notifications` is a native module the change
only takes effect in a **new store build**, never an OTA update. In-app
NotificationCenter and the home bell already update live over the socket
either way (`backend/src/lib/notify.js`'s realtime emit) — the OS push layer
adds delivery while the app isn't open. Permissions: `CAMERA` and
`android.permission.POST_NOTIFICATIONS` (Android 13+, declared in
`app.config.js` `android.permissions`); `RECORD_AUDIO` and `READ_MEDIA_IMAGES`
stay blocked; `supportsTablet: false`.

`src/api/client.js` **refuses to start a release build against a non-HTTPS API**
and only clears the keychain on `SESSION_EXPIRED`/`SESSION_REVOKED` (so a wrong
password never signs you out). Demo fixtures are `__DEV__`-only.

---

## 6. Infrastructure

- **CI** (`ci.yml`) → **Deploy** (`deploy.yml`, on CI green on main) → the
  runner builds images, ships them by `docker save | ssh docker load`; the VPS
  only loads, migrates, restarts, health-checks. `ops/deploy.sh` owns deploy
  semantics (dirty-tree refusal, rollback pointer, DB backup when migrations
  are present) and CI invokes it with `SKIP_BUILD=1`.
- **`uptime.yml`** polls production on a schedule; **`ops.yml`** holds manual levers.
- Postgres has **no published ports** — reachable only on the container network.
- Migrations are forward-only files in `backend/migrations/`, applied by
  `node src/db-init.js` (delegates to `src/migrate.js`). Currently through `0036`.
  **`src/schema.sql` is never executed** — db-init runs migrations only, so that
  file is documentation. `test/schema-drift.test.js` fails if it ever describes a
  column no migration creates, and reports how far behind it is otherwise.
- **Mail**: Resend API first (`RESEND_API_KEY`), nodemailer/SMTP as fallback;
  `mailEnabled()` is true if either is set. Sending never throws. The `contact@`
  mailbox is read over IMAP by the admin Inbox (`MAIL_*`), a separate identity
  from the `no-reply@` sender.
- **Uploads**: Cloudinary when configured, persistent volume otherwise; URLs are
  normalised through `src/lib/public-origin.js` so no Docker-internal hostname
  is ever persisted (that bug shipped once — migration `0021` repaired it).

---

## 7. Working here

```bash
# backend (needs Postgres)
cd backend && npm install && node src/db-init.js && npm start
npm test                      # node --test, real Postgres, ~70 tests

cd web && npm run dev         # :3000 dev
cd admin && npm run dev
npm start                     # Expo (repo root)
npm run release:check         # release preflight
npm run mobile:imports        # mobile import resolution check
```

Brand: **Signal Red `#CC050F`** (`src/theme/colors.js`, `web/tailwind.config.ts`).
Red is reserved for prices, primary actions, active states and the certified
badge — informational icons stay neutral.

**Account closure** (`src/lib/account-closure.js`) is immediate and needs no
approval — Apple 5.1.1(v) requires deletion to *complete* in-app, so an operator
queue that could block one would fail review. The row survives 30 days
(reopenable), then an operator purges it; there is no scheduler, deliberately.

**Brands** live in `vehicle_makes`, served by `GET /makes` — not bundled in the
app. `aliases` collapses "Mercedes"/"benz"/"VW" onto one row. No logo files are
committed (third-party trademarks); an admin uploads them and every client draws
a lettermark until then.

**`app_release`** carries the newest installable build per platform plus
`ota_paused`, the stop switch `mobile-update.yml` reads before publishing.
`min_supported_version` locks people out and is rail-guarded three ways.

Honesty gates already in the code, keep them: `APP.storesLive: false` hides
store badges until real store IDs exist; `CONTACT.whatsappVerified` gates the
phone number; `web/src/lib/seo.ts` forbids `aggregateRating`/`priceValidUntil`
until they are real. Listing galleries are **flexible** (`listing_min_photos=1`,
6 recommended) — the old fixed 36-angle rule is gone.

---

## 8. Guardrails

- **Never print, read or paste secrets** — no `.env`, keys, or credentials into
  the conversation. Ask for values instead.
- **Ask before** anything destructive or privileged: `sudo`, `rm`, DNS, Certbot,
  dropping tables, restarts, force-push.
- **Production is high care.** State what a command will do before running it.
  Prefer dry runs (`nginx -t`, `certbot renew --dry-run`).
- Develop on a feature branch and push there — never straight to `main`.
- Don't open a PR unless asked.

## 9. Human-only tasks (cannot be automated)

Store console setup and submission, developer-account fees and identity checks,
signing credentials (Play service-account JSON, App Store Connect API key,
the APNs push key and FCM server config push notifications need — see
section 5), screenshots and store listing media, the content-rating and Data
Safety forms, pressing **Submit for review**, buying the VPS/domain and DNS
records, and providing every secret value.

Store answers are drafted in `docs/STORE-SUBMISSION.md`. Other live docs:
`PRODUCTION-READINESS.md`, `LAUNCH-TODO.md`, `DEPLOY-PHASE-2.md`,
`SEO-LAUNCH-CHECKLIST.md`, `IMPORT-ORDERS-CHECKLIST.md`, `ADMIN-INBOX.md`.
