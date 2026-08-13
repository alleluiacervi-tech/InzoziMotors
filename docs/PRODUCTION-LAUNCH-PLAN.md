# Sawa — Production Deployment & Release Plan

> Historical implementation plan. Use [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)
> for the current release gate, acceptance matrix and recovery procedure. Statements
> below describe the state when this audit was written and may already be implemented.

> **Version:** 1.0 · **Date:** August 1, 2026 · **Status:** Pre-launch planning
>
> Scope: everything required to take the four deployables — backend API, public
> website, admin dashboard, and the Expo mobile app — from the current
> docker-compose local stack to a production launch on a VPS plus the Apple
> App Store and Google Play Store.

---

## 1. Executive Summary

The product is functionally complete for a v1 launch: all mobile screens are
wired to a real API, the backend covers the full pipeline (auth → KYC →
submission → inspection → listing → handover → review), and the web + admin
apps build and run in Docker. What stands between today and a store-approved
production launch falls into four buckets:

1. **Store-compliance blockers** — most critically, there is **no account
   deletion feature** (no `DELETE` route in `backend/src/routes/auth.js`, no
   mobile screen, no web page). Hard rejection at both Apple (Guideline
   5.1.1(v)) and Google. Also, no privacy policy URL is live until the website
   deploys.
2. **Backend hardening** — no `helmet`, no rate limiting, `CORS_ORIGINS=*`,
   a 30-day non-revocable JWT, dev secrets (`admin1234`, `dev_jwt_secret…`),
   multer 1.x (known CVEs), and a password-reset flow that cannot deliver
   codes (SMTP unset — codes only go to server logs).
3. **Operations** — no server, backups, monitoring, or deploy automation yet.
4. **Store logistics** — accounts, signing, screenshots, data-safety forms,
   and Google's mandatory testing period.

**Realistic timeline: 4–6 weeks to both stores**, dominated by store
logistics, not engineering (engineering is ~2 weeks).

---

## 2. Verified Current State (audited Jul 31 2026)

| Surface | State |
|---|---|
| Backend API | Feature-complete, 15 route modules, smoke-tested (38/38 + 35 audit checks), Dockerized. Health endpoint exists. No tests in CI, no helmet/rate-limit. |
| Public website | Next.js 15.1.3 — browse, sell, rentals, tools, auth, dashboard, **legal/privacy pages exist**, full SEO scaffolding (sitemap, robots, OG images, manifest). |
| Admin dashboard | All 10 pages built, runs in Docker — **never click-tested end-to-end against the API**. |
| Mobile app | All Phase 1–5 screens wired with offline demo fallback; real photo capture; push token registration. `com.sawacars.app`, v1.0.0, Android API 36 pinned ✅, permission strings written ✅. |
| EAS config | Profiles ready, but **`eas init` not run** (no projectId) and `ascAppId` is a placeholder. |
| Assets | Icon + adaptive icon 1024×1024 ✅. Splash is only 1024×1024 (upscales badly on tall phones). No Play feature graphic, no screenshots. |
| CI | Syntax/typecheck/build on all four surfaces. No tests, no deploy, no `npm audit`. |
| Multipart uploads | KYC docs and 36-angle photo uploads **never exercised with real files** — must be staged-tested. |

Intentionally absent by design (not gaps): payments, Kinyarwanda, Cloudinary,
SMS/WhatsApp — all Phase 8.

---

## 3. Launch Blockers & Gap Analysis

### 3.1 P0 — fix before any store submission

1. **Account deletion** — build `DELETE /auth/me` (soft-delete + anonymize
   PII, cascade device tokens and saved items, keep transactional records), a
   confirmation flow in the mobile Settings screen, and a web
   deletion-request page (Google requires a **web URL** for this in the Data
   Safety form).
2. **Working password reset** — configure SMTP (Brevo free tier: 300
   emails/day); `backend/src/lib/mailer.js` already exists, it needs the
   `SMTP_*` env values and an end-to-end test. Reviewers will test
   "forgot password."
