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
| Payment | Direct | Escrow (Inzozi holds until confirmed) |
| Trust | Low | Maximum |

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
- Track order/escrow status

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
- Manage escrow and payment releases
- View full platform analytics

---

## The Listing Pipeline (How a Car Goes Live)

```
Seller submits car details + their own reference photos
        ↓
Admin reviews submission
        ↓
Admin schedules inspection appointment
        ↓
Seller brings car to Inzozi inspection center
        ↓
Inzozi mechanics complete 150-point checklist
        ↓
Inzozi photographer shoots 36-angle standardized photos
        ↓
Admin creates official listing (not seller)
        ↓
Car goes LIVE on the marketplace
        ↓
Buyers browse → contact seller → purchase request → escrow → handover
```

---

## Screens to Build (Priority Order)

### Phase 1 — Foundation
| Screen | User | Notes |
|---|---|---|
| Welcome | Everyone | Dark gradient, two CTAs, sign-in link |
| Sign Up | Guest | Email + Google OAuth |
| Sign In | Guest | Email + Google OAuth, forgot password |
| ID Verification | Seller | Upload national ID front/back + selfie, status feedback |
| Car Submission Form | Seller | Multi-step: Details → Reference Photos → Notes → Submit |
| Inspection Scheduling | Seller | See available slots, book, receive confirmation |
| Seller Dashboard | Seller | Pipeline status per car + messages + analytics |
| Browse Cars | Everyone | Grid, search, filters, category pills |
| Car Detail | Everyone | Pro photos + specs + inspection summary + seller card + CTA |
| Admin Panel | Admin | ID queue, inspection queue, listing manager, user manager |

### Phase 2 — Trust Engine
| Screen | User | Notes |
|---|---|---|
| 150-pt Inspection Form | Admin | Structured checklist → auto-generates buyer report |
| Photo Upload (36 angles) | Admin | Required angle guide + upload interface |
| Inspection Report (buyer) | Everyone | Full structured pass/fail report |
| Vehicle History Card | Everyone | Ownership, accidents, mileage verify, Rwanda RRA link |
| Seller Profile | Everyone | Trust score, reviews, active listings, verified badge |

### Phase 3 — Communication & Transactions
| Screen | User | Notes |
|---|---|---|
| Chat (real-time) | Buyer + Seller | Firebase/Supabase WebSocket, car card pinned at top |
| Notification Center | All registered | Price drops, messages, listing updates, bid activity |
| Purchase Request | Buyer | Confirm intent → triggers seller notification → chat |
| Escrow Flow | Buyer + Seller | Visual step diagram: paid → held → delivered → confirmed → released |
| Order Tracking | Buyer | Status of purchase after request confirmed |

### Phase 4 — Buyer Power Tools
| Screen | User | Notes |
|---|---|---|
| Saved / Wishlist | Buyer | Saved cars with price change indicators |
| Saved Search Alerts | Buyer | Save a filter, get push when match is listed |
| Comparison Tool | Everyone | Select 2–3 cars, compare specs side by side |
| Price Intelligence | Everyone | Market avg, above/below market %, price history sparkline |
| Map View | Everyone | Kigali neighborhood pins, cluster by area, filter by distance |
| Import Duty Calculator | Everyone | Enter car value → get Rwanda RRA duty estimate |

### Phase 5 — Growth Features
| Screen | User | Notes |
|---|---|---|
| AI Price Suggestion | Seller | In listing wizard — suggests reserve price based on market |
| Seller Analytics | Seller | Views, saves, inquiries, time-on-market per listing |
| Admin Analytics | Admin | Pipeline metrics, conversion, revenue, top categories |
| Dealer Profile | Dealer | Professional dealer accounts with bulk listing + branding |
| Financing Calculator | Buyer | Monthly payment estimate with local bank rates |
| Trust Score Page | Everyone | Breakdown of seller's score components |

---

## Design System

### Colors (Final Brand — align everything to this)
```
Primary Blue:      #1A56DB   — CTAs, links, active tabs, badges
Primary Dark:      #1240A8   — pressed states, header backgrounds
Blue Light:        #EBF5FF   — tinted backgrounds, chip fills
Success Green:     #00C853   — Verified, Inspected, Passed, Live
Warning Yellow:    #FFAB00   — Pending, Awaiting, Scheduled
Alert Red:         #E74C3C   — Rejected, Action Required, errors
Background:        #F5F5F5   — app background
Card:              #FFFFFF   — all card surfaces
Text Primary:      #1A1A1A   — headings and body
Text Secondary:    #666666   — metadata, labels
Text Muted:        #999999   — timestamps, placeholders
Border:            #E8ECEF   — card borders, dividers
```

