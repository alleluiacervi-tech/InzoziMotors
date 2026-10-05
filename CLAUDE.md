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

**Web ↔ app parity is a requirement.** More people use sawacars.com than the
apps, so a signed-in user must be able to do on the website everything they can
do in the app, calling the same endpoint with the same rules. "Use the app" is
allowed only for the exceptions listed in `docs/WEB-PARITY-PLAN.md` §7. Any other
case is a bug.
- A new user-facing feature ships on **both** clients, or the PR says why not.
- Shipped 27 Sep 2026: messaging (read, reply, live updates, report/block),
  seller onboarding (`/dashboard/verify`, `/sell/submit`,
  `/dashboard/selling/[id]/schedule`), seller profiles (`/sellers/[id]`),
  compare (`/compare`, up to 3) and reopening a closed account at sign-in.
  What is left (Web Push, PWA, the copy sweep) is Phase 4 of the plan.
- The plan, phases and decisions are in `docs/WEB-PARITY-PLAN.md`. Tasks are in
  `docs/WEB-PARITY-TODO.md`; tick them in the PR that ships them.
- Browser rules:
  - the JWT stays in the httpOnly cookie
  - uploads go through a Next route handler, never a Server Action (1 MB limit)
  - realtime uses a short-lived socket ticket

**Showrooms** are admin-invited (one-use 48h activation link → `/activate-showroom`),
need `business_verified`, and may hold rental inventory. An existing seller
becomes one in Admin → Users → Edit (*Showroom account* + *Verified business*
in the same save, or its listings drop to review). A showroom sells under its
business name — every public `seller_name` goes through
`backend/src/lib/seller-display.js` — and its brands are read off its live cars,
never chosen (`GET /showrooms`). The team sets its photo
(`POST /admin/users/:userId/avatar`). Storefronts: app `ShowroomScreen`, web
`/sellers/[id]`. Plan and status: `docs/SHOWROOMS-AND-POLISH.md`.

**Admin** runs the Action Center triage queue, submissions, inspections,
rental inquiries, listings, users/ID checks, imports, reported content, the
`contact@` mailbox, centers, settings, and an append-only activity log.

**Insights** (`/insights/*` in the admin; `GET /admin/insights`, `/admin/exports`,
`/admin/statements` in the backend) is the read-only business view. Rules that
keep every screen agreeing:
- Windows are **Kigali calendar days** (`backend/src/lib/insights-range.js`),
  compared with the previous period of equal length. `/admin/revenue` groups
  by Kigali month for the same reason.
- **Revenue** = `platform_fees` `status='paid'` by `COALESCE(collected_at,
  created_at)` + `rental_subscriptions` not voided. Never a vehicle's price.
- **Funnels are cohorts** (what started in the window, followed to today) and
  are monotone, so a step can never exceed 100%.
- **CSV exports never carry** phone numbers, emails, ID documents or messages,
  and every export or PDF download writes `admin_audit_log`.
- PDFs (monthly revenue statement, business report) render **on demand**; there
  is no scheduler, digest or emailed report.
- Charts never use Signal Red: data series are `--data-1…5` (validated palette
  in `admin/src/app/globals.css`); red means action or an SLA breach.

**Imports** (`/imports`) is the one money-adjacent flow: Japan/UAE import
orders with quote → agreement → 50/50 milestones evidenced by **uploaded bank
transfer proof**. No gateway; an admin reviews the proof.

**Korean imports from Encar** (branch `feature/encar-foundation`; plan `docs/ENCAR-IMPORT-PLAN.md`,
tasks `docs/ENCAR-IMPORT-TODO.md`, how to run it `docs/ENCAR-IMPORT-OPERATIONS.md`). Every used
car for sale in South Korea, searchable on web and app with all photos, replacing the model
catalogue once switched on. **All phases are written and ship OFF**; what remains needs a person,
the provider key or production data (see the status block below). Rules that must not be broken:
- It is a **mirror, not live search**: a separate `encar-sync` container (`backend/src/workers/encar-sync.js`)
  loads the catalogue, then applies the provider's change feed; the API reads only our tables
  (`encar_listings`, `encar_detail_cache`, `encar_sync_state`, `encar_sync_runs`, `encar_usage`;
  migration 0052). It never calls the provider per search.
- **Storage never grows unbounded**: only cars for sale now (sold ones deleted), photo *addresses*
  never files, reports cached 24 h in an UNLOGGED table, row ceiling (default 250k), rows rewritten
  only on a shown-field change, `ops/backup.sh` excludes `encar_*` data.
