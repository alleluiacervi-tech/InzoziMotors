# Inzozi Motors — Full Product Blueprint

> Modeled after Encar.com (Korea's #1 used car marketplace).  
> Inzozi Motors is the trusted middleman: we physically inspect every car, shoot professional photos, and list it ourselves. Sellers cannot post directly.

---

## Core Concept

| | Regular Marketplace | Inzozi Motors |
|---|---|---|
| Who lists? | Anyone | Only Inzozi team (after inspection) |
| Photos | Seller's phone photos | Our professional photographers |
| Inspection | None | 150-point certified check |
| Identity | Optional | Mandatory for sellers |
| Trust | Low | Maximum |

> No payment flow exists in the app. Buyers request to buy → coordinate offline. Payment integrations (MTN MoMo, DPO Pay) are a backend-phase feature.

---

## User Roles & Permissions

### Guest (no account)
- Browse all listings
- Search and filter
- View car detail pages and inspection reports
- View price history and market comparisons
- ❌ Cannot message anyone
- ❌ Cannot save/wishlist

### Buyer (registered — email or Google)
- Everything guests can do
- Save/wishlist cars
- Create saved search alerts
- Message sellers through in-app chat
- Make purchase requests
- Track purchase status

### Seller (verified — ID + selfie required)
- Everything buyers can do
- Submit cars for inspection
- Book inspection appointment slots
- Track listing status (Submitted → Scheduled → Inspected → Live → Sold)
- Receive and reply to buyer messages
- View listing analytics (views, inquiries, saves)

### Admin (Inzozi team only)
- Full access to everything
- Review and approve/reject seller ID submissions
- Schedule and manage inspection appointments
- Record 150-point inspection results
- Upload professional photos and create listings
- Publish/unpause/remove any listing
- Monitor all chats
- View full platform analytics

---

## The Listing Pipeline (How a Car Goes Live)

```
Seller submits car details + reference photos
        ↓
Admin reviews submission (24h)
        ↓
Admin schedules inspection appointment
        ↓
Seller brings car to Inzozi inspection center
        ↓
Inzozi mechanics complete 150-point checklist
        ↓
Inzozi photographer shoots 36-angle standardized photos
        ↓
Admin creates official listing
        ↓
Car goes LIVE on the marketplace
        ↓
Buyers browse → contact seller → purchase request → handover
```

---

## Current Codebase State

- **Framework**: Expo SDK 54, React Native 0.81.5, React Navigation v7
- **Brand color**: Deep Forest Green `#15803D` (Rwanda identity — "Land of a Thousand Hills")
- **Data**: 25 mock cars, all Kigali-localized, no real backend
- **State**: React Context only (`src/context/AppContext.js`) — no persistence, no auth
- **Run**: `npm start`

### Phase 1 — COMPLETE ✅

All screens built and wired as of Jun 28 2026:

**New screens created:**
- `src/screens/IDVerificationScreen.js` — Upload national ID front/back + selfie, 3 status states (upload / pending / approved)
- `src/screens/CarSubmissionScreen.js` — 4-step seller wizard: Vehicle Info → Condition → Photos → Price & Submit
- `src/screens/InspectionSchedulingScreen.js` — Choose center (3 Kigali locations), 10-day date picker, time slot grid, booking confirmation
- `src/screens/AdminPanelScreen.js` — Stats banner, 3 tabs: ID Queue (approve/reject) / Inspections (today + upcoming) / Listings

**Screens rewritten/updated:**
- `src/screens/SellerDashboardScreen.js` — Pipeline diagram (Review→Scheduled→Inspected→Live→Sold), 3 mock submissions in different stages, stats banner
- `src/screens/ProfileScreen.js` — Seller menu section, buyer menu section, "Team Portal" link to AdminPanel
- `src/theme/colors.js` — Full brand migration to Forest Green, added pipeline status color tokens
- `src/context/AppContext.js` — Added submissions[], pendingVerifications[], adminInspections[], all related actions
- `src/navigation/RootNavigator.js` — Registered IDVerification, CarSubmission, InspectionScheduling, AdminPanel

---

## Phase 2: Trust Engine — ✅ COMPLETE (Jun 28, 2026)

| Screen | File | Notes |
|---|---|---|
| 150-pt Inspection Form | InspectionFormScreen.js | ✅ 7-category checklist, Pass/Flag/Fail per item, generates report |
| Photo Upload (36 angles) | PhotoUploadScreen.js | ✅ Angle guide silhouettes, upload progress tracker |
| Inspection Report (buyer) | InspectionReportScreen.js | ✅ Full structured pass/fail with per-category score bars |
| Vehicle History Card | VehicleHistoryScreen.js | ✅ Ownership, accidents, mileage verify, RRA stamp |
| Seller Profile | SellerProfileScreen.js | ✅ Trust score circle, breakdown, reviews, listings |
| Notification Center | NotificationCenterScreen.js | ✅ Grouped by date, price drops, messages, search matches |

### 150-Point Inspection Form (Admin)
Categories (mechanic fills on tablet at center):
1. Engine & Drivetrain — oil, coolant, timing belt, air filter, mounts (25 pts)
2. Brakes & Steering — pads, fluid, alignment, power steering (25 pts)
3. Body & Exterior — panel gaps, paint, windscreen, lights (20 pts)
4. Interior & Comfort — seats, dashboard, AC, windows (20 pts)
5. Electronics & Safety — battery, OBD scan, airbags, traction control (20 pts)
6. Tyres & Wheels — tread depth × 4, pressures (15 pts)
7. Documentation — registration, service history, import docs, insurance, RRA proof (25 pts)

Each item: Pass ✓ / Flag ⚠ / Fail ✗  
Submit → generates buyer-facing Inspection Report with overall score and flagged items.

### Seller Trust Score (100 pts total)
- ID Verified: 30 pts
- Completed Sales (1pt each, up to 30): 30 pts max
- Response Rate (messages replied within 24h): 20 pts
- Buyer Reviews (avg rating × 4): 20 pts max

### Vehicle History Card
- Number of previous owners
- Accident history (insurance partner integration concept)
- Mileage verification (cross-check odometer vs service records)
- Import origin + year (most Rwanda cars = Japanese imports)
- Rwanda RRA duty paid stamp
- Active insurance check

---

## Phase 3: Communication & Transactions — ✅ COMPLETE (Jun 28, 2026)

| Screen | File | Notes |
|---|---|---|
| Notification Center | NotificationCenterScreen.js | ✅ Price drops, messages, listing updates, saved search alerts |
| Purchase Request | CheckoutScreen.js (updated) | ✅ Confirm intent → next-steps timeline, no payment |
| Order Tracking | OrderTrackingScreen.js | ✅ Status diagram: Request → Confirmed → Handover → Complete |

---

## Phase 4: Buyer Power Tools — ✅ COMPLETE (Jun 28–29, 2026)

| Screen | File | Notes |
|---|---|---|
| Saved / Wishlist | SavedScreen.js | ✅ Dual-tab: Cars + Searches, price change indicators |
| Saved Search Alerts | SavedScreen.js (Searches tab) | ✅ Toggle notifications per saved search |
| Comparison Tool | ComparisonScreen.js | ✅ 3-car side-by-side, winner highlight per row |
| Price Intelligence | VehicleDetailScreen.js (enhanced) | ✅ Market diff %, sparkline chart, RWF/USD toggle |
| Map View | MapScreen.js | ✅ Custom Kigali neighborhood grid, no external map lib |
| Import Duty Calculator | DutyCalculatorScreen.js | ✅ Full Rwanda RRA duty breakdown |

---

## Phase 5: Growth Features — ✅ COMPLETE (Jun 29, 2026)

| Screen | File | Notes |
|---|---|---|
| AI Price Suggestion | CarSubmissionScreen.js (Step 3) | ✅ Mock AI suggestion with in-range check |
| Seller Analytics | SellerAnalyticsScreen.js | ✅ SVG bar chart, metric cards, time-on-market |
| Admin Analytics | AdminAnalyticsScreen.js | ✅ Pipeline funnel, top-makes chart, center utilization |
| Dealer Profile | DealerProfileScreen.js | ✅ Branded hero, listings grid, priority badge |
| Financing Calculator | FinancingScreen.js | ✅ 4 banks, PMT formula, estimate-only disclaimer |
| Trust Score Page | TrustScoreScreen.js | ✅ SVG gauge, A–D grade, full breakdown |
| Referral Program | ReferralScreen.js | ✅ Referral code, WhatsApp share, rewards tracker |
| Relist Flow | SellerDashboardScreen.js (updated) | ✅ Inline price input + confirm for unsold listings |

---

## Design System

### Colors (actual codebase values — `src/theme/colors.js`)
```
Primary Green:    #15803D   — CTAs, tabs, active states, badges (brand color)
Green Bright:     #16A34A   — button fill, hover states
Green Light:      #4ADE80   — icon glow, illustrations
Green Tint:       #F0FDF4   — light backgrounds, chip fills

Welcome gradient: #052E16 → #14532D → #166534   (dark forest green)

Status — Pending:    text #D97706  bg #FEF3C7   (amber)
Status — Scheduled:  text #1D4ED8  bg #EFF6FF   (blue)
Status — Live:       text #15803D  bg #F0FDF4   (green)
Status — Sold:       text #6B7280  bg #F5F5F5   (gray)
Status — Rejected:   text #DC2626  bg #FEF2F2   (red)

Background:   #FAFAFA
Surface:      #FFFFFF
Alt Surface:  #F5F5F5
Border:       #E5E5E5
Soft Border:  #F0F0F0

Text Primary:   #1A1A1A
Text Secondary: #404040
Text Muted:     #737373
Amber:          #D97706
Alert Red:      #DC2626
```

### Listing Status Colors
```
under_review → Amber  #D97706   "Under Review"
scheduled    → Blue   #1D4ED8   "Inspection Booked"
inspecting   → Blue   #1D4ED8   "Being Inspected"
live         → Green  #15803D   "Active Listing"
sold         → Gray   #6B7280   "Completed"
rejected     → Red    #DC2626   "Action Required"
```

### Badge System
```
"Inzozi Certified"  → Green pill  — passed full 150-pt check
"Verified Seller"   → Green pill  — ID confirmed
"7-Day Return"      → Tag         — return policy applies
"Below Market"      → Green tag   — priced under market avg
"Price Drop"        → Amber tag   — recently reduced
"New Listing"       → Tag         — listed in last 48h
"High Demand"       → Red tag     — 10+ people saved this
```

### Photography Standard (Encar-style 36 angles)
Every listing must include these shots — admin uploads, not seller:
```
Exterior (8):  Front · Front-Left 45° · Left Side · Rear-Left 45°
               Rear · Rear-Right 45° · Right Side · Front-Right 45°
Details (8):   Roof · Underbody · Wheel ×4 · Tyre tread ×4
Under Hood (2): Engine bay · Engine serial number
Instruments (2): Odometer reading · VIN plate
Interior (6):  Dashboard full · Infotainment · Driver seat
               Rear seats · Boot/trunk · Headliner
Defects (any): Honest close-ups of any damage noted in inspection
```

---

## World-Class Recommendations (Encar-Level Features)

### Trust & Verification
1. **Rwanda RRA Vehicle Check** — Partner with Rwanda Revenue Authority to cross-check chassis number, ownership history, import duty status. Show as a verified stamp on every listing.
2. **Mileage Verification** — Cross-reference odometer with service history and government records. Flag if mileage appears tampered.
3. **Accident History Report** — Partner with Rwandan insurance companies to pull accident claim history by plate/chassis number.
4. **VIN Decoder** — Auto-populate make, model, year, trim from VIN entry on submission form.
5. **Seller Trust Score** — Composite 100-point score: ID verified (30) + completed sales (30) + response rate (20) + buyer reviews (20).

### Buyer Experience
6. **Price Intelligence** — Market average for same make/model/year. Label each listing "7% below market" or "12% above market" with color indicator.
7. **Price History Sparkline** — Small chart on car detail showing how listing price changed since going live.
8. **"X people saved this"** — Social proof creating urgency without being fake.
9. **"Listed N days ago"** — Transparency builds trust.
10. **Similar Cars Carousel** — Bottom of car detail: same make/category/price range. Keeps buyers in the funnel.
11. **Comparison Tool** — Select up to 3 cars, see specs head-to-head in a table. Encar's most-used power feature.
12. **Saved Search Alerts** — "Notify me when a Toyota RAV4 under $30k is listed." Core re-engagement loop.
13. **Video Walkaround** — 60-second standardized video per car, shot by our team. Massive trust builder.

### Rwanda-Specific
14. **Import Duty Calculator** — Most Rwanda cars are imported. Show estimated RRA import duty so buyers understand total cost.
15. **RWF / USD Toggle** — Display prices in both Rwandan Francs and USD. $31,500 ≈ 41M RWF.
16. **MTN MoMo + Airtel Money** — Primary payment methods in Rwanda. Non-negotiable for backend phase.
17. **Kinyarwanda Language** — Language toggle: English / Kinyarwanda. Expands addressable market significantly.
18. **WhatsApp Notifications** — Rwanda's dominant communication channel. Listing status, messages, price drops.
19. **Left vs Right Hand Drive flag** — Important in Rwanda where both exist. LHD = local; RHD = Japanese imports. Add as filter.
20. **Neighborhood-level location** — Not just "Kigali" but "Nyarutarama", "Remera", "Kicukiro". Buyers care about handover location.

### Seller Experience
21. **AI Price Suggestion** — In submission wizard: "Based on 12 similar cars sold in Kigali, we suggest RWF 18M–22M."
22. **Listing Status Timeline** — Visual pipeline so sellers always know exactly what stage their car is at.
23. **Seller Analytics** — Views/day, saves, messages received, time on market vs category average.
24. **Appointment Reminders** — WhatsApp + SMS 24h and 1h before inspection appointment.
25. **Re-listing Flow** — If car doesn't sell, one-tap re-list at a new price with a "New Price" badge.

### Platform & Operations
26. **Admin Inspection Checklist App** — Mechanic fills structured checklist on tablet at inspection center. Results auto-generate buyer-facing report.
27. **Photo Angle Guide** — In admin photo upload: show silhouette guide for each required angle so every listing looks identical and professional.
28. **Dealer Accounts** — Professional dealers get branded profile, bulk submission, priority scheduling, lower commission.
29. **Multiple Inspection Centers** — Each center has its own schedule. System routes sellers to nearest available.
30. **Dispute Resolution Flow** — In-app process to raise a dispute after handover. Admin mediates. Builds enormous trust.

### Engagement & Retention
31. **"New This Week" Badge** — Flags cars listed in last 7 days. Creates a habit of checking back.
32. **Price Drop Alerts** — Buyers who saved a car get notified immediately when price drops.
33. **"High Demand" Signal** — When 10+ people save a car, show red "High Demand" badge. True scarcity signal.
34. **Buyer Reviews** — After successful purchase, buyer leaves a review of the seller. Visible on seller profile.
35. **Referral Program** — Seller refers another seller → gets commission discount on their next listing.

---

## Tech Stack Recommendation (Production)

### Frontend (current)
- React Native + Expo SDK 54 ✓
- React Navigation v7 ✓

### Backend (to build — Phase 6+)
- **Database**: PostgreSQL on VPS
- **Auth**: JWT-based (email + Google OAuth via Passport.js or similar)
- **Storage**: Local disk or Cloudflare R2 — for 36-angle photos per car
- **Real-time Chat**: Socket.io (WebSocket) on the same Node.js server
- **Push Notifications**: Expo Notifications + OneSignal
- **SMS/WhatsApp**: Africa's Talking (Rwanda-focused, supports SMS and WhatsApp Business API)
- **Image optimization**: Cloudinary — auto-compress and serve inspection photos

### Admin Panel
- React Native Web (same codebase) — or separate Next.js web admin dashboard

---

## Business Model

| Revenue Stream | Who Pays | Notes |
|---|---|---|
| Seller listing fee | Seller | Fixed fee per car submitted |
| Success commission | Seller | % of sale price on completion |
| Featured listing | Seller | Boost to top of feed |
| Inspection-only | Seller | For sellers who want a report without listing |
| Dealer subscription | Dealer | Monthly flat fee for bulk listings + analytics |

---

## All Screens — Current Status

### Phase 1 ✅ Complete

| Screen | File | Status |
|---|---|---|
| Welcome | WelcomeScreen.js | ✅ Done |
| Sign In | SignInScreen.js | ✅ Done |
| Sign Up | SignUpScreen.js | ✅ Done |
| Home / Browse | HomeScreen.js | ✅ Done |
| Search | SearchScreen.js | ✅ Done |
| Search Results | SearchResultsScreen.js | ✅ Done |
| Filters | FiltersScreen.js | ✅ Done |
| Car Detail | VehicleDetailScreen.js | ✅ Done |
| Request to Buy | CheckoutScreen.js | ✅ Done (no payment) |
| Messages | MessagesScreen.js | ✅ Done |
| Chat | ChatScreen.js | ✅ Done |
| Seller Dashboard | SellerDashboardScreen.js | ✅ Done (pipeline) |
| Profile | ProfileScreen.js | ✅ Done (with seller paths) |
| Settings | SettingsScreen.js | ✅ Done |
| ID Verification | IDVerificationScreen.js | ✅ Done (Phase 1 new) |
| Car Submission | CarSubmissionScreen.js | ✅ Done (Phase 1 new) |
| Inspection Scheduling | InspectionSchedulingScreen.js | ✅ Done (Phase 1 new) |
| Admin Panel | AdminPanelScreen.js | ✅ Done (Phase 1 new) |
| Inspection Report | InspectionReportScreen.js | ✅ Basic version |
| Listing Wizard | ListingWizardScreen.js | ✅ Done (admin path) |

### Phase 2 — Trust Engine ✅ Complete (Jun 28, 2026)

| Screen | File | Status |
|---|---|---|
| 150-pt Inspection Form | InspectionFormScreen.js | ✅ Done |
| Photo Upload (36 angles) | PhotoUploadScreen.js | ✅ Done |
| Inspection Report (full) | InspectionReportScreen.js | ✅ Done |
| Vehicle History Card | VehicleHistoryScreen.js | ✅ Done |
| Seller Profile | SellerProfileScreen.js | ✅ Done |
| Notification Center | NotificationCenterScreen.js | ✅ Done |

### Phase 3 — Communication & Transactions ✅ Complete (Jun 28, 2026)

| Screen | File | Status |
|---|---|---|
| Purchase Request | CheckoutScreen.js (updated) | ✅ Done |
| Order Tracking | OrderTrackingScreen.js | ✅ Done |
| Notification Center | NotificationCenterScreen.js | ✅ Done |

### Phase 4 — Buyer Power Tools ✅ Complete (Jun 28–29, 2026)

| Screen | File | Status |
|---|---|---|
| Saved / Wishlist | SavedScreen.js | ✅ Done (dual-tab: Cars + Searches) |
| Saved Search Alerts | SavedScreen.js (Searches tab) | ✅ Done |
| Comparison Tool | ComparisonScreen.js | ✅ Done (3-car, winner highlight) |
| Price Intelligence | VehicleDetailScreen.js (enhanced) | ✅ Done (sparkline, market diff, RWF) |
| Map View | MapScreen.js | ✅ Done (custom Kigali grid, no maps lib) |
| Import Duty Calculator | DutyCalculatorScreen.js | ✅ Done (full RRA breakdown) |

### Phase 5 — Growth Features ✅ Complete (Jun 29, 2026)

| Screen | File | Status |
|---|---|---|
| AI Price Suggestion | CarSubmissionScreen.js (Step 3) | ✅ Done (mock AI, in-range check) |
| Seller Analytics | SellerAnalyticsScreen.js | ✅ Done (SVG bar chart, metric cards) |
| Admin Analytics | AdminAnalyticsScreen.js | ✅ Done (funnel, top-makes, center util) |
| Dealer Profile | DealerProfileScreen.js | ✅ Done (branded hero, listings grid) |
| Financing Calculator | FinancingScreen.js | ✅ Done (4 banks, PMT formula, estimate-only) |
| Trust Score Page | TrustScoreScreen.js | ✅ Done (SVG gauge, A–D grade, breakdown) |
| Referral Program | ReferralScreen.js | ✅ Done (code, WhatsApp concept, rewards) |
| Relist Flow | SellerDashboardScreen.js (updated) | ✅ Done (inline TextInput + confirm) |

### Phase 6 — Backend Integration (PLANNED)

**Backend tasks (when frontend investor-approved):**
- [ ] Set up Supabase project — PostgreSQL schema for cars, users, submissions, inspections, messages
- [ ] Implement Supabase Auth — email + Google OAuth, role-based (buyer/seller/admin)
- [ ] Replace mock cars data with Supabase queries
- [ ] Replace AppContext mock state with Supabase real-time subscriptions
- [ ] Implement Supabase Storage for inspection photos (36 angles per car)
- [ ] Implement real-time chat via Supabase Realtime (WebSocket)
- [ ] Implement push notifications via Expo Notifications + OneSignal
- [ ] Integrate Africa's Talking for SMS + WhatsApp notifications (Rwanda)
- [ ] Integrate DPO Pay for MTN MoMo + Airtel Money payment requests
- [ ] Integrate Cloudinary for image optimization and CDN delivery
- [ ] Connect Rwanda RRA API for duty verification stamps (if public API available)
- [ ] Deploy admin panel as Next.js web app (separate from mobile)
- [ ] Set up CI/CD pipeline (GitHub Actions → Expo EAS Build)

---

# Phase 6 — Production Deployment Guide

> This file is read automatically by Claude Code at the start of every session and
> acts as your standing instructions for this project. Replace every `PLACEHOLDER`
> below before first use. See the note at the bottom about trimming this file once
> the one-time setup is done (it reloads every session, so keep it lean long-term).

---

## 1. Values to fill in (do this first)

| Placeholder | Replace with |
|---|---|
| `YOUR_SERVER_IP` | VPS public IP |
| `api.yourdomain.com` | API subdomain |
| `com.yourcompany.yourapp` | bundle ID / package name |
| `REPO_URL` | git URL of the **single repo** holding both halves |
| `mobile/` | folder containing the Expo app (adjust to your real path) |
| `backend/` | folder containing the Node.js API (adjust to your real path) |
| `APP_PORT` | port the backend listens on (default 3000) |
| `DEPLOY_USER` | the non-root sudo user on the VPS (default `deploy`) |

---

## 2. Project overview

This is a **single (mono)repo** containing two halves that deploy to completely
different places:

```
REPO_URL  (one repo)
├── mobile/     <- Expo / React Native app  -> App Store + Play Store (NOT a server)
├── backend/    <- Node.js API              -> Ubuntu VPS at https://api.yourdomain.com
└── (optional)  package.json workspaces / turbo.json / shared packages
```

- **Frontend (`mobile/`)** — built with **Expo**, distributed through the
  **Apple App Store** and **Google Play Store**. It is NOT hosted on a server.
- **Backend (`backend/`)** — a **Node.js** API running on an **Ubuntu VPS**,
  reachable at `https://api.yourdomain.com`. The app calls this URL.

Data flow: `Expo app (phone)  ->  https://api.yourdomain.com  ->  Node.js + database on VPS`

**Key monorepo rule:** the two halves never deploy together. The VPS only ever
runs `backend/`; the stores only ever receive `mobile/`. Run backend commands
from `backend/` and EAS commands from `mobile/`.

---

## 3. Tech stack & infrastructure

- **Backend:** Node.js (Express or similar), PostgreSQL (adapt if different).
- **App:** Expo + EAS Build (cloud builds; iOS builds without a Mac).
- **Server:** Ubuntu 24.04 VPS, Nginx reverse proxy, PM2 process manager,
  Let's Encrypt (Certbot) for SSL.
- **Build/release:** `eas build` produces `.aab` (Android) / `.ipa` (iOS);
  `eas submit` uploads them to the stores.

---

## 4. Key commands

**Backend (on the VPS, run from `backend/`):**
```bash
cd backend
npm install            # install deps (see monorepo note below)
npm run build          # if TypeScript
pm2 restart api        # apply new code
pm2 logs api           # check logs
```

**Expo app (locally, run from `mobile/`):**
```bash
cd mobile
npx expo install --fix                                   # keep SDK consistent
eas build --platform android --profile production        # build AAB
eas build --platform ios --profile production            # build IPA
eas submit --platform android --profile production       # upload to Play
eas submit --platform ios --profile production           # upload to App Store
```

**Monorepo install note:** if you use npm/yarn/pnpm **workspaces**, dependencies
may hoist to the repo root. On the VPS you then run `npm install` at the repo
root once (not just in `backend/`), or use `npm ci --workspace backend`. If the
two folders are independent (each with its own `package.json` and no workspace
config), just install inside `backend/` as shown. Tell Claude Code which setup
you use.

---

## 5. What you (Claude Code) are allowed to do — IN SCOPE

You may help with all of the following. Always follow the guardrails in section 7.

1. **Edit Expo config:** create/update `eas.json` and `app.json` for production
   builds, including `expo-build-properties` so Android targets API level 36.
2. **Run EAS builds and submissions** when I ask.
3. **Provision and operate the VPS over SSH** (see the playbook in section 6),
   running the Nginx / PM2 / Certbot setup.
4. **Run the redeploy routine** after backend code changes:
   `git pull` at the repo root, then `cd backend && npm install && npm run build && pm2 restart api`.
5. **Fix backend issues** (CORS, host binding, env wiring) so the Expo app can
   reach the API through Nginx.

---

## 6. Deployment playbook (how to do each task)

> Detailed copy-paste commands live in `deployment-runbook.md`. Read that file
> before executing infra steps. Below is the order you should follow and the
> checkpoints where you MUST stop and ask me.

### A. VPS backend (one-time)
1. SSH in, update packages, create `DEPLOY_USER` with sudo, copy SSH keys.
2. **CHECKPOINT — ask me to confirm I can log in as `DEPLOY_USER` in a separate
   terminal BEFORE you disable root SSH or password auth.** Do not skip this.
3. Configure the firewall (OpenSSH, 80, 443).
4. Install Node via nvm; install the database; create the DB and user.
5. Clone `REPO_URL` (the whole monorepo). Then build **only the backend**:
   `cd backend`, install deps (root install if workspaces — see section 4 note),
   `npm run build`. The `mobile/` folder is never built or run on the server.
   **Ask me to paste the `.env` values myself — do not generate or guess secrets.**
6. Start under PM2, enable startup on boot, save.
7. **CHECKPOINT — tell me to add the DNS A record** (`api.yourdomain.com` ->
   `YOUR_SERVER_IP`) and confirm it resolves before continuing.
8. Configure Nginx as a reverse proxy to `localhost:APP_PORT`, test, reload.
9. Run Certbot for SSL on `api.yourdomain.com`; verify auto-renewal.
10. Report the live `https://` URL back to me.

### B. Expo config & build (run from `mobile/`)
1. Set `version`, `ios.bundleIdentifier`, `android.package` in `app.json` to
   `com.yourcompany.yourapp`; put the API URL in `extra.apiUrl`.
2. Add the `expo-build-properties` plugin with `targetSdkVersion: 36` and
   `compileSdkVersion: 36`; run `npx expo install expo-build-properties`.
3. **Monorepo wiring:** ensure `mobile/metro.config.js` watches the repo root and
   resolves modules from both `mobile/node_modules` and the root `node_modules`
   (standard Expo monorepo setup). Add a `mobile/.easignore` so EAS doesn't
   upload `backend/` and other unrelated folders into the build.
4. Create `eas.json` (inside `mobile/`) with `preview` (internal APK) and
   `production` profiles. Run all `eas` commands from `mobile/`.
5. Run the production build for the platform I ask for.
6. **CHECKPOINT — submission needs my credentials.** For `eas submit`, prompt me
   for the Google service-account JSON path (Android) or my Apple credentials
   (iOS). I will provide these; do not fabricate them.

### C. Redeploy (recurring)
On request, from the repo root: `git pull`, then
`cd backend -> npm install -> npm run build -> pm2 restart api`,
then confirm with `pm2 logs api`. Only the backend is redeployed this way;
shipping app changes goes through `eas build`/`eas submit` from `mobile/`.

---

## 7. Guardrails — rules you MUST follow

- **Always ask before** anything destructive or privileged: `sudo`, `rm`,
  deleting files, `git push`, DNS changes, Certbot runs, dropping DB tables,
  restarting/rebooting the server.
- **Never print, copy, or paste secrets.** Do not read `.env`, key files, or
  credentials into the conversation. I will provide secret values directly when
  needed. (Note: deny rules are best-effort — you still must not try to surface
  secrets via any tool.)
- **Production server = high care.** State exactly what a command will do before
  running it on `YOUR_SERVER_IP`. Prefer dry-runs where available
  (e.g. `certbot renew --dry-run`, `nginx -t` before reload).
- **Don't disable root SSH** until I confirm the `DEPLOY_USER` login works.
- **Use placeholders** and ask me for real values rather than inventing them.
- If a step is one of my manual tasks (section 8), stop and hand it back to me.

---

## 8. What I (the human) do myself — OUT OF SCOPE for Claude Code

These are account-, payment-, or browser-gated and cannot be automated:

- [ ] Pay **$25 one-time** Google Play Console fee + identity verification.
- [ ] Pay **$99/year** Apple Developer Program fee + enrollment (D-U-N-S if a company).
- [ ] Create the **Play Console** and **App Store Connect** app records.
- [ ] Generate signing credentials I must hand over: a **Google Play
      service-account JSON** key, and an **App Store Connect API key** (or Apple ID).
- [ ] Host a **privacy policy** URL on my domain.
- [ ] Write store listings: title, descriptions, **screenshots**, feature graphic.
- [ ] Complete the **content rating** questionnaire and **Data Safety / App Privacy**
      forms.
- [ ] Provide all **secret values** (`.env`, DB password, API keys) when asked.
- [ ] Click **Submit for review** and respond to any reviewer feedback.
- [ ] Buy the VPS and the domain; point the **DNS A record**.

**Division of labour:** While Claude Code does sections 6A–6B, I do section 8 in
parallel, then hand it the service-account key / Apple credentials so it can run
`eas submit`.

---

## 9. Recommended permissions config

Create `.claude/settings.json` in this project with the block below. It blocks
destructive/privileged commands by default and protects secret files, while
letting the routine work flow. Tune as you go.

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(eas:*)",
      "Bash(git status)",
      "Bash(git pull)",
      "Bash(pm2 logs:*)",
      "Bash(nginx -t)",
      "Read(**)",
      "Edit(**)"
    ],
    "ask": [
      "Bash(ssh:*)",
      "Bash(scp:*)",
      "Bash(pm2 restart:*)",
      "Bash(systemctl:*)",
      "Bash(certbot:*)",
      "Bash(git push:*)"
    ],
    "deny": [
      "Bash(sudo:*)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Read(.env*)",
      "Read(**/.env)",
      "Read(**/*.pem)",
      "Read(**/*service-account*.json)"
    ]
  }
}
```

> `sudo` is denied here, which means server steps that need root will stop and
> ask. If you'd rather it run unattended on a fresh server, move specific `sudo`
> commands to `ask` instead of a blanket `deny`. Never blanket-`allow` `sudo`.

---

---

# Master Implementation Todo List

> All phases. Admin dashboard = browser (Next.js web app, separate from mobile).
> Mobile app = Expo React Native. Backend = Node.js + PostgreSQL on VPS.
> Items marked ✅ are complete in the codebase. Items marked 🔲 are planned.

---

## Phase 1–5 — Mobile App ✅ Complete

All screens built and wired. See screen table above for full list.

---

## Phase 6 — Backend API 🔲 In Progress

### 6A. Infrastructure (do when VPS is purchased)
- [ ] Buy VPS (Ubuntu 24.04 recommended) — get IP address
- [ ] Buy domain (e.g. api.inzozimotors.rw) — optional for dev, required for HTTPS
- [ ] SSH in, create deploy user, configure firewall (ports 22, 80, 443, 3000)
- [ ] Install Node.js via nvm, install PostgreSQL
- [ ] Create database: `inzozi_motors`, create user, grant permissions
- [ ] Clone repo to VPS, `cd backend`, `npm install`
- [ ] Copy `.env.example` → `.env`, fill in all values (DB password, JWT secret)
- [ ] Run `node src/db-init.js` to create all tables
- [ ] Start with PM2: `pm2 start server.js --name api`, `pm2 save`, `pm2 startup`
- [ ] Configure Nginx reverse proxy (localhost:3000 → public)
- [ ] (Optional) Add Certbot SSL once domain is pointed at server

### 6B. Backend Routes — Scaffolded ✅
- [x] `POST /auth/register` — register buyer or seller
- [x] `POST /auth/login` — returns JWT
- [x] `GET /auth/me` — current user profile
- [x] `GET /cars` — browse with filters (make, price, year, fuel, transmission, location)
- [x] `GET /cars/:id` — car detail + view count increment
- [x] `POST /cars` (admin) — create live listing after inspection
- [x] `PATCH /cars/:id/status` (admin) — update listing status
- [x] `POST /cars/save/:id` — toggle save/unsave
- [x] `GET /cars/saved/list` — buyer's saved cars
- [x] `POST /submissions` — seller submits car for inspection
- [x] `GET /submissions` — seller sees their own pipeline
- [x] `GET /submissions/admin/all` (admin) — all submissions
- [x] `PATCH /submissions/:id` (admin) — approve, schedule, reject
- [x] `POST /handovers` — buyer books a handover slot → car reserved
- [x] `GET /handovers/my` — buyer's bookings
- [x] `GET /handovers` (admin) — all pending handovers
- [x] `PATCH /handovers/:id/confirm` (admin) — confirm → sold → listing archived
- [x] `PATCH /handovers/:id/cancel` — buyer cancels
- [x] `GET /messages/conversations` — user's conversation list
- [x] `GET /messages/conversations/:id` — message history
- [x] `POST /messages/conversations` — start new conversation
- [x] `POST /messages/conversations/:id` — send message
- [x] `GET /notifications` — user's notifications
- [x] `PATCH /notifications/:id/read` — mark read
- [x] `PATCH /notifications/read-all` — mark all read
- [x] Socket.io — real-time chat (join_conversation, send_message, typing indicator)

### 6C. Backend Routes — Still To Build 🔲
- [ ] `POST /auth/id-verification` — seller uploads ID photos (multer)
- [ ] `PATCH /auth/id-verification/:userId` (admin) — approve / reject
- [ ] `POST /inspections/:id/complete` (admin) — record 150-pt checklist results + score
- [ ] `GET /inspections` (admin) — all scheduled inspections
- [ ] `POST /cars/:id/photos` (admin) — upload 36-angle inspection photos (multer)
- [ ] `GET /cars/:id/inspection-report` — full structured inspection report
- [ ] `GET /cars/:id/history` — vehicle history card
- [ ] `POST /saved-searches` — create a saved search alert
- [ ] `GET /saved-searches` — list user's saved searches
- [ ] `DELETE /saved-searches/:id`
- [ ] `POST /reviews` — buyer leaves review after handover
- [ ] `GET /users/:id/reviews` — seller's reviews
- [ ] `GET /users/:id/trust-score` — computed trust score breakdown
- [ ] `POST /cars/:id/compare` — add to comparison session (or handle client-side)
- [ ] `GET /admin/stats` (admin) — platform overview numbers
- [ ] `GET /admin/analytics` (admin) — funnel, top makes, center utilisation

### 6D. Connect Mobile App to API 🔲
- [ ] Create `src/api/client.js` in mobile — Axios or fetch wrapper with base URL + JWT header
- [ ] Create `src/api/auth.js` — login, register, me
- [ ] Create `src/api/cars.js` — browse, detail, save
- [ ] Create `src/api/submissions.js`
- [ ] Create `src/api/handovers.js`
- [ ] Create `src/api/messages.js`
- [ ] Create `src/api/notifications.js`
- [ ] Replace `AppContext` mock state with real API calls + loading/error states
- [ ] Replace mock `cars` data with API browse response
- [ ] Wire `SignInScreen` / `SignUpScreen` to `POST /auth/login` and `/register`
- [ ] Store JWT in `SecureStore` (expo-secure-store), attach to all requests
- [ ] Wire Socket.io client in `ChatScreen` for real-time messages
- [ ] Wire push notifications (Expo Notifications + OneSignal)

---

## Phase 7 — Admin Web Dashboard 🔲

> Browser app (Next.js). Separate from the mobile app. Deployed to same VPS or Vercel.
> Uses the same backend API — admin JWT gives full access.

### Core pages
- [ ] `/login` — admin login (same `/auth/login` endpoint, role check)
- [ ] `/dashboard` — platform stats: listings, submissions, handovers today, revenue
- [ ] `/submissions` — table of all submissions, filter by status, approve/reject/schedule
- [ ] `/inspections` — calendar view of scheduled inspections per center
- [ ] `/inspections/:id` — fill in 150-pt checklist, upload photos, submit report
- [ ] `/listings` — all live cars, pause/unpublish, edit price
- [ ] `/handovers` — pending handovers table, "Confirm → Mark Sold" button
- [ ] `/users` — all registered users, view/edit role, approve ID verifications
- [ ] `/users/:id/verification` — view ID photos, approve or reject
- [ ] `/analytics` — submission funnel, sales by make, center utilisation, revenue chart
- [ ] `/cars/new` — admin creates a listing after inspection (fills all fields, uploads 36 photos)

### Tech for admin web
- [ ] Scaffold `admin/` folder with Next.js 15 App Router
- [ ] Set up Tailwind CSS + shadcn/ui components
- [ ] API client (`admin/lib/api.ts`) — same backend, admin JWT
- [ ] Auth middleware — redirect to `/login` if no valid admin JWT
- [ ] File upload UI for 36-angle photos (drag-and-drop grid matching the 36 required angles)
- [ ] Inspection checklist form (7 categories × Pass/Flag/Fail — mirrors `InspectionFormScreen.js`)
- [ ] Deploy to same VPS under Nginx (e.g. `admin.inzozimotors.rw`)

---

## Phase 8 — Integrations 🔲

- [ ] **Africa's Talking** — SMS + WhatsApp notifications (Rwanda)
  - Handover booking confirmation → WhatsApp the buyer + seller
  - 24h reminder before handover
  - Price drop alert → WhatsApp saved-car watchers
- [ ] **Cloudinary** — image optimisation + CDN for inspection photos
  - Auto-compress on upload, serve WebP via CDN URL
  - Replace local `UPLOAD_DIR` with Cloudinary URLs in `cars.images[]`
- [ ] **OneSignal** — push notifications to the mobile app
  - New message, handover confirmed, saved search match, price drop
- [ ] **Rwanda RRA** — vehicle duty verification stamp (if public API available)
  - Cross-check VIN / chassis number → duty paid status on listing page
- [ ] **MTN MoMo / Airtel Money** — future payment-request feature (backend-phase only)
  - Not in app. Backend escrow when Inzozi physically holds the handover payment.

---

## Business Model (agreed)

| Stream | Who pays | When |
|---|---|---|
| Certification fee | Seller | Upfront — covers inspection + photos + listing |
| Success commission | Seller | Small % when admin confirms handover |
| Featured listing | Seller | Optional boost to top of feed |

- Buyers pay nothing, ever.
- The 7-day return guarantee applies only to handovers completed at the Inzozi center.
- Payment is physical at the center — not in the app, not now, not later.
- Commission is collectable because the handover (admin confirms) is the sale event — Inzozi processes it, so we always know.

---

## 10. Housekeeping

This file reloads into context every session, so once the **one-time** VPS
provisioning (section 6A) is finished, delete it or move it to a separate
`docs/initial-setup.md`. Keep sections 2–5, 6C, 7, and 8 as the permanent
project context.
