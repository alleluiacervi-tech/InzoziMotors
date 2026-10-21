# Real showrooms, and a more professional browse

Started 29 Sep 2026 from an audit of the app's Cars tab, vehicle page, photo
viewer, Home rails and showrooms. Tick each item in the PR that ships it.

## Why

- The Home "Showrooms" rail grouped cars **by brand** ("Toyota", "Hyundai")
  plus an invented "Sawa Center" window. A showroom is a business that sells
  many brands; the real ones (admin-invited, `business_verified`) appeared
  nowhere as showrooms.
- A showroom's cars were listed under the owner's personal name, and a
  showroom could not have a photo (`users.avatar_url` existed, unused).
- The Cars tab mounted all 233 import-catalogue cards on open (the lag), said
  "258 vehicles found" by counting import *models* as cars, and its list card
  shrank the photo into a grey box and printed a registration month invented
  from the listing id.
- The vehicle page's sticky bar took ~20% of the screen; no brand mark; the
  title was squeezed beside the price; "Kigali, Kigali".
- Photos could only be swiped sideways: no overview, no zoom.
- Featured cars never moved on their own.

## Decisions

- **All current cars belong to the Sawa Cars Showroom.** It is set up the way
  any showroom is: an admin marks the seller account as a showroom, gives it
  its business name and photo, and ticks *Verified business* — in one save, so
  the listings never drop out of eligibility (invariant 4). No car is moved
  between accounts: an inspection is tied to the seller who submitted it.
- A showroom's **brands are derived from its live cars**, never chosen. A
  showroom that sells Toyota and Hyundai shows both, with counts.
- Listings of a showroom show the **business name** (`seller_name`), and
  `seller_is_showroom` / `seller_avatar_url` so clients can link to the
  storefront. Personal name stays for individual sellers.
- The brand rail on Home becomes **Shop by brand** (what it always was).
- Featured auto-advances every 5 s; pauses on touch (8 s), when Home is not
  focused, when the app is backgrounded, and never runs under Reduce Motion.
- The direct-deal notice stays on every contact path (it is the product's
  first rule) but leaves the sticky bar: one line near the seller card, and in
  full on the contact step as before.

## To do

### Backend
- [x] `GET /showrooms`: verified showrooms with at least one public car —
      name, photo, live count, brands with counts, cover photo, main location.
      Same eligibility as a public listing.
- [x] `seller_name` is the business name for a showroom (list, featured,
      detail, history, conversations); add `seller_is_showroom`,
      `seller_avatar_url`.
- [x] `POST /admin/users/:userId/avatar` (upload, byte check, metadata strip,
      audit log) and `DELETE` to remove; `resolveSubdir` rule → `avatars`.
- [x] `GET /admin/users` returns `avatar_url`.
- [x] Tests.

### Admin
- [x] Users → Edit: *Showroom account* switch, and a profile photo with
      upload / replace / remove.
- [x] Directory row shows the photo.

### App (OTA, JS only)
- [x] Cars tab: opens on *In Rwanda*; imports are one compact entry into the
      brand-first import browser, not 233 mounted cards; honest count;
      FlatList tuning; strings translated.
- [x] List card: photo fills the card height (cover), brand mark, one meta
      line, score, calmer price; fake registration month removed.
- [x] Import model card: compact row (≈90pt instead of ≈330pt).
- [x] Vehicle page: title full width with price beneath; brand bar above the
      specs grid ("Toyota · RAV4 · 2020 — See all Toyota"); location fixed;
      rate note behind an info toggle.
- [x] Sticky bar: one slim row, price + Contact.
- [x] Photo viewer: *All photos* vertical view, pinch / double-tap zoom,
      swipe down to close, "3 / 12" counter; gallery gets an *All photos*
      button.
- [x] Featured auto-advance.
- [x] Home: real Showrooms rail; Shop by brand rail; no "Sawa Center".
- [x] Showroom storefront: photo, name, verified business, location, brand
      chips that filter, the showroom's cars.
