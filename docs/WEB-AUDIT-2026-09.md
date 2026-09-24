# Sawa Cars web: audit and recommendations

> 24 Sep 2026 · `web/` at `9c5ea32` · audited before any redesign work starts.
> Method: production build (`next build` + `next start`) against a local
> backend with the demo seed, captured with Playwright at 1440×900 and
> 390×844, axe-core (WCAG 2.1 AA + best practice) across 9 pages in both
> themes, a bundle analysis, and a code read of every public surface.
> sawacars.com, Be Forward and Auto24 could not be loaded from the audit
> environment (the network policy blocks them), so competitor notes come from
> their public positioning, not from a side-by-side capture.

---

## Verdict

The foundation is already better than most marketplaces in the region, and
the redesign should build on it, not replace it. The token system (two themes,
contrast checked), the type scale, the trust model (inspection, verified
sellers, no checkout) and the accessibility work are all good. On axe-core,
only **3 rules fail across 18 page and theme combinations**.

What separates the site from world-class is not polish. It is five things:

1. **Core information is hidden.** Listing titles truncate to "2021 Le…" on `/cars`.
2. **Weight.** Every visitor downloads all six languages: 220 KB of gzipped JavaScript.
3. **Inventory comes too late.** On a phone, a buyer scrolls past a dark banner before seeing a car, and the homepage is 12.5 screens tall.
4. **Search is thin.** There is one free-text box. The quick paths by make, budget and body type that Be Forward is known for are missing.
5. **Two of the three businesses are invisible.** Rentals has no homepage presence. Imports (Japan/UAE), which competes directly with Be Forward, has no public page at all.

| Area | Score | Note |
|---|---|---|
| Brand and design system | 8/10 | Coherent tokens, measured contrast, disciplined red. Needs signature photography and one memorable moment. |
| Accessibility | 9/10 | Skip link, focus ring, reduced motion, 16px fields on iOS. Three small fixes. |
| SEO and structured data | 8/10 | Car, Offer, AutoDealer, Breadcrumb and SearchAction schema, sitemap, hreflang-ready. No indexable make or model landing pages. |
| Performance | 5/10 | 220 KB gzipped i18n chunk on every page, plus a splash screen on first visit. |
| Discovery and search | 5/10 | Free text only on home. Filters are good once you reach `/cars`. |
| Listing card and detail | 6/10 | Honest and well reasoned, but titles truncate, the gallery has no fullscreen view, and the call-to-action names differ. |
| Business coverage | 4/10 | Sales only. Rentals is secondary; imports and showrooms are absent from public pages. |

---

## Findings

### P0: fix before any visual redesign

**F1. Listing titles are unreadable in the `/cars` grid.**
At 1440px with the filter sidebar, cards read "2021 Le…", "2023 Ki…" and
"2022 L…". The title (`h3.truncate`) shares a row with `<Price>`, which is
`shrink-0` and carries a second line for the USD figure, so the price takes
the width and the name loses. The same card in "More Tesla" shows only
"2023 …". A buyer cannot tell which car they are looking at.
`web/src/components/marketplace/CarCard.tsx` (title/price row),
`web/src/components/Price.tsx`.
*Fix:* put the title on its own line (two-line clamp) with the price beneath
or right-aligned on the spec line. Never truncate make and model.

**F2. Every visitor downloads every language.**
Chunk `23-*.js` is 657 KB raw and **220 KB gzipped**. It holds the full
dictionaries for en, rw, fr, sw, ko and zh (`web/src/lib/i18n/messages/*`,
735 KB of source) because `LanguageProvider` imports `getT` client-side. The
homepage's first load is 343 KB against a 102 KB shared baseline. On Rwandan
3G/4G this is the single largest cost on the site.
*Fix:* translate on the server and pass only the active locale's strings to the
client, split per namespace (only the keys client components use). Target: under
130 KB first-load JS on `/` and `/cars`.

### P1: structure and conversion

