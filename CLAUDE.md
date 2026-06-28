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

## Screens To Build — Phase 2: Trust Engine

### Status: PENDING

| Screen | Role | Priority | Notes |
|---|---|---|---|
| 150-pt Inspection Form | Admin | HIGH | Mechanic fills checklist on tablet → auto-generates buyer report |
| Photo Upload (36 angles) | Admin | HIGH | Angle guide silhouettes + upload interface, progress tracker |
| Inspection Report (buyer) | Everyone | HIGH | Full structured pass/fail breakdown with scores per category |
| Vehicle History Card | Everyone | HIGH | Ownership count, accidents, mileage verify, Rwanda RRA stamp |
| Seller Profile | Everyone | MEDIUM | Trust score (ID 30 + sales 30 + response 20 + reviews 20), listings, reviews |
| Notification Center | Registered | MEDIUM | Price drops, messages, listing updates, saved search alerts |

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

## Screens To Build — Phase 3: Communication & Transactions

| Screen | Role | Notes |
|---|---|---|
| Notification Center | Registered | Price drops, messages, listing updates, saved search alerts |
| Purchase Request | Buyer | Confirm intent → seller notified → chat opened |
| Order Tracking | Buyer | Status after purchase request confirmed |

---

## Screens To Build — Phase 4: Buyer Power Tools

| Screen | Role | Notes |
|---|---|---|
| Saved / Wishlist | Buyer | Price change indicators on saved cars |
| Saved Search Alerts | Buyer | "Notify me when Toyota RAV4 < $30k listed" |
| Comparison Tool | Everyone | Select 2–3 cars, specs side by side |
| Price Intelligence | Everyone | Market avg, above/below market %, price history sparkline |
| Map View | Everyone | Kigali neighborhood pins, cluster by area |
| Import Duty Calculator | Everyone | Enter car value → Rwanda RRA duty estimate |

---

## Screens To Build — Phase 5: Growth

| Screen | Role | Notes |
|---|---|---|
| AI Price Suggestion | Seller | "Based on 12 similar sales, suggest RWF 18M–22M" |
| Seller Analytics | Seller | Views/day, saves, inquiries, time-on-market |
| Admin Analytics | Admin | Pipeline metrics, conversion, revenue, top categories |
| Dealer Profile | Dealer | Branded page, bulk listing, priority scheduling |
| Financing Calculator | Buyer | Monthly estimate with Kigali bank rates |
| Trust Score Page | Everyone | Breakdown of a seller's 100-point score |

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
- **Database**: Supabase (PostgreSQL) — structured car marketplace data + real-time subscriptions for chat
- **Auth**: Supabase Auth — email + Google OAuth out of the box
- **Storage**: Supabase Storage or Cloudflare R2 — for 36-angle photos per car
- **Real-time Chat**: Supabase Realtime (WebSocket) — built into Supabase
- **Push Notifications**: Expo Notifications + OneSignal
- **Payments**: DPO Pay (Africa-focused, supports MTN MoMo + Airtel Money)
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

### Phase 2 — Trust Engine (NEXT)

| Screen | File | Status |
|---|---|---|
| 150-pt Inspection Form | InspectionFormScreen.js | 🔲 Not built |
| Photo Upload (36 angles) | PhotoUploadScreen.js | 🔲 Not built |
| Inspection Report (full) | InspectionReportScreen.js | 🔲 Needs rewrite |
| Vehicle History Card | VehicleHistoryScreen.js | 🔲 Not built |
| Seller Profile | SellerProfileScreen.js | 🔲 Not built |
| Notification Center | NotificationCenterScreen.js | 🔲 Not built |

**Phase 2 detailed tasks:**
- [ ] Build `InspectionFormScreen` — 7-category accordion checklist, Pass/Flag/Fail per item, category score, notes field, "Generate Report" CTA
- [ ] Build `PhotoUploadScreen` — 36-slot grid with silhouette angle guide per slot, upload progress bar, "Submit Photos" CTA
- [ ] Rewrite `InspectionReportScreen` — full structured pass/fail, per-category score bars, flagged items list, overall % score, certified badge if ≥ 88%
- [ ] Build `VehicleHistoryScreen` — ownership count, accident history card, mileage verified card, import origin card, RRA duty stamp, insurance status
- [ ] Build `SellerProfileScreen` — trust score circle (100 pts), score breakdown (ID/sales/response/reviews), active listings carousel, review list, "Contact" button
- [ ] Build `NotificationCenterScreen` — grouped by date, types: price drop / new message / listing update / saved search match, read/unread states
- [ ] Connect `VehicleDetailScreen` → tap seller name → `SellerProfileScreen`
- [ ] Connect `VehicleDetailScreen` → add "Vehicle History" row → `VehicleHistoryScreen`
- [ ] Connect `AdminPanelScreen` → inspection appointment → `InspectionFormScreen`
- [ ] Connect `AdminPanelScreen` → after inspection form → `PhotoUploadScreen`
- [ ] Add inspection form data to `AppContext` (7 categories, 150 items, submit action)
- [ ] Add vehicle history mock data to `AppContext` or data file
- [ ] Add seller profile data (trust score, reviews) to `AppContext`
- [ ] Add notifications mock data to `AppContext`

