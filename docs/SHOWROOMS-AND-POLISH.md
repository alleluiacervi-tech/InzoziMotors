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