3. **Rate limiting + security headers** — `helmet` + `express-rate-limit`
   (~10 req/15 min/IP on all `/auth/*` endpoints, sane global ceiling,
   `app.set('trust proxy', 1)` behind Nginx). Cap reset-code attempts (5 max,
   15-min expiry, single-use) — a 6-digit code with unlimited attempts is
   enumerable.
4. **Production secrets** — 64-byte random `JWT_SECRET`, strong DB password,
   rotate the seed admin immediately, explicit `CORS_ORIGINS` list, confirm
   `RESET_CODE_ECHO` unset.
5. **Privacy policy URL live** — deploy the website first; the page already
   exists at `web/src/app/(marketing)/legal/privacy`.
6. **`eas init`** + fill `ascAppId` after creating the App Store Connect
   record; push tokens also need the projectId.

### 3.2 P1 — before launch, not before first build

- Multer 1.x → 2.x (1.4.5-lts.1 has known CVEs); re-test both upload flows.
- JWT down to 7d + a `token_version` column checked in `middleware/auth.js`
  so password change/reset/deletion revokes old tokens.
- Admin dashboard full click-test (covered by the staging pass in §5).
- Hi-res splash (≥1284-wide source or `expo-splash-screen` config).
- Supertest API smoke suite in CI — the coded version of the manual 38 checks.
- Gate the mobile demo-data fallback to `__DEV__` so a production outage shows
  an honest error state, not demo cars presented as real inventory.
- Socket.io: verify JWT on the connection handshake, not only on room join.

### 3.3 P2 — post-launch

Expo OTA updates (`expo-updates`); Cloudinary or on-upload `sharp`
compression; Kinyarwanda i18n; Africa's Talking SMS/WhatsApp; admin TOTP 2FA
+ audit log; pgBouncer only if connection counts demand it.

---

## 4. Production Server Architecture

### 4.1 Recommendation