**F3. Inventory arrives late on mobile.**
`/cars` on a 390px phone opens with a ~330px dark banner (eyebrow, H1, lede,
three chips), then Filters and Sort on two rows. The first car is only partly
visible on the first screen. The homepage is 10,527px tall on mobile
(12.5 screens) and 7,313px on desktop.
*Fix:* compact the `/cars` header to one line of title and count, put Filters
and Sort on one row, and show two cards on the first screen. Trim the homepage
by merging "Evidence before contact", "What the score is made of" and
"How it works" into one inspection story.

**F4. Search offers only free text.**
The hero has a single `q` input. Buyers in this market search by make, then
budget, then body type. `vehicle_makes` and `GET /makes` already exist, but the
homepage has no make browse, no budget shortcut and no model autocomplete.
*Fix:* a three-field command bar (Make → Model → Max budget) that still submits
a plain GET to `/cars`. Add a brand strip (lettermarks until logos are
uploaded) and budget bands in RWF. Add indexable landing pages such as
`/cars/toyota`, `/cars/toyota/rav4` and `/cars/under-20m`, which is where
organic search traffic for Kigali car queries comes from.

**F5. Rentals and Imports are invisible from the front door.**
The homepage covers sales only. `/rentals` is linked in the nav but never
presented. **Imports has no public page**: the Japan/UAE flow (quote →
agreement → 50/50 milestones with bank-transfer proof) exists only under
`/dashboard/imports`. That is the Be Forward product, offered with local
inspection and a local team, and nobody can find it.
*Fix:* a three-way switch on the homepage (Buy / Rent / Import), a public
`/imports` explainer with the duty calculator built in, and a rentals rail on the homepage.

**F6. The site speaks in two visual registers.**
The homepage hero is on light paper. `/cars` and `/rentals` open on a dark ink
band with a red glow. `Hero.tsx`'s own header comment explains why the dark band
was removed from the homepage ("reads as a different website"), and the same
argument applies to the listing pages.
*Fix:* one page-header pattern on paper, sitewide.

**F7. Actions change names and the header is crowded.**
Desktop detail: "Sign in to contact seller". Mobile sticky bar: "Request this
car". The header has 11 interactive items at 1440px, and "Browse cars"
duplicates "Buy".
*Fix:* one verb per action across breakpoints. Header: logo, Buy, Rent,
Import, Sell, search, account, and one primary button.

**F8. The listing gallery has no fullscreen view.**
`Gallery.tsx` has arrows and thumbnails but no fullscreen, zoom or swipe
lightbox. Photos are what cars are bought on.
*Fix:* a fullscreen viewer with pinch-zoom and swipe, keyboard support, and
photo-angle labels (front 3/4, interior, engine bay, odometer, tyres).

**F9. A splash screen stands between search traffic and the page.**
`BrandSplash` shows a spinning mark for 0.9–2.2 s on the first visit of every
session, including visitors landing on a listing from Google. It no longer
blocks taps, but it hides the first paint.
*Fix:* remove it on the web. The app can keep its native splash.

### P2: craft

**F10. Accessibility (3 axe rules).**
- `color-contrast` (serious): footer column headings use `text-white/40`, which
  fails 4.5:1 on every page in both themes. `web/src/components/layout/Footer.tsx`.
- `definition-list` and `dlitem` (serious): on the car detail page, the
  "Decision summary" `<dl>` wraps `dt`/`dd` in extra `div`s that are not direct
  `div` groups. `web/src/app/cars/[id]/page.tsx`.

**F11. The hero says 150 three times.**
The ink card, the metric strip and the trust chip all say "150". Keep one
statement and spend the space on a live inventory count or a real listing.

**F12. Rhythm and template.**
Nearly every section is an eyebrow, an H2 and a right-aligned lede, with
~250px of empty band between sections and fade-up reveals. It reads
competent but generic. Keep the structure where it carries information,
and drop repeated eyebrows (see `frontend-design` guidance).