### Listing Status Colors
```
Submitted    → Yellow  #FFAB00   "Awaiting review"
Scheduled    → Blue    #1A56DB   "Inspection booked"
Inspecting   → Blue    #1A56DB   "Being inspected"
Live         → Green   #00C853   "Active listing"
Sold         → Gray    #999999   "Completed"
Rejected     → Red     #E74C3C   "Action required"
```

### Badge System
```
"Inzozi Certified"    → Blue pill   — passed full 150-pt check
"Verified Seller"     → Green pill  — ID confirmed
"7-Day Return"        → Blue tag    — return policy applies
"Below Market"        → Green tag   — priced under market avg
"Price Drop"          → Amber tag   — recently reduced
"New Listing"         → Blue tag    — listed in last 48h
"High Demand"         → Red tag     — 10+ people saved this
```

### Photography Standard (Encar-style 36 angles)
Every listing must include these shots — admin uploads, not seller:
- Exterior: Front, Front-Left 45°, Left Side, Rear-Left 45°, Rear, Rear-Right 45°, Right Side, Front-Right 45°
- Roof, Underbody, Wheel × 4, Tyre tread × 4
- Engine bay, Engine serial number
- Odometer reading, VIN plate
- Interior: Dashboard full, Infotainment, Driver seat, Rear seats, Boot/trunk
- Defect close-ups (if any — must be honest)

---

## World-Class Recommendations (Encar-Level Features)

### Trust & Verification
1. **Rwanda RRA Vehicle Check** — Partner with Rwanda Revenue Authority to cross-check chassis number, ownership history, and import duty status. Show this as a verified stamp on every listing.
2. **Mileage Verification** — Cross-reference odometer reading with service history and government records. Flag if mileage seems tampered.
3. **Accident History Report** — Partner with local insurance companies to pull accident claim history by plate/chassis number.
4. **VIN Decoder** — Auto-populate make, model, year, trim from VIN number entry on submission form.
5. **Seller Trust Score** — Composite score shown on seller profile: ID verified (30pts) + completed sales (30pts) + response rate (20pts) + buyer reviews (20pts).

### Buyer Experience
6. **Price Intelligence** — Show market average for the same make/model/year. Label each listing "7% below market" or "12% above market" with a color indicator.
7. **Price History Sparkline** — Small chart on car detail showing how the listing price has changed since it went live.
8. **"X people saved this"** — Social proof on every listing to create urgency without being fake.
9. **"Listed N days ago"** — Transparency builds trust.
10. **Similar Cars Carousel** — Bottom of car detail page: same make/category/price range. Keeps buyers in the funnel.
11. **Comparison Tool** — Select up to 3 cars, see specs head-to-head in a table. Encar's most-used power feature.
12. **Saved Search Alerts** — "Notify me when a Toyota RAV4 under $30k is listed." Core re-engagement loop.
13. **Video Walkaround** — 60-second standardized video for each car, shot by our team. Massive trust builder.

### Rwanda-Specific
14. **Import Duty Calculator** — Most cars in Rwanda are imported. Show estimated RRA import duty for any car so buyers understand total cost.
15. **RWF / USD Toggle** — Display prices in both Rwandan Francs and USD. $31,500 ≈ 41M RWF.
16. **MTN MoMo + Airtel Money** — Primary payment methods in Rwanda. Non-negotiable.
17. **Kinyarwanda Language** — Language toggle: English / Kinyarwanda. Expands your addressable market significantly.
18. **WhatsApp Notifications** — Rwanda's dominant communication channel. Push notifications + WhatsApp updates for bid activity, listing status, messages.
19. **Left vs Right Hand Drive flag** — Important in Rwanda where both exist (local cars LHD, Japanese imports RHD). Filter by this.
20. **Neighborhood-level location** — Not just "Kigali" but "Nyarutarama", "Remera", "Kicukiro" — buyers care about where they need to go for the handover.