**One VPS · Ubuntu 24.04 LTS · Docker Compose (production overlay) · Nginx on
the host as reverse proxy + TLS terminator.** The stack is already
containerized and proven by `docker-compose.yml` — production should have
parity with what you test. (The PM2 flow in the deployment guide remains a
valid fallback; pick one, don't mix.)

```
                Internet
                   │
        ┌──────────┴──────────┐
        │    Nginx (host)     │  80/443, Let's Encrypt, gzip,
        │                     │  security headers, rate limit
        └──┬───────┬───────┬──┘
   api.sawacars… sawacars.com admin.sawacars…
        │           │           │
   ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
   │api :3000│ │web :3002│ │adm :3001│   containers bound to 127.0.0.1
   └────┬────┘ └─────────┘ └─────────┘
        │
  ┌─────┴─────┐   ┌─────────────┐
  │Postgres 16│   │ uploads vol │   named volumes, backed up nightly
  └───────────┘   └─────────────┘
```

### 4.2 Specification

| Item | Choice | Rationale |
|---|---|---|
| OS | Ubuntu 24.04 LTS | 5-year support; matches the runbook |
| Size (launch) | 4 vCPU / 8 GB RAM / 160 GB NVMe | Four Node processes + Postgres + photo headroom; ~€16/mo |
| Provider | Hetzner (Falkenstein) or DigitalOcean (Frankfurt) | EU is the lowest-latency mainstream region to Kigali (~150–200 ms) |
| TLS | Let's Encrypt via Certbot, auto-renew | `certbot renew --dry-run` after setup |
| Supervision | Docker `restart: unless-stopped` + compose-on-boot (systemd) | Healthchecks already defined for PG |
| Scaling path | Resize VPS → split Postgres out → N api containers + Socket.io redis adapter | Move uploads to R2/Cloudinary before any multi-node step so containers stay stateless |

### 4.3 Domains & DNS

Register `sawacars.com` through any major registrar (Cloudflare Registrar or
Namecheap recommended). All A records → VPS IP:

| Record | Serves |
|---|---|
| `@`, `www` | Public website (`:3002`) — 301 one onto the other |
| `api` | Backend API + Socket.io (`:3000`) |
| `admin` | Dashboard (`:3001`) — add Nginx IP allowlist or basic-auth in front |

Low TTL (300s) before launch; add `CAA 0 issue "letsencrypt.org"`.

### 4.4 Nginx essentials

- Separate `server` block per subdomain; HTTP→HTTPS redirect; HSTS once TLS
  is proven.
- `client_max_body_size 25m;` on `api.` (photo uploads).
- WebSocket proxy on `api.`: `proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";` — otherwise chat silently degrades.
- Serve `/uploads/` directly from the uploads volume with `expires 30d;` but
  `location /uploads/id-docs/ { deny all; }` — mirror the app-level 403 on
  KYC documents.
- `limit_req` on `api.` as a second rate-limit layer.

### 4.5 Production compose overlay (`docker-compose.prod.yml`)

- All `ports:` bound to `127.0.0.1`; **remove the 5432 mapping entirely**.
- `NODE_ENV=production`; secrets via untracked `.env.prod` (chmod 600).
- Build args: `NEXT_PUBLIC_API_URL=https://api.sawacars.com`,
  `NEXT_PUBLIC_SITE_URL=https://sawacars.com`; web's internal
  `API_URL=http://api:3000` stays.
- `CORS_ORIGINS=https://sawacars.com,https://www.sawacars.com,https://admin.sawacars.com`
  (the native app sends no Origin header — CORS doesn't apply to it).
- Remove `SEED_ADMIN_*` after first boot; rotate the admin password.
- Per-service log rotation: `json-file`, `max-size: 10m`, `max-file: 5`.

---

## 5. Deployment Runbook

> Follows the existing guardrails: checkpoints before disabling root SSH and
> before DNS/Certbot; the human provides all secret values.

**Phase A — Provision (day 1):** Buy VPS + domain, point DNS. Create `deploy`
user + SSH key → **checkpoint: confirm deploy login before disabling root
SSH** → disable root/password auth, `ufw` (OpenSSH, 80, 443), fail2ban,
unattended-upgrades. Install Docker + compose plugin, Nginx, Certbot.

**Phase B — Stack up (day 1–2):** Clone repo to `/srv/sawa`; human pastes
`.env.prod` secrets; `docker compose -f docker-compose.yml -f
docker-compose.prod.yml up -d --build`; verify `/health` on all three
services; Nginx server blocks → `nginx -t` → reload; Certbot on all four
hostnames; `certbot renew --dry-run`; rotate seed admin.

**Phase C — Operations (day 2–3):** Backups (§6), monitoring (§7), systemd
unit for compose-on-boot. Then a **full staging pass**: register seller → KYC
upload → submission → admin approve/schedule → 150-pt checklist → 36-photo
upload → publish → purchase request → handover confirm → review. This single
pass closes three open items at once: the admin click-test, the untested
multipart uploads, and Socket.io over wss.

**Phase D — Point clients (day 3):** `eas build --profile preview` → install
the APK → verify against the production API over HTTPS, including a real push
notification.

---

## 6. Backups & Disaster Recovery

| What | How | Schedule / retention |
|---|---|---|
| PostgreSQL | `pg_dump -Fc` via cron | Nightly 02:00 CAT; 14 daily + 8 weekly |
| Uploads volume + DB dumps | `restic` (encrypted, deduped) → **offsite** Cloudflare R2 or Backblaze B2 | Nightly; 30 days |
| Config (`.env.prod`, Nginx, compose) | In restic; secrets also in a password manager | On change |

The VPS disk is not a backup — offsite is the backup. **Test a restore before
launch** (restore dump + uploads into a scratch stack, spot-check a listing
with photos) and quarterly after. Launch targets: RTO ~2–4 h, RPO ~24 h; add
WAL archiving only if 24 h ever becomes unacceptable.

Plan **real migrations** (e.g. `node-pg-migrate`) before the first
post-launch schema change — `db-init.js` can create a database but cannot
safely evolve a live one.

---

## 7. Monitoring & Observability

- **Sentry** (free tier) on backend + `sentry-expo` + Next.js — the single
  highest-value addition; mobile crashes are invisible otherwise.
- **UptimeRobot / Better Stack** probing `api…/health`, the website, and
  admin — and extend `/health` to `SELECT 1` the DB so the probe reflects
  real availability.
- **Netdata** (or node_exporter + Grafana Cloud free) for host metrics —
  disk-usage alerts matter most; uploads plus Postgres are the growth
  surfaces (36 photos/car adds up fast).
- Postgres `log_min_duration_statement = 500` — the market-data LATERAL joins
  are the queries to watch as rows grow.

---

## 8. Environment Variables & Secrets

Production `.env.prod` (human-provided; never committed, never echoed):

```
NODE_ENV=production            PORT=3000
DB_HOST=db DB_NAME=sawa DB_USER=sawa DB_PASSWORD=<strong>
JWT_SECRET=<openssl rand -base64 64>   JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://sawacars.com,https://www.sawacars.com,https://admin.sawacars.com
UPLOAD_DIR=/app/uploads
SMTP_HOST=smtp-relay.brevo.com SMTP_PORT=587 SMTP_USER=… SMTP_PASS=…
MAIL_FROM=Sawa <no-reply@sawacars.com>
# RESET_CODE_ECHO must NOT be set; SEED_ADMIN_* removed after first boot
```

Build-time: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, web's internal
`API_URL=http://api:3000`. Mobile: `EXPO_PUBLIC_API_URL` per EAS profile
(done) + `EAS_PROJECT_ID`. Off-server secrets (Play service-account JSON, ASC
API key, Expo login, SMTP, registrar) live in a password manager; verify
`play-service-account.json` is gitignored.

---

## 9. CI/CD Pipeline

Current CI already builds all four surfaces. Extend in three steps:

1. **Tests:** supertest API suite against a Postgres service container (the
   coded version of the 38 manual checks) + `npm audit --audit-level=high`
   per surface + Dependabot on all four `package.json` files.
2. **Auto-deploy server surfaces:** on green `main`, a deploy job SSHes to
   the VPS (deploy key in GitHub secrets): `git pull && docker compose -f …
   -f …prod.yml up -d --build`, then curl `/health`. Keep
   `workflow_dispatch` for pinned-SHA rollback deploys. Blue-green is
   overkill; compose rebuild costs seconds.
3. **Mobile lane stays manual** — store releases are deliberate events
   (`eas build` / `eas submit`). Add `eas update` (OTA) post-launch for
   JS-only hotfixes.

Rollback story: server = checkout last good SHA + rebuild (restore last DB
dump only if a migration broke); mobile = halt the staged Play rollout /
expedited Apple review — which is why Play always releases at
**20% → 50% → 100%**.

---

## 10. Apple App Store Plan

**Account (start immediately — longest lead time):** Apple Developer
Program, $99/yr. Enrolling as a company requires a **D-U-N-S number** (free,
days–weeks — the same number serves Google). Create the app record in App
Store Connect (bundle ID `com.sawacars.app`) → put its Apple ID into
`eas.json` `submit.production.ios.ascAppId`. Create an **App Store Connect
API key** for `eas submit`.

**Signing & build (no Mac needed):** `eas init` → `eas credentials`
generates and manages the distribution cert + provisioning profile + **APNs
key** (required — the app registers push tokens; test a real push via
TestFlight before submitting). `eas build --platform ios --profile
production` → `eas submit` → TestFlight internal pass first.

**Compliance specifics for this app:**

- Add `ITSAppUsesNonExemptEncryption: false` to `infoPlist` (standard HTTPS
  only) — skips the export-compliance questionnaire every build.
- App Privacy label: name, email, phone, photos (KYC + vehicle), messages,
  push identifiers — all "linked to user," none "used for tracking" →
  **no ATT prompt needed** (no ads/analytics SDKs).
- Email/password only means **no Sign in with Apple obligation** — adding the
  planned Google OAuth later *would* trigger it; defer.
- `supportsTablet: true` currently forces **iPad 13″ screenshots**.
  Recommendation: set it to `false` for v1 and ship iPhone-only.
- Screenshots: 6.9″ (1290×2796) + 6.5″ (1284×2778) sets.
- **Demo review account** (buyer, seeded with data) + notes on the seller
  flow — reviewers must reach core features, and they will test
  forgot-password and account deletion.
- Age rating questionnaire (expect 4+), support URL (`/contact`), privacy
  policy URL.

Review typically takes 24–72 h. Realistic rejection risks, in order: missing
account deletion, broken password reset, non-working demo account, iPad
screenshots mismatch.

---

## 11. Google Play Plan

**Account — the decision that drives the timeline ($25 one-time):**

- *Personal account:* new accounts must run a **closed test with ≥12 testers
  continuously enrolled for 14 days** before production access.
- *Organization account:* needs a D-U-N-S number but is **exempt from the
  12-tester rule**, and shows "Sawa Ltd" as the developer. **If
  Sawa is a registered company, choose this.**

**Setup:** create the app record; complete Store listing, App content
(privacy policy URL, ads = No, Data Safety form mirroring the Apple answers
**plus the account-deletion web URL**), content rating questionnaire. Create
a **service-account JSON** with Release Manager permission → save at the
path `eas.json` already expects (`../play-service-account.json`).

**Signing & release:** accept **Play App Signing** (Google holds the signing
key, EAS manages the upload key). `eas build --platform android --profile
production` (`.aab`; the API 36 pin already satisfies the 2026 target-API
policy). `eas submit` → internal track (as configured) → closed testing →
production at **staged 20% rollout**. Declared permissions (`CAMERA`,
`READ_MEDIA_IMAGES`) map to visible features — no sensitive-permission
declarations needed.

---

## 12. Store Asset Production Checklist

| Asset | Spec | Status |
|---|---|---|
| App icon master | 1024×1024 | ✅ exists |
| Play icon | 512×512 PNG | Export from master |
| Feature graphic (Play) | 1024×500 | ❌ create (brand red `#C63F3D`, logo, tagline) |
| iPhone screenshots | 5–8 per size class (6.9″ + 6.5″) | ❌ capture: Home, Car detail + inspection report, Search/filters, Seller pipeline, Chat, Duty calculator |
| Play screenshots | ≥4, 1080×1920+ | Same set |
| Splash | ≥1284-wide source | ⚠️ upgrade from 1024² |
| Descriptions | Play 80/4000 chars; Apple subtitle 30, description 4000, keywords 100 | ❌ write — lead with "every car inspected — 150 points" |
| Privacy policy URL | Public HTTPS | ✅ page exists — goes live with website |
| Support URL | Public HTTPS | ✅ `/contact` |
| Demo review accounts | Buyer + seller with seeded data | ❌ create on prod |

---

## 13. Best-Practice Recommendations

**Performance:** gzip/brotli in Nginx; long cache headers on `/uploads`;
compress photos on upload with `sharp` now, Cloudinary later — 36 raw phone
photos per car is the #1 bandwidth cost in a mobile-data market; verify
indexes on the hot filter columns (make, price, year, status); keep the
market-data LATERAL queries under `EXPLAIN ANALYZE` review as rows grow.

**Scalability:** one 8 GB VPS covers thousands of DAU for a browse-heavy API.
The sequence when needed: resize VPS → split Postgres out → N api containers
+ Socket.io redis adapter — with uploads moved to R2/Cloudinary first.

**Reliability:** DB-checking health endpoint, restart policies,
compose-on-boot, staged rollouts, OTA hotfixes, tested restores.

**Maintainability:** the mirrored business logic (`web/src/lib/business.ts` ↔
`src/data/*.js`) is the known trap — add a CI check that diffs the shared
constants so the same-commit rule is enforced by a robot, not memory; a
`CHANGELOG.md` per release; real DB migrations before schema change #1.

**Security:** everything in §3 plus quarterly dependency/access reviews,
JWT-secret and admin-password rotation on staff changes, admin 2FA in v1.1;
never let `admin.` cookies/JWT work on the public site origin.

---

## 14. Roadmap & Timeline

Engineering ≈ 2 weeks; store tracks run in parallel and dominate.

| Week | Engineering | Human / store track |
|---|---|---|
| **1** | P0 fixes: account deletion (API + app + web), SMTP + reset e2e, helmet + rate limits + reset-code caps, JWT 7d + revocation, multer 2.x, prod compose + Nginx configs | Register domain; buy VPS; **start D-U-N-S**; enroll Apple ($99) + Play ($25); decide personal vs org account |
| **2** | Deploy Phases A–D; backups + monitoring + restore test; full staging pipeline pass; CI tests + deploy job; splash redo | DNS live; privacy policy live; write listings; create app records; hand over Play JSON + ASC key |
| **3** | `eas build` both platforms; TestFlight + Play internal; push e2e; screenshots from real builds | Data Safety + App Privacy forms; ratings; recruit 12+ testers (if personal account) |
| **4** | Tester bug fixes; production candidate; seed demo review accounts | Play closed test running; **Apple: submit — can be live this week** |
| **5–6** | Hotfixes; monitor Sentry/uptime; supervise rollout | Play 14-day gate ends → production access → staged rollout → **both stores live** |

**Critical path:** D-U-N-S + developer enrollments start immediately; account
deletion and P0 hardening in week 1; website live in week 2 (privacy URL
gates both submissions); the staging pipeline pass closes the three
never-tested items before the first store build.

---

## 15. Master Launch Checklist

**Server** ▢ VPS hardened (SSH keys, ufw, fail2ban, auto-updates) ▢ DNS +
TLS on 4 hosts ▢ prod compose up, ports loopback-only ▢ CORS locked ▢ prod
secrets set, seed admin rotated ▢ Nginx body-size/WS/uploads/id-docs rules
▢ nightly pg_dump + restic offsite ▢ restore tested ▢ uptime probes + Sentry
▢ log rotation ▢ compose-on-boot ▢ health endpoint checks DB

**Backend** ▢ account deletion ▢ SMTP live, reset e2e ▢ helmet ▢ rate
limits ▢ reset-code attempt caps ▢ JWT 7d + revocation ▢ multer 2.x
▢ upload limits verified with real files ▢ RESET_CODE_ECHO unset ▢ API test
suite in CI

**Staging pass** ▢ full pipeline seller→buyer ▢ admin dashboard click-test
▢ KYC + 36-photo multipart uploads ▢ Socket.io chat over wss ▢ push received
on device ▢ forgot-password email received

**Mobile** ▢ eas init + projectId ▢ preview APK against prod API ▢ APNs key
▢ demo fallback gated to dev ▢ splash hi-res
▢ `ITSAppUsesNonExemptEncryption` ▢ tablet support decision ▢ version/build
numbers final

**Stores** ▢ accounts + payments ▢ D-U-N-S (if org) ▢ app records ▢ signing
handover (Play JSON, ASC key) ▢ privacy policy URL live ▢ account-deletion
URL ▢ Data Safety + App Privacy ▢ content ratings ▢ screenshots + feature
graphic ▢ descriptions ▢ demo review accounts ▢ internal test pass ▢ Play
closed test (14d if personal) ▢ Apple submission ▢ staged rollout plan

---

## 16. Services, Tools & Estimated Costs

| Service | Purpose | Cost |
|---|---|---|
| VPS (Hetzner CPX31-class) | All server surfaces | ~€16/mo |
| Domain `sawacars.com` | any registrar | ~$10–15/yr |
| Apple Developer Program | App Store | $99/yr |
| Google Play Console | Play Store | $25 once |
| Expo EAS | Builds/submit | $0 free tier (~30 builds/mo) |
| Let's Encrypt | TLS | $0 |
| Brevo | Transactional email (password reset) | $0 (300/day free) |
| Cloudflare R2 / Backblaze B2 | Offsite backups | ~$1–5/mo |
| Sentry | Crash/error reporting | $0 free tier |
| UptimeRobot / Better Stack | Uptime alerts | $0 free tier |
| D-U-N-S number | Org accounts | $0 (allow lead time) |
| **First-year total** | | **≈ $350–500 + ~€200 VPS** |

Post-launch (Phase 8, when justified): Cloudinary, Africa's Talking
SMS/WhatsApp, OneSignal.

---

*Companion docs: `deployment-runbook.md` (command-level VPS steps),
`docs/BACKEND-AUDIT.md`, `CLAUDE.md` §6 (playbook + guardrails).*
