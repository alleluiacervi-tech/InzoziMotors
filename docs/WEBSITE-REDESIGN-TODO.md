# Website redesign — task list

Source: the audit of sawacars.com on 3 Oct 2026 (private doc:
https://claude.ai/code/artifact/6e31522d-4d0d-4471-acbe-d486a5dd7cf0). This file is the
executable version of it. Every task says **what**, **where**, and **done when**, so any
session can pick it up cold. Tick items in the PR that ships them.

The one-line brief: **sawacars.com must sell cars first and explain Sawa second.** The
direction is "inspection-grade": paper, ink, one red, real photographs, large numbers, no
decoration. Nothing here changes the backend or the app.

## 0. How to work on this (read before any task)

- Branch: develop on a feature branch (`claude/<name>`), never on `main`. Do not open a PR
  unless asked. Commit per task or per small group of tasks with a clear message.
- The site is `web/` (Next.js 15, Tailwind 3, Satoshi via `next/font/local`). Read
  `CLAUDE.md` §2, §3, §7 before touching copy: every surface must state the direct-deal rule
  **once**, and no page may introduce checkout, escrow, guarantees or commission language.
- Copy lives in `web/src/lib/i18n/messages/*.ts`, six locales (`en`, `rw`, `fr`, `sw`,
  `ko`, `zh`). When you change English, update all six (machine-quality translation is fine;
  mark nothing as reviewed). Missing keys fall back to English, but stale keys do not, so
  delete a key in every locale or none.
- Site constants (nav, footer, FAQs, contact, centres) live in `web/src/lib/site.ts`.
- Primitives live in `web/src/components/ui/index.tsx` and `Button.tsx`. Use them; do not
  add arbitrary `text-[Npx]` sizes or new colours. Tokens are in `web/src/app/globals.css`.
- Verify every change the same way:
  1. `cd web && npm install && npm run typecheck`
  2. Run locally against production data, no backend needed:
     `API_URL=https://api.sawacars.com NEXT_PUBLIC_API_URL=https://api.sawacars.com NEXT_PUBLIC_SITE_URL=http://localhost:3002 npm run dev`
  3. Screenshot at 390 px and 1440 px with Playwright (global install at
     `/opt/node-tools/node_modules/playwright`, browser at `/opt/pw-browsers/chromium`,
     launch with `args: ['--no-sandbox']`) and **look at the images** before committing.
     In this sandbox the live site cannot be screenshotted (proxy certificate); use localhost.
  4. `npx playwright test e2e/smoke.spec.ts` must still pass (needs the backend; if it
     cannot run locally, say so in the commit and rely on CI).
- Honesty gates stay: no Play badge until `APP.androidLive` is true, no social icons without
  a real account, no ratings, no landed-cost figures until `encar_cost_inputs.configured`.
- Dark mode: until decision D2 below is answered, every change must still render correctly
  with `class="dark"` on `<html>`. Do not remove tokens.
- When a task says "one disclaimer per page", the sentence to use everywhere is:
  **"You and the seller agree the price and pay each other directly. Sawa Cars never holds
  the money."** (Rental: "the provider"; Import: keep the bank-transfer wording that exists.)

## Decisions needed from the owner (answer here, then proceed)

- [ ] **D1** Rent: is it a 2026 business? If not, it leaves the nav, hero tabs and homepage now
      (Phase 1 assumes **yes, remove while the fleet is empty**; it returns automatically when
      `GET /rentals` has 3+ cars, see task 1.4).
- [ ] **D2** Dark theme: keep as OS-following only (toggle removed), or remove entirely? Default
      if unanswered: keep tokens, remove the toggle (task 3.6).
- [ ] **D3** Photographs of a centre, an inspector at work, and the team: available? Needed for
      tasks 3.8 and 2.3. Until then those sections use the existing `web/public/img/*.jpg`.
- [ ] **D4** Canonical seller step count: five or six? Default: **five** (Submit, Inspect,
      Publish, Enquiries, Sell), used on every page (task 2.7).
- [ ] **D5** May buyers without an account ask Sawa about a listing on WhatsApp (routes to the
      Sawa line, not the seller)? Default: **yes** (task 3.10).
- [ ] **D6** Will the Korean catalogue (`catalog_public`) be on before this ships? Changes the
      import page order (task 2.9).

## Phase 1 — Repair (no design decisions; losing customers today)

- [x] **1.1 Seller exit goes to the web flow.** *(Also: sign-up pre-selects "I want to sell" when `next` starts with `/sell` or `/dashboard/verify`, or `?role=seller`; the sell page's closing button now reads "Start selling" and goes to `/sell/submit`.)* In
      `web/src/components/tools/ValuationTool.tsx` (`NextSteps`), change the button `href`
      from `/download` to `/sell/submit`. `/sell/submit` already redirects signed-out users to
      `/signin?next=/sell/submit`. Done when: a signed-out user who completes a valuation and
      clicks the button lands on sign-in, then on the submit form; never on the app page.
- [x] **1.2 Rewrite the four "happens in the app" passages.** *(Also rewritten: the sell page closer's body, the seller dashboard's verification notice, and the /download page's "ID verification" card, which claimed a phone was the only way.)* The web verification flow
      (`/dashboard/verify`, webcam + upload) and submission (`/sell/submit`) shipped 27 Sep 2026.
      Fix, in all six locales:
      - `messages/sell.ts` → `app.title`, `app.body1`, `app.body2`, and the `whereTitle` /
        `whereApp` / `step1` rows (identity verification and submission are **Web or App**).
        Rename the section from "One step has to happen in the app" to "Everything works on the
        web" and keep the store buttons as a secondary option.
      - `messages/tools.ts` → `valuationTool.submissionHint`: "Submission starts with a
        one-time ID check, which you can do here or in the app."
      - `messages/auth.ts` line ~86 (sign-up notice under "I want to sell"): the browser **can**
        capture ID and selfie; say the check happens on the next screen.
      - `lib/site.ts` FAQ `appOrWeb` and `messages/faq.ts` `appOrWeb` (all locales): the app
        adds push notifications and a faster camera, nothing else.
      Done when: `grep -rn "in the app" web/src/lib/i18n/messages web/src/lib/site.ts` returns
      only lines that describe push notifications or the camera.
- [x] **1.3 Show "Sell your car" in the mobile header.** In
      `web/src/components/layout/Header.tsx` the primary `Button href="/sell"` has
      `hidden sm:inline-flex`. Make it visible at every width (size `sm`, label may shorten to
      "Sell" below 400 px). Remove the header search icon (the hero and /cars have search).
      Done when: at 390 px the red Sell button is visible without opening the menu and the
      header never wraps to two lines.
- [x] **1.4 Hide Rent while the fleet is empty.** Rent currently appears in `NAV_LINKS`
      (`lib/site.ts`), the hero tabs (`components/home/HeroSearch.tsx`, `MODES`) and the
      homepage "Three ways" card. Make all three conditional on a rental count ≥ 3 (the
      homepage already fetches `rentals.list()`; the header can read a count passed from the
      root layout). `/rentals` stays live and in the footer. Done when: with the production API
      (0 rentals) no Rent entry renders anywhere above the footer; with a mocked list of 3 it
      renders everywhere it did.
- [x] **1.5 Make and title hygiene.** *(Code done 3 Oct: `web/src/lib/vehicle-names.ts`, not `business.ts`, because `business.ts` mirrors the app's logic and this is web-only display. Titles are cleaned once in `lib/api.ts`; make labels on chips, selects, headings and page titles use `displayMake`, while filter URLs keep the stored value because the API matches `make` exactly. Still to do by a person, below.)* Listing titles come from the database (`cars.title`, set
      at listing creation in the admin), so first fix the data: in the admin, rename the make
      "Dongfeng Motor Corporation" to "Dongfeng" (`vehicle_makes.aliases` can keep the long
      form), and retitle "2023 Land Rover Land Rover Range Rover P530 SE" to
      "2023 Range Rover P530 SE" (make Land Rover). Then add a display guard in
      `web/src/lib/business.ts` (`displayTitle(car)`) that strips a make repeated twice at the
      start of a title, and use it in `CarCard`, the listing `<h1>` and `Specimen`. Done when:
      no card on `/cars` shows a make twice and every make chip is a single brand word.
    - [ ] **1.5a (admin, a person)** Rename the make on the Dongfeng listing to "Dongfeng" and retitle the Range Rover listing to "2023 Range Rover P530 SE" in Admin → Listings. The site already displays both correctly; this fixes the stored data and the app, which does not use the web's display helpers.
- [x] **1.6 Flag implausible odometers at publication.** *(Done in `backend/src/lib/publication-readiness.js` `contentWarnings`, with a second warning for a title that repeats its make, and tests in `backend/test/publication-warnings.test.js` that need no database. Also fixed a pre-existing crash: the low-score warning used `SCORE_MAX` without importing it.)* Admin-side only, in the publication
      readiness warnings (`backend/src/routes/cars.js`, `publicationReadiness`): warn (not
      block) when mileage < 500 km on a car older than one model year. This keeps "100 km,
      2022 Land Cruiser" from reaching the homepage unnoticed. Done when: the warning appears
      in the admin review for such a car and existing tests pass (`cd backend && npm test`).
- [x] **1.7 Language switcher without a flag.** `components/i18n/LanguageSwitcher.tsx`: drop the
      flag emoji, show "EN", "RW", "FR", "SW", "KO", "ZH". Done when: no flag renders.

## Phase 2 — Restructure (information architecture and copy)

- [ ] **2.1 Nav to four items.** `NAV_LINKS` in `lib/site.ts` becomes Buy `/cars`, Sell
      `/sell`, Import `/imports`, How Sawa works `/how-it-works`. Tools leaves the nav (page
      stays, linked from Sell, Import and the footer). Update `NAV_KEY` in `Header.tsx` and
      `nav.*` keys in `messages/ui.ts`/dictionary. Done when: header and mobile drawer show
      four links; `/tools` still loads.
- [ ] **2.2 Homepage to five sections.** In `web/src/app/page.tsx` the order becomes:
      1. `Hero` (task 2.3), 2. `FeaturedCars` (stock, task 2.4), 3. `Standard` (task 2.5),
      4. Proof (task 2.6), 5. Sell strip (task 2.6). Delete the imports of `TopDeals`,
      `ThreeWays`, the FAQ block and `FinalCta` from the homepage (keep the components for
      `/featured` and other pages; delete `ThreeWays.tsx` and `FinalCta.tsx` if nothing else
      uses them). Done when: mobile homepage is under 6,000 px tall at 390 px and the first
      car card is reachable within two swipes.
- [ ] **2.3 Hero cut for the phone.** `components/home/Hero.tsx` and `HeroSearch.tsx`:
      lede to one sentence (≤ 14 words); on mobile show only the Make select and the budget
      chips plus the button; the Model field and Import panel appear from `sm` up. Remove the
      trust-link row ("Verified sellers · Direct contact") and replace it with the one
      disclaimer sentence under the search. The specimen (right column) follows directly under
      the form on mobile. Done when: at 390 px the headline, form and the top of the specimen
      car fit in 844 px.
- [ ] **2.4 Stock section as the main event.** `components/home/FeaturedCars.tsx`: title
      "{count} inspected cars in stock", chips, then the grid at `sm:grid-cols-2 lg:grid-cols-3`
      (not four), showing up to 9 cars and a "See all cars" link. Placements from
      `cars.featured()` are merged into this grid with a small "Featured" / "Sponsored" label
      inside the card's top-right corner instead of a separate section. Done when: no car id
      appears twice on the homepage.
- [ ] **2.5 One dark band, flat.** `components/home/Standard.tsx`: keep the headline, the
      three numbers (150 / 105 / 49) and the full-width ruler; remove the photo figure, the
      four-item "controls" list and the second link. Remove the `ambient-ink grain` classes
      (flat `bg-ink-900`). Done when: the band is one screen on desktop and under 1.5 screens on
      mobile.
- [ ] **2.6 Proof + Sell strip (new, small).** New `components/home/Proof.tsx`: one photo
      (`/img/inspector-wheel-arch.jpg` until D3), one sentence ("Every car is inspected by a
      Sawa mechanic at one of three Kigali centres"), the three centre names with hours from
      `getDisplayCenters()`. New `components/home/SellStrip.tsx`: one line ("What is your car
      worth?"), a Make + Year inline form posting to `/sell#valuation` (GET params the
      ValuationTool pre-fills), one button. Done when: both render server-side with no client JS
      beyond the form.
- [ ] **2.7 One disclaimer per page.** Remove the duplicates and keep exactly one, next to the
      decision: hero (home), beside the contact button (listing page), beside the valuation
      result (sell), beside the request form (import). Remove: `cars/[id]/page.tsx` the
      "A verified listing, not a managed transaction" card and the "Transaction model" row;
      `DecisionSummary` entirely (task 2.8); the sell page's black `noCheckoutBold` bar;
      `PageIntro`'s three-phrase trust row. Footer keeps its one line. Done when: each page
      contains the sentence from §0 once (grep the rendered HTML for "never holds").
- [ ] **2.8 Listing page trims.** `web/src/app/cars/[id]/page.tsx`: delete `DecisionSummary`;
      move `InspectionReportCard` to sit directly after the `SpecGrid` section; remove the
      "Open in the app" button from the sidebar; move the exchange-rate note (`RateNote`) into a
      `title` tooltip on the USD figure or a single footnote line. Keep the sticky mobile bar.
      Done when: desktop page order is gallery → title → specification → inspection report →
      paperwork → seller → next steps → similar cars.
- [ ] **2.9 Sell page order.** `web/src/app/sell/page.tsx`: hero + valuation; "What we do for
      you" with three items (inspect, photograph, publish with the report); a "What it costs"
      block showing the walk-in inspection fee from `/tools/pricing` copy (RWF 15,000) and a
      red "Book an inspection" button to `/sell/submit`; centres; the four seller FAQs. Delete
      the six-card grid, the boundaries trio, and the app section (store buttons move to the
      footer only). Use the step count from D4 everywhere: `PipelineModules.LISTING_PIPELINE`,
      `site.ts SELLING_STEPS`, `messages/marketing.ts sellingSteps`, About `pipeline.stages`.
      Done when: `/sell` has at most five sections and one red button per screen.
- [ ] **2.10 Import page order.** `web/src/app/imports/page.tsx`: duty estimate (the
      `DutyCalculator`, pre-filled from `?year&price_usd`) first, request form second, the
      8-step process third, catalogue last with one line at its top: "Prices are quoted on
      request; every model below can be sourced." Remove the per-card "Request this model"
      link in favour of a single "Request a quote" button above the grid (cards still link to
      `/imports?make=…#request`). If D6 is yes, the Korean catalogue takes the catalogue slot and
      the old model grid is hidden. Done when: a visitor sees a francs figure before scrolling
      past one screen on desktop.
- [ ] **2.11 Merge About and Marketplace safety into How Sawa works.**
      `web/src/app/(marketing)/how-it-works/page.tsx` becomes: why we exist (About's three
      paragraphs), the 150-point standard (ruler + numbers), who verifies what (the five
      controls as a plain list, no cards), what we never do (About's four items), buying steps,
      selling steps, centres. `/about` and `/promise` become `redirect('/how-it-works#...')`
      pages; update `FOOTER_LINKS`, `sitemap.ts`, and internal links (`grep -rn "/promise\|/about"
      web/src`). Done when: no public page repeats the five controls, and old URLs redirect.
- [ ] **2.12 Button discipline.** One `variant="primary"` button per viewport-height on every
      page. Everything else is `outline`, `secondary` or `TextLink`. Audit with
      `grep -n "Button" web/src/app/page.tsx web/src/app/sell/page.tsx` and the rendered
      pages. Done when: a screenshot of each page at 1440 px shows at most one red button per
      1,000 px of height (the header's Sell button excepted).
- [ ] **2.13 Plain-language register.** Replace legal phrasing on marketing and decision
      surfaces ("not a party to the resulting contract or dispute", "does not accept, hold or
      route user transaction funds") with the §0 sentence or "You deal with the seller
      directly." Legal pages (`/legal/*`) keep legal wording. Done when: the words "party",
      "dispute" and "custody" appear only under `/legal`.

## Phase 3 — Polish (visual system, consistency, growth)

- [ ] **3.1 One hero register.** Every page opens on `bg-surface-page` with a black
      `text-display` headline and a one-line lede: convert the Sell and Tools heroes (ink +
      red radial gradient) and the `PageHeader` component (white strip) to the pattern
      `PageIntro` uses. Delete the inline `bg-[radial-gradient(...)]` divs. Done when: no page's
      first 600 px is dark or white; all are paper.
- [ ] **3.2 Retire decoration.** In `globals.css` delete `.ambient-ink`, `.grain`,
      `.blueprint-grid`, `.ambient-paper`, `.grid-paper`; in `tailwind.config.ts` delete the
      `kenburns` keyframe/animation and the `brand` / `brand-lg` shadows; remove the `stagger`
      utility and every `Reveal` wrapper (`components/ui/Reveal.tsx`, used by
      `PipelineModules`) so content is visible on load. Keep `fade-up` for the mobile drawer
      only. Done when: `grep -rn "ambient-\|grain\|stagger\|Reveal\|kenburns" web/src` is
      empty except the drawer.
- [ ] **3.3 Red only for price, score ring, one button.** Remove `text-brand` from eyebrows
      (`Eyebrow` default tone becomes `muted`), from the 1 px top bar on cards (`sell` and
      `rentals` pages), from icon tiles (`bg-brand-tint text-brand` on `/promise` cards, now
      merged away) and from in-copy links on marketing pages (links are ink, underlined).
      Done when: at 1440 px each page has red only on prices, the score ring, the primary
      button and the certified badge.
- [ ] **3.4 Ruler only at full width.** `components/brand/CheckRuler.tsx` is used in
      `Specimen` (40 px) and the listing report card (small). Replace both with the
      `ScoreRing` + large number; the ruler remains only in `Standard` (96 px, labelled).
      Done when: no ruler renders narrower than 600 px.
- [ ] **3.5 Fewer boxes.** On How Sawa works, Sell and Import, replace bordered `Card`
      grids with plain columns separated by hairlines (`border-t border-line-soft pt-5`), the
      pattern `Standard`'s stat row uses. Icon tiles go. Done when: these pages use `Card`
      only for forms and the valuation result.
- [ ] **3.6 Theme toggle.** Per D2: remove `ThemeToggle` from the header and drawer
      (`Header.tsx` lines with `<ThemeToggle`), keep the inline theme script following
      `prefers-color-scheme`. If D2 says "remove entirely", also delete the `.dark` block in
      `globals.css`, `darkMode: 'class'`, and the `sawa-theme` localStorage read. Done when:
      no toggle renders and both themes (or the one theme) pass a visual check.
- [ ] **3.7 Monthly price on cards.** In `CarCard.tsx`, under the price, add
      `~{formatMoney(monthlyEstimate(car.price))}/mo` using the existing helper in
      `lib/business.ts` and the `cars.card.monthlyEst` key. Done when: every card shows a monthly
      figure consistent with the listing page's.
- [ ] **3.8 Proof photography.** When D3 delivers images, place them in `web/public/img/`
      (add credits to `CREDITS.md`), use one in `Proof.tsx` and one in How Sawa works. Strip
      EXIF before committing. Done when: both pages show a real Sawa photograph with alt text.
- [ ] **3.9 Recently sold row.** Backend already records `sold_at`. Add
      `GET /cars?status=sold&limit=6` support if absent (check `routes/cars.js` status filter
      and `PUBLIC_CAR_COLUMNS`), then a "Recently sold" row under the stock grid showing title,
      score and "Sold" (no price if the owner prefers; default show the asking price). Done
      when: the row renders only when at least 3 sold cars exist in the last 90 days.
- [ ] **3.10 WhatsApp fallback on listings (D5).** On `cars/[id]/page.tsx` for signed-out
      visitors, under "Sign in to contact seller", add an outline button "Ask Sawa about this
      car on WhatsApp" linking to `https://wa.me/{CONTACT.whatsapp}?text=` with the listing URL
      pre-filled. It goes to Sawa's line, never the seller's. Done when: the link opens WhatsApp
      with the car title and URL in the message.
- [ ] **3.11 Saved-search promotion.** On `/cars` empty and low-result states and on the stock
      section, add one line: "Tell me when a {make} under {budget} arrives" linking to
      `/dashboard/saved` (signed in) or `/signup?next=/dashboard/saved`. Done when: the link
      carries the current filters as query params the saved-search form can read.
- [ ] **3.12 Make and budget landing pages.** Add `/cars/make/[make]` and
      `/cars/under/[amount]` routes that render the `/cars` page with the filter preset, a
      distinct `<h1>` and canonical, and list them in `sitemap.ts` for makes with ≥ 1 live car
      and for each `BUDGET_EDGES` value with ≥ 1 car. Done when: `/sitemap.xml` lists them and
      each page's `<title>` differs.
- [ ] **3.13 Android message.** On `/download` and in the footer's store block, while
      `APP.androidLive` is false, show "On Android, use sawacars.com. Everything works in the
      browser." instead of only "Coming soon". Done when: the sentence renders and disappears
      when `androidLive` flips.
- [ ] **3.14 Page weight.** Homepage HTML is ~449 KB. Check what dominates (RSC payload of
      the 100-car stock fetch, the i18n catalogue, inline SVG ticks). Pass only the fields
      cards need from `getStock()` to client components, and cap the hero's `modelsByMake` to
      makes in stock. Target under 200 KB. Done when: `curl -s https://sawacars.com | wc -c`
      after deploy is under 200,000.

## Done means

- Every page: paper opening, one red button per screen, one disclaimer, visible on load,
  readable at 390 px with the primary action in reach.
- Homepage: five sections, a car on the first screen, nothing promoted that is empty.
- Seller: valuation → book on the web, never a forced app download.
- The invariants in `CLAUDE.md` §3 and §4 untouched.