### Seller Experience
21. **AI Price Suggestion** — In the listing wizard, after seller enters make/model/year/mileage, show: "Based on 12 similar cars sold in Kigali recently, we suggest RWF 18M–22M."
22. **Listing Status Timeline** — Visual pipeline (Submitted → Scheduled → Inspected → Live → Sold) so sellers always know what's happening with their car.
23. **Seller Analytics** — Views per day, number of saves, messages received, time on market vs category average.
24. **Appointment Reminders** — SMS + WhatsApp reminder 24h and 1h before inspection appointment.
25. **Re-listing Flow** — If a car doesn't sell, easy one-tap flow to re-list at a new price with a refreshed "New Price" badge.

### Platform & Operations
26. **Admin Inspection Checklist App** — A separate admin-facing form that mechanics fill out on tablet at the inspection center. Structured by category (Engine, Brakes, Body, Electronics, Interior, Tyres). Results auto-generate the buyer-facing report.
27. **Photo Angle Guide** — In the admin photo upload interface, show a silhouette guide for each required angle so every listing looks identical and professional.
28. **Dealer Accounts** — Professional car dealers get a special account type with branded profile page, bulk submission, priority scheduling, and lower commission rates.
29. **Multiple Inspection Centers** — As you grow, each center has its own schedule and admin team. System routes sellers to nearest available center.
30. **Dispute Resolution Flow** — If buyer and seller disagree after handover, there's a clear in-app process to raise a dispute. Inzozi admin mediates. Builds enormous trust.

### Engagement & Retention
31. **"New This Week" Badge** — Automatically flags cars listed in the last 7 days. Creates a habit of checking back.
32. **Price Drop Alerts** — Buyers who saved a car get notified immediately when the price drops.
33. **"High Demand" Signal** — When 10+ people save a car, show a red "High Demand" badge. True scarcity signal.
34. **Buyer Reviews** — After a successful purchase, buyer leaves a review of the seller. Visible on seller profile.
35. **Referral Program** — Seller refers another seller → gets a commission discount on their next listing.

---

## Tech Stack Recommendation (Production)

### Frontend (current)
- React Native + Expo SDK 54 ✓
- React Navigation v7 ✓

### Backend (to build)
- **Database**: Supabase (PostgreSQL) — best for structured car marketplace data + real-time subscriptions for chat
- **Auth**: Supabase Auth — supports email + Google OAuth out of the box
- **Storage**: Supabase Storage or Cloudflare R2 — for 36-angle photos per car (large files)
- **Real-time Chat**: Supabase Realtime (WebSocket) — built into Supabase
- **Push Notifications**: Expo Notifications + OneSignal
- **Payments/Escrow**: Stripe (international) + DPO Pay (Africa-focused, supports MTN MoMo + Airtel Money)
- **SMS/WhatsApp**: Africa's Talking (Rwanda-focused, supports both SMS and WhatsApp Business API)
- **Image optimization**: Cloudinary — auto-compress and serve inspection photos at right size

### Admin Panel
- React Native Web (same codebase) — or separate Next.js web admin dashboard

---

## Business Model

| Revenue Stream | Who Pays | Amount |
|---|---|---|
| Seller listing fee | Seller | Fixed fee per car submitted |
| Success commission | Seller | % of sale price on completion |
| Buyer transaction fee | Buyer | Small % on purchase |
| Featured listing | Seller | Boost listing to top of feed |
| Inspection-only | Seller | Sellers who just want a report (not a listing) |
| Dealer subscription | Dealer | Monthly flat fee for bulk listings + analytics |

---

## Current Codebase State

- **Framework**: Expo SDK 54, React Native 0.81.5, React Navigation v7
- **Brand colors**: Currently prototype Copper #C87A53 → **must be migrated to Blue #1A56DB**
- **Data**: 25 mock cars, all Kigali-localized, no real backend
- **Screens built**: Welcome, SignIn, SignUp, Home, Search, SearchResults, Filters, VehicleDetail, Checkout (→ Request to Buy), Messages, Chat, SellerDashboard, ListingWizard, Profile, Settings, InspectionReport, SellScreen, SavedScreen
- **State**: React Context only — no persistence, no auth, no backend
- **Run**: `npm start`

### Priority 1 when building: migrate brand colors first, then build role-based navigation, then auth.