### Phase 3 — Communication & Transactions (PLANNED)

| Screen | File | Status |
|---|---|---|
| Purchase Request | (update Checkout) | 🔲 Not built |
| Order Tracking | OrderTrackingScreen.js | 🔲 Not built |
| Notification Center | NotificationCenterScreen.js | 🔲 Not built |

**Phase 3 detailed tasks:**
- [ ] Enhance `CheckoutScreen` → proper purchase request confirmation flow with next-steps timeline
- [ ] Build `OrderTrackingScreen` — visual status diagram: Request Sent → Seller Confirmed → Handover Arranged → Complete
- [ ] Build `NotificationCenterScreen` (if not done in Phase 2)
- [ ] Wire notification badge count into tab bar on Messages tab
- [ ] Auto-send notification when seller confirms purchase request
- [ ] Chat enhancements: pin car card at top of chat thread, "Arrange Viewing" quick reply button

### Phase 4 — Buyer Power Tools (PLANNED)

| Screen | File | Status |
|---|---|---|
| Saved / Wishlist | SavedScreen.js | 🔲 Needs full build |
| Saved Search Alerts | SavedSearchScreen.js | 🔲 Not built |
| Comparison Tool | ComparisonScreen.js | 🔲 Not built |
| Price Intelligence | (VehicleDetail enhancement) | 🔲 Not built |
| Map View | MapScreen.js | 🔲 Not built |
| Import Duty Calculator | DutyCalculatorScreen.js | 🔲 Not built |

**Phase 4 detailed tasks:**
- [ ] Build `SavedScreen` fully — saved car cards with price change indicator ("Price dropped $500"), "Remove" swipe action
- [ ] Build `SavedSearchScreen` — list saved filters, edit/delete, toggle push notification per saved search
- [ ] Build `ComparisonScreen` — select 2–3 cars from browse, side-by-side specs table, highlight winner per row
- [ ] Add price intelligence to `VehicleDetailScreen` — "X% below/above market" badge, mini sparkline of price history
- [ ] Add "X people saved this" social proof counter to `VehicleDetailScreen`
- [ ] Add "Listed N days ago" label to `VehicleDetailScreen`
- [ ] Add Similar Cars horizontal scroll to bottom of `VehicleDetailScreen`
- [ ] Build `MapScreen` — Kigali neighborhood pins, cluster by area, filter by distance, tap pin → car card
- [ ] Build `DutyCalculatorScreen` — enter car value (USD) → calculate Rwanda RRA import duty estimate
- [ ] Add RWF / USD price toggle to `HomeScreen` and `VehicleDetailScreen`
- [ ] Add LHD / RHD flag to car data and filter options

### Phase 5 — Growth Features (PLANNED)

| Screen | File | Status |
|---|---|---|
| AI Price Suggestion | (CarSubmission enhancement) | 🔲 Not built |
| Seller Analytics | SellerAnalyticsScreen.js | 🔲 Not built |
| Admin Analytics | AdminAnalyticsScreen.js | 🔲 Not built |
| Dealer Profile | DealerProfileScreen.js | 🔲 Not built |
| Financing Calculator | FinancingScreen.js | 🔲 Not built |
| Trust Score Page | TrustScoreScreen.js | 🔲 Not built |

**Phase 5 detailed tasks:**
- [ ] Add AI Price Suggestion to `CarSubmissionScreen` Step 4 — after entering make/model/year/mileage, show "Based on X similar cars, we suggest $Y–$Z"
- [ ] Build `SellerAnalyticsScreen` — views/day chart, saves count, inquiries, time on market vs category average, best performing listing
- [ ] Build `AdminAnalyticsScreen` — pipeline metrics (submissions → live conversion %), revenue this month, top makes/categories, inspection center utilization
- [ ] Build `DealerProfileScreen` — branded header, all dealer's listings, bulk submission badge, verified dealer badge, contact info
- [ ] Build `FinancingScreen` — enter car price + down payment → estimate monthly payments at Rwandan bank rates
- [ ] Build `TrustScoreScreen` — full breakdown of a seller's 100-point score with visual gauge per component
- [ ] Add Re-listing flow to `SellerDashboardScreen` — "Relist with new price" for unsold listings with "New Price" badge auto-applied
- [ ] Add Appointment Reminders interface (WhatsApp + SMS concept screens)
- [ ] Add Referral Program screen — referral link, rewards tracker

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