- [x] Seller card on a listing: showroom photo and name, opens the storefront.

### Web (parity)
- [x] `/sellers/[id]`: showroom photo, brand chips that filter (`?brand=`).
- [x] Car page: brand bar above the key specs; seller card shows the
      showroom's photo and name.
- [x] Home: Showrooms section from `GET /showrooms`.

### Human steps after deploy
- [ ] Admin → Users → the account that holds the cars → Edit: switch on
      *Showroom account*, business name "Sawa Cars Showroom", tick *Verified
      business*, upload the photo, Save.
- [ ] Upload the missing brand logos in Admin → Brands.

## Follow-up, 30 Sep 2026: import images, stuck pipeline, admin dead ends

### Import catalogue images
- [x] Withdraw every Wikimedia Commons photo (migration 0050; candidate rows
      kept so it is reversible). Audit: ≥78 of 232 showed the wrong vehicle or
      generation; the rest were used cars in the street.
- [x] Retire the Commons routes (410) and the admin queue.
- [x] Studio renders wait for a person to approve them (`render_review`); the
      public catalogue only serves approved ones. Render width 1000px.
- [x] Official photo upload per model with a required source/permission note.
- [x] Admin → Catalogue images: stats, "Find studio images", review
      (right car / wrong car), upload / replace / remove.
- [x] App: the Cars tab import list uses the live catalogue (images, prices);
      catalogue fetch honours `make` (it was silently ignored); images are
      contained on white; the detail says whether it is an official photo or
      a studio image.
- [x] Web /imports: model cards show the image (or brand mark) and brand chips
      carry logos.
- [ ] **Human:** buy the studio image licence and set `VEHICLE_RENDER_CUSTOMER`
      on the server; then Admin → Catalogue images → Find studio images, and
      approve each one.
- [ ] **Human:** ask exporters/distributors for official photos with written
      permission for models the library does not have, and upload them.

### Pipeline and dashboard
- [x] A car whose inspection scored low or found a critical defect is no
      longer stuck: listing creation accepts a complete checklist (defects are
      disclosed), the board shows it as ours to list or close, and the listing
      picker offers it.
- [x] `POST /submissions/:id/close` from any stage short of a public listing;
      Submissions gains Close / Reopen / Reschedule / Open the appointment /
      Create the listing / Open the listing on the right rows.
- [x] Reassigning a listing to another seller moves its submission too (it
      used to make the car disappear from the marketplace).
- [x] Import orders: advance, skip and cancel controls on the list and the
      operations record, from the server's allowed transitions.
- [x] Seller dashboard (web) no longer lists a live car twice.

## World-class showrooms, and test accounts (21 Oct 2026)

### What we found on production
- **No showroom was live.** The account holding the Sawa Cars stock (8 of the 9
  public cars, "SAWA CARS" plates) was still an individual seller, shown as
  "Derrick Mugenga · Private seller" with the Sawa logo as its photo. The human
  step above was never done, so the Home "Showrooms" section was hidden.
- **Every seller page showed numbers that could not be true or could not move:**
  Sales 0, Rating —, Reviews (0), "100% of messages answered within 24 hours"
  (a default nothing recalculated), and a trust score out of 100 where 50 points
  came from sales and reviews that the retired deal flow can no longer produce,
  so every verified seller read "50/100" (grade D in the app).
- **A test account's car was public** (a 2022 Kia Sorento under "Allelua"), and
  the admin had no way to remove test accounts: only suspend, or the 30-day
  purge of accounts their owners closed.
- The app's seller page had a "Contact" button that opened an empty chat with no
  conversation behind it.

### Decisions
- Show only facts: cars, brands, average inspection score, and how quickly the
  seller replies, **measured** (median first reply to a new conversation over
  180 days; shown only after 3+ enquiries with at least half answered).