**F13. Photography is the biggest premium lever.**
Listing photos arrive in mixed crops and backgrounds, and the card crops side
profiles with `object-cover`. Sawa controls the inspection centres, so it can
do what no competitor in Rwanda does: shoot every car on the same backdrop,
from the same set of angles, under the same light. Nothing else would do more
to make the site look like a billion-dollar brand.

**F14. Housekeeping.**
- CLAUDE.md says migrations run "through `0036`"; the tree is at `0047`.
- The "Pickups" browse tile is the only homepage image still hot-linked from
  Unsplash (`web/src/lib/imagery.ts`).

---

## Competitive position

| | Be Forward | Auto24 | Sawa Cars today | Sawa Cars target |
|---|---|---|---|---|
| Core promise | Huge Japanese export stock, low price | Certified used cars, local | 150-point inspection, verified sellers, direct deal | Same, made obvious in 3 seconds |
| Search | Make/model/price/year first | Make/budget | Free text on home | Make → Model → Budget + brand strip |
| Imports | The whole business | – | Built, but hidden in the dashboard | Public `/imports` with duty and landed cost |
| Rentals | – | – | Built, secondary | First-class tab |
| Trust evidence | Minimal | Inspection badge | Full score, categories, critical items | Keep; add a photographed report |
| Design | Dense, dated | Clean, template | Editorial, restrained | Editorial + signature photography |
| Mobile weight | Heavy | – | 343 KB first load | < 130 KB |

Sawa's advantage is **evidence**. Neither competitor publishes a full scored
inspection with critical items that block publication. The redesign should
make that the thing people remember, and put inventory, search and the three
businesses in front of it.

---

## Recommended plan

**Phase 1: correctness and speed (small, safe, measurable)**
1. F1 card title and price layout.
2. F2 per-locale, server-first i18n. Target < 130 KB first-load JS.
3. F9 remove the web splash.
4. F10 the three accessibility fixes.
5. F7 unify call-to-action names; slim the header.

**Phase 2: the redesign of the core journey**
1. Homepage rebuilt around Buy / Rent / Import, a structured search bar, a brand
   strip, budget bands, live inventory and one inspection story (F3, F4, F5, F11, F12).
2. `/cars`: compact header, one-row controls, a denser card, a saved-search prompt.
3. Car detail: full-bleed mobile gallery with fullscreen viewer (F8), inspection
   score summary in the first screen, one sticky action.
4. A single paper page-header pattern across all listing pages (F6).

**Phase 3: new surfaces**
1. Public `/imports` with a landed-cost calculator (FOB + freight + duty in RWF).
2. SEO landing pages by make, model, body type and budget, with ItemList schema.
3. Photography standard for inspection centres (F13): backdrop, angle list,
   and a capture checklist in the admin inspection flow.
4. Comparison view (`/compare`) for up to three saved cars.

Every phase keeps the invariants in `CLAUDE.md` §3 and §4: no checkout, no
escrow, no guarantee, RWF canonical, listings public only with inspection
evidence.

---

## Tooling now in the repo

`.claude/skills/` (project skills, load automatically in Claude Code):

| Skill | Source | Used for |
|---|---|---|
| `frontend-design` | anthropics/skills (Apache-2.0) | Art direction, type, layout, avoiding templated defaults |
| `web-design-guidelines` | vercel-labs/agent-skills (MIT) | Rule-by-rule UI review against Vercel's Web Interface Guidelines |
| `react-best-practices` | vercel-labs/agent-skills (MIT) | Next.js/React performance rules (bundle, waterfalls, rendering) |
| `ui-ux-pro-max` | already present | Palettes, font pairings, UX guideline search |
| `playwright-skill` | already present | Screenshots, responsive checks, flows |

Account plugins offered for install (enable from the install card in the Claude app): **Design**
(critique, design system, accessibility review, UX copy), **SearchFit SEO**
(technical SEO, schema, on-page), **Marketing** (brand review, competitive brief).