- **Switches** in `platform_settings`: `encar_flags` (`sync_enabled`, `catalog_public`, both false),
  `encar_ingest_rules`, `encar_cost_inputs` (exporter costs; **no landed-cost figure is shown until
  `configured` is true** with a `reviewed_on` date: never a guessed shipping price).
- **Never exposed**: the provider key (header only, redacted in logs), licence plates, VINs,
  inspection certificate numbers, dealer details. Reports are rebuilt from named fields in
  `backend/src/lib/encar/detail.js`; do not pass a provider payload through.
- Prices are the provider's 만원 (10,000 KRW), converted for display only. Korean cars are **never**
  labelled "Sawa Certified"; they show the *Korean* inspection report and say Sawa inspects again in
  Kigali. Sawa is not the seller; no escrow or guarantee wording (import orders stay quote →
  agreement → 50/50 bank-transfer proof).
- Ordering: `POST /imports` with `encar_listing_id` freezes a server-built snapshot into the order
  (`listing_snapshot`, `snapshot_photos`, migration 0053); the client's make/model/year are ignored.
- Clients prefer the Korean catalogue only while `catalog_public` is true and fall back to the old
  model catalogue otherwise, so the import page is never empty. The old catalogue code is deleted
  in a later pull request, after go-live (deliberate, see the TODO's Phase 6).
- Provider limits (Business plan): 60 requests/min (API paces itself 20, worker 35), 12 GB traffic a
  month, 100 refreshes a day. `GET /health/encar` feeds an uptime check.

*Encar status, 1 Oct 2026, so a new session knows where it stands:*
- Done and pushed on `feature/encar-foundation`: Phases 1–5 and the code half of Phase 6. 93 backend
  unit tests pass locally; the web and admin typecheck; the app's release, module-scope, hook-order,
  undefined-ref and import checks pass.
- **Not yet run anywhere**: the Postgres tests (`encar-store`, `imports-korea`, `fx`) and the
  Playwright spec (`web/e2e/korea-imports.spec.ts`) only run in CI, which only runs on a pull request
  to `main`. No pull request is open (the user has not asked for one).
- **Waiting on the user**: the provider key and plan, written terms from encarapi (storing data,
  showing photos, photo traffic), the Korean exporter and its cost sheet (E7), decisions E1–E8,
  disk space on their Mac, native-speaker review of rw/sw strings, device test, one real order.
- **Waiting on the key (assistant)**: run `backend/scripts/encar-spike.js`, record the numbers in
  plan §9, confirm the photo option (E3), check the export's columns, capture fixtures, tighten the
  inspection allow-list, load-test 150k rows.
- Go-live order is in the operations guide. Last: delete the old catalogue (TODO Phase 6).

**Import catalogue images** (Admin → Catalogue images, migration 0050): best
first, an **official photo** uploaded with its source and permission recorded
(`image_source`, internal), then a licensed **studio render** that a person has
approved (`render_review` — the library answers "found" with a different car
for an unknown model, so nothing it returns is public unreviewed; needs
`VEHICLE_RENDER_CUSTOMER`), then the brand's mark. Wikimedia Commons is retired
(street photos of used cars, many of the wrong model) and its routes answer 410.
Never copy images from manufacturer or press websites.

---

## 3. The invariants — do not weaken these

Enforced in code and locked in `platform_settings` (rows are `editable = FALSE`;
`marketplace_mode=verified_classifieds`, `payments_enabled=false`,
`guarantees_enabled=false`, `rental_mode=inquiry_only`).

1. **A listing is only public with valid inspection evidence.**
   `validInspectionExists()` (`backend/src/routes/cars.js`) requires an
   inspection that is `complete` on `checklist_version='sawa-150-v1'` **and**
   whose submission matches the car on seller, make, model and year. Failing it
   returns **404, not 403**. Since PR #106 (the *transparency model*) a score
   under 105 or a critical defect **does not block publication**:
   `publicationReadiness` still requires a complete, consistent checklist, and
   turns a low score or critical defect into a warning that the listing
   discloses so buyer and seller can negotiate on it. Listing creation
   (`POST /cars`) and the pipeline board (`lib/vehicle-journey.js`) follow the
   same rule: a completed inspection is done whatever it scored. A submission
   that will not become a listing is closed with `POST /submissions/:id/close`
   (the pipeline board's Remove; `notify: false` skips the seller's message).
   A submission follows its listing, linked from either side: archived with
   it, back to `inspected` when it is restored, and still `archived` after the
   listing is deleted for good — which is what keeps it off the board.
2. **Inspection is evidence, not publication.** Completing it sets `inspected`;
   it never publishes. Failing a re-inspection still demotes `live`/`approved`
   → `under_review`, for an admin to review and republish with the defects
   disclosed.
3. **Contact disclosure is triple-gated**: authenticated buyer + seller's
   per-channel consent (`phone_visible`/`whatsapp_visible`) + acknowledgement
   of the current terms version (else **428 `MARKETPLACE_TERMS_REQUIRED`**).
   Every disclosure writes a `listing_contact_events` row — **without the
   number**, keeping PII out of analytics. Public payloads never carry numbers.
4. **Seller eligibility**: `role='seller'` + `id_verified='approved'` +
   `account_status='active'` + not deleted + (not a showroom OR `business_verified`).
5. **Sessions are re-checked every request** (`verifyLiveSession`): deleted or
   suspended takes effect on the *next request*, not the next login. Only a
   session JWT is a session (`verifySessionToken`): the web's socket ticket
   (`purpose`) and ID-document view link (`scope`) are refused as logins, and
   an admin session is refused past its 12-hour lifetime.
6. **Revoking an ID verification cascades**: sessions die, contact visibility is
   forced off, listings → `under_review`, rentals → `maintenance`.
7. **Money is RWF whole francs, canonically, in the database.** Never convert in
   presentation code. Format with `formatMoney` (`web/src/lib/business.ts`).

Single source of truth for the checklist: `backend/src/lib/inspection-policy.js`
— 150 one-point items across 7 categories; it **throws at require-time** if the
counts don't reconcile. Its public-facing transcription is
`web/src/lib/inspection-policy.ts` (the ScoreRing on every card and the 150-tick
`CheckRuler` in the homepage's standard section), which
throws on import the same way, so a bad edit is a failed build rather than a
wrong number on the homepage.

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
| Bundle id / package | iOS `com.sawacars.app` · Android `com.sawacars.apps` (the company's new Play Console account, from Oct 2026; `com.sawacars.app` is stuck on a personal Play account that never got production access; `com.sawacars.android` is retired) |
| Slug / EAS project | `sawa-cars` / `f2c5d3f8-8777-4b97-96ec-1482d374a42a` (account `alleluiacervi`; moved from `alleluia_cervi` 25 Sep 2026 after the free build quota ran out) |
| Version | `1.0.8` (`app.config.js`); build numbers are **remote** (`appVersionSource: remote`, auto-increment). `runtimeVersion` follows the app version, so bump it **only** for native changes: a bump strands every installed build from OTA updates |
| Apple Team ID | `5Z2LA9U639` · ASC app id `6803097569` |
| Android | target/compile SDK 36. `web/public/.well-known/assetlinks.json` lists `com.sawacars.apps` with its EAS upload key (keystore created 5 Oct 2026; fingerprints in `docs/SOCIAL-SIGN-IN.md`); add the Play App Signing SHA-256 beside it once the first .aab is in the company Play Console (a real value only — `release:check` must stay green) |
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

**Push status (Oct 2026).** iOS delivers with the app closed (APNs key on EAS).
Android does not yet: it needs a Firebase project, `google-services.json` supplied
to the build (`GOOGLE_SERVICES_JSON` as an EAS file env var, read by
`app.config.js` — never committed), and the FCM V1 service-account key uploaded
with `eas credentials`; then a new store build. To tell "phone", "credentials"
and "server" apart, Settings → *Send a test notification* calls
`POST /devices/test`, which reports per device what Expo said. The backend also
reads Expo's receipts 15 minutes after a send and logs credential errors
(`expo push receipt error`).

**Crash visibility.** JavaScript errors go to `POST /client-errors`
(`src/utils/crashReport.js` → one structured log line, no user data). Native
crash reporting (Sentry) is wired but inert until `EXPO_PUBLIC_SENTRY_DSN` is
set — see `src/utils/sentry.js`.

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
  `node src/db-init.js` (delegates to `src/migrate.js`). Currently through `0057`.
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

**Web translations are scoped.** The browser never receives the whole
catalogue (`web/src/lib/i18n/dictionary.ts`, six languages): the root layout
hands the client the chrome's namespaces (`common`, `nav`, `store`, `ui`) for
the active language only, and route layouts add theirs with `<I18nScope
ns={[...]}>` (`cars`, `tools`, `auth`, `dashboard`, `home`, `imports`). A new
client component that calls `useT()` under a route whose scope lacks its
namespace renders the raw key and warns in development — add the namespace to
that route's layout. Server components use `getServerT()` and see everything.

**Price bands** live in one place, `web/src/lib/inventory.ts`
(`BUDGET_EDGES`); the homepage search and stock band both read it.

**Sign in with Google / Apple** (`docs/SOCIAL-SIGN-IN.md`; `backend/src/routes/oauth.js`,
`lib/oauth.js`, `user_identities` from migration 0056). The app offers Google and Apple (Apple on
iOS only); the website offers **Google only**, by decision (an account made with Apple in the app
can set a password with *Forgot password* to use the website). Ships off: a button appears only when
its provider is configured (`GET /auth/oauth/providers`, the web's env, the app's
`EXPO_PUBLIC_GOOGLE_*`). Rules: ID tokens are verified against the provider's keys, never
decoded and trusted; a provider email joins an existing account only when the provider marks it
verified; admins always use their password; a provider never supplies a phone or role, so a new
account is shown *One last step* (`POST /auth/oauth/complete-profile`, once) right after
sign-up, and only then: signing in with Google or Apple never asks for a phone. The website also
offers **Google One Tap** (`components/auth/GoogleOneTap.tsx`, `api/auth/oauth/google/one-tap`) to
signed-out visitors on public pages: nonce cookie spent on use, Origin checked, `auto_select` off,
quiet on auth pages and for the browser session after a sign-out. Password-less accounts close without a password, and closing revokes Apple's tokens
(guideline 5.1.1(v)). The app's native sign-in needs store build 1.0.9.

**Vehicle record** (`GET /cars/:id/history` → `sawa_record`, `GET /cars/:id/model-safety`; web
`VehicleHistoryCard` + `ModelSafetyCard`, app `VehicleHistoryScreen`). Free sources only:
- **Odometer**: the inspector types the dashboard reading at completion (`odometer_km` →
  `inspections.vehicle_mileage`; `lib/odometer.js`). Readings join across owners on the VIN key only
  when `describeVin` is confident. A drop below an earlier reading, or a listing mileage far from the
  reading, is a publication **warning** (never a block) and is shown to buyers with both numbers.
- **Earlier owners** appear publicly as a date and a reading only: never a name, price or score.
- **Model safety** is NHTSA (recalls, complaints, NCAP stars) cached a week in `model_safety_cache`
  (`lib/model-safety.js`). About the model, never the car; US models only. Unknown or unmatched
  models render nothing, and when NHTSA's index contradicts its query the figure is unknown, never 0.
- No surface may claim RRA, Interpol, police, insurance or registry data: Sawa has none.

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
phone number; `SOCIAL` (`web/src/lib/site.ts`) drives both the footer's social
row and `sameAs` in the structured data, so a profile is claimed to Google only
once it is shown to a human — store those URLs canonical, never with the
`utm_*`/`stkn` parameters Instagram's share button appends; `web/src/lib/seo.ts`
forbids `aggregateRating`/`priceValidUntil` until they are real. Listing galleries are **flexible** (`listing_min_photos=1`,
6 recommended) — the old fixed 36-angle rule is gone.

**Gaps from the 27 Sep 2026 parity audit** (`docs/WEB-PARITY-PLAN.md` §3.3),
fixed the same day (§10, §11):
- Sellers can pause, relist and mark sold on both clients, through
  `PATCH /cars/:id/seller-status`. (The app's `/cars/:id/status` is the admin
  route; the old "relist" that only changed local state is gone.)
- The socket re-checks the session on every handshake (`verifyLiveSession`, for
  both the app's token and the website's short-lived ticket).
- Uploaded photos lose their metadata (GPS, device, time) without being
  re-encoded: `middleware/strip-metadata.js`, on ID documents and reference
  photos. Identity documents are still never recompressed.
- Reference photos reach the backend from both clients, through
  `POST /submissions/:id/reference-photos`, which stores them under `submissions/<id>`.
- The app's seller notes are sent as `notes`, the one field the backend stores.

Every new upload route needs its own rule in `resolveSubdir`
(`middleware/upload.js`). The fallback is the private `id-docs` folder.
Private folders (`PRIVATE_UPLOAD_DIRS` in `server.js`: id-docs, contracts,
documents, plate-originals, imports) are refused on the decoded path and
served only through their own owner-checked routes. Public car payloads use
the `PUBLIC_CAR_COLUMNS` allow-list — never `c.*` — and never a raw VIN.

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
`SEO-LAUNCH-CHECKLIST.md`, `IMPORT-ORDERS-CHECKLIST.md`, `ADMIN-INBOX.md`,
`IMPORTS-AUDIT.md`, `WEB-PARITY-PLAN.md` + `WEB-PARITY-TODO.md`.