- Reviews stay off until there is a real, checkable way to collect them.
- A test account can still sign in (App Review's demo account), but nothing it
  owns is public; marking is a flag, not a cascade, so unmarking is exact.
- The team erases only a **marked** account, with its email typed, never one with
  payment records (paid fee, unvoided rental subscription, import payment with
  proof). Anonymised, not deleted: inspections, conversations with real people
  and the audit log keep their references.

### Shipped (branch `feature/showroom-storefront-and-test-accounts`)
- [x] Migration 0066: `users.is_test`, `test_marked_at/by`; `business_about`,
      `business_address`, `business_hours`, `business_cover_url`.
- [x] Every public read requires `is_test = FALSE` (catalogue, detail, history,
      reports, saved list, save, contact, messages, sellers, showrooms, rentals,
      rental alerts, daily summary), and alerts skip a test account's cars.
- [x] `PATCH /admin/users/:id/test-account`, `POST /admin/users/:id/erase`,
      `POST/DELETE /admin/users/:userId/cover`, showroom fields on
      `PATCH /admin/users/:id`, `GET /admin/users?test=1`.
- [x] `GET /sellers/:id`: business name only for a showroom (no personal name),
      `reply_time`, `about`, `address`, `hours`, `cover_url`; no sales, rate,
      rating or trust. `GET /showrooms` prefers the showroom's own cover.
- [x] Admin → Users: Test accounts filter and badge, mark / unmark, erase with
      typed email, Storefront details (about, address, hours editor, cover),
      Listings column instead of Trust and Sales.
- [x] Web `/sellers/[id]`: facts row, About, Visit (address, Open in Maps, hours
      with Open now in Kigali time), AutoDealer structured data with address and
      opening hours; trust score and reviews removed.
- [x] App: ShowroomScreen gets the cover, About, Visit and hours, average
      inspection and replies; SellerProfileScreen rewritten to the same facts;
      Trust score left the drawer and the profile.
- [x] Tests: `backend/test/test-accounts-and-storefront.test.js`.

### Human steps (no code)
- [ ] Admin → Users → the account holding the Sawa Cars stock → Edit: Showroom
      account, business name, Verified business, logo, and the new Storefront
      details (about, address, hours, cover photo). Save.
- [ ] Decide who legally sells those cars (D1 below) before naming the showroom.
- [ ] Mark the pre-launch test accounts (e.g. "Allelua") as test accounts, check
      nothing real is attached, then erase them.
- [ ] Native-speaker review of the new Kinyarwanda and Swahili strings.

### Open decisions
- **D1.** If Sawa Cars itself sells the showroom's cars, "Sawa Cars is not a
  party to any deal" is not true for them. List them under the selling
  business's registered name with its link to Sawa Cars disclosed (legal view).
- **D2.** A "Contact the showroom" button for general questions (opens a
  conversation; phone and WhatsApp stay behind the three gates).
- **D3.** Team logins: several staff under one showroom with roles.

### Next (Phase 2: a storefront people use)
- [ ] Search, sort (newest, price, year, mileage) and filters inside a showroom.
- [ ] A "For hire" tab for showrooms holding rental cars.
- [ ] "Recently sold", from cars the showroom marked sold.
- [ ] Follow a showroom: a saved search narrowed to it, so new stock reaches
      followers through the alerts, quiet hours and daily summary that exist.
- [ ] Showroom directory (web `/showrooms`, app screen), filter by brand and area.
- [ ] Share button.
- [ ] Insights and exports leave test accounts out.

### Later (Phase 3: tools for the showroom)
- [ ] Showroom dashboard: profile edits (name changes go back to verification),
      per-car views (the counter exists, `cars.views`), saves, contact requests
      and messages, a leads inbox.
- [ ] Team logins (D3). Bulk submission and inspection booking.
- [ ] Admin showroom management: verification record and review date, health.
