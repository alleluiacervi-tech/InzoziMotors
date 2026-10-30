# Sawa mobile app design and usability audit

Date: 30 October 2026

This is the original audit snapshot. See [implementation and validation](mobile-app-refinement.md) for the delivered fixes and remaining native acceptance work.

## Assessment

The app already has a coherent foundation: the Sawa identity, self-hosted Satoshi typography, the existing red and warm neutral palette, vehicle-led screens, real inspection evidence, and five understandable bottom destinations. A professional redesign should strengthen this system rather than replace it with a different visual identity or add more features.

The most important weaknesses are inconsistent discovery, misleading labels, evidence-review controls that do not perform their apparent action, and accessibility gaps. These matter more than new animations or decorative styling. Do not describe the app as best-in-market without comparative testing and user evidence.

## Scope and confidence

- Inventoried 59 screen files and traced the relative-import graph across 148 JavaScript modules.
- Reviewed navigation, theme, reusable components, first launch, discovery, vehicle details, saved vehicles, authentication, seller submission, identity verification, settings, and mobile administration.
- Rendered the shared React Native app through Expo web at 390 × 844: first launch, Home, Cars, vehicle detail, Account and buying guide. Also inspected the Cars screen in dark mode. No page JavaScript errors occurred in the representative screen walkthrough.
- This is not a native iOS/Android device certification. Native font scaling, VoiceOver/TalkBack, camera permissions, keyboard behavior, gesture navigation, process death, tablet layouts and frame performance still require device testing.
- The local environment contains E2E inventory and development-only fixtures. Their images, users, unread counts and demo controls must not be mistaken for production customer data or reported as production defects.
- This audit does not change app behavior or remove features. The website/ID-review commit remains separate.

## Priority findings

P1 means resolve before presenting the affected journey as production-quality. P2 means a clear usability or consistency improvement. Cleanup is separate from user-visible redesign.

### P1 — Mobile ID review looks actionable without showing the evidence

Evidence: `src/screens/AdminPanelScreen.js:130` renders document chips with eye icons. Their handler only displays “The full document viewer ships with the admin web dashboard.” Approve and Reject remain beside those controls at lines 144–161.

Impact: staff are invited to make an identity decision without the apparent document-viewing controls showing the documents. This is especially problematic in an executive demonstration of the verification process.

Recommendation: provide an explicit, working handoff to the authenticated web review experience, or complete authenticated document viewing before keeping the decision controls in this mobile workflow. Do not simply make expiring document links permanent. Keep the distinction between document review and valid off-platform verification.

Acceptance: a reviewer can inspect the actual evidence before deciding; revoked/suspended/non-admin access is denied; no document credentials are exposed in persistent public URLs. An unavailable mobile capability is explained honestly instead of represented by a nonfunctional eye button.

### P1 — Cars tab searches a limited catalogue while the other search uses server pagination

Evidence: `src/screens/SearchScreen.js:55` filters the in-memory `cars` array. `src/context/AppContext.js:573` populates that array with `getCars()` without pagination parameters. `backend/src/routes/cars.js:161` defaults the public list to 20. The Cars tab FlatList has no load-more handler. In contrast, `SearchResultsScreen.js:86` and its loadMore callback use `searchCars()` with server paging.

Impact: once stock exceeds one page, the Cars tab can miss available vehicles and display a subset count, while the home search finds different results. A visual refresh alone will not fix this.

Recommendation: keep both entry points if useful, but make them use one search state, query contract, paging behavior, and presentation components. Preserve filters and scroll position when returning from a vehicle.

Acceptance: with more than 20 matching listings, both entry points expose all results through pagination and agree on filters, sorting and count semantics. Rename “Newest” if it means model year: both current paths sort it by `year`, while “Best match” maps to listing date on the server.

### P1 — Saved vehicles can disappear when they are outside the loaded catalogue page

Evidence: `src/context/AppContext.js:809` reads saved vehicle objects but retains only their IDs. At line 1441, `getSavedCars()` reconstructs the shortlist by filtering the currently loaded `cars` and `rentalCars` arrays.

Impact: a saved car reached through a deep link or later search page can be missing from Saved even though it remains accessible through its detail endpoint. This undermines confidence in the save action.

Reproduced in Expo web using browser-only interception of the first catalogue page: one saved ID persisted in storage, Saved rendered “Cars (0)” and “No saved cars yet,” and the saved car's detail endpoint still returned HTTP 200. No production data was modified.

Recommendation: retain the saved-list payload or resolve saved vehicle records independently from the home catalogue. Represent genuinely unavailable listings explicitly rather than silently dropping them.

Acceptance: a saved vehicle outside the first catalogue page still appears after reopening Saved and restarting the app. Guest/local and signed-in synchronization states remain understandable.

### P1 — Home origin filters make claims their data does not support

Evidence: `src/screens/HomeScreen.js:148–152` maps “Imported” to right-hand drive and “Local” to left-hand drive. Steering position does not establish a car's import history or its present location.

Also, “Fresh this week” uses the newest four records (`:144`) without checking whether they were listed within the last seven days.

Recommendation: use the existing accurate drive-side terminology when filtering by drive side, and reserve origin/location labels for actual origin/location data. Use “Recently listed” if the section is a latest-stock list rather than a seven-day filter.

Acceptance: every filter label describes the field actually queried; quiet weeks do not make older inventory look newly listed. No new origin claims should be fabricated to preserve a label.

### P1 — Several existing semantic color pairs fail text contrast

Calculated from current source colors using WCAG relative luminance:

| Existing use | Pair | Contrast | Consequence |
|---|---|---:|---|
| Dark-mode small prices | `#DA2C32` on card `#171413` | 3.83:1 | Below 4.5:1 for the 16px/18px price variants in `src/components/Price.js:100,113`; the larger detail price has a different threshold |
| Light success badge | `#16A34A` on `#EAF6EE` | 2.97:1 | Small success text in `src/components/Badge.js:34` is too low-contrast |
| Dark inspected badge | white on `#7DA5FF` | 2.41:1 | The existing inspected variant can become unreadable in dark mode |

Recommendation: preserve the palette and separate color roles. Keep the existing red action fill with its readable label; use an existing lighter red for small text on dark surfaces. Use `greenText` for success text and existing dark ink on the lighter dark-theme badge fills. Audit actual component states, not just the palette comments.

Acceptance: normal text reaches 4.5:1; large text reaches 3:1; meaningful non-text controls reach 3:1. Check light, dark, disabled, selected, warning and error states independently.

### P1 — Authentication loses the user's intended task

Evidence: `src/hooks/useSellerGate.js:25` opens SignIn without retaining the requested destination. `src/screens/SignInScreen.js:29` replaces the route with Main after success. Social sign-in similarly returns to Main. The sign-in screen also has no pending state passed to its shared Button (`:111`).

Recommendation: resume the existing action after successful authentication, preserving safe route parameters. Use the shared loading/disabled behavior to prevent repeat submissions and make slow requests visible. Add appropriate native autofill metadata and explicit input accessibility labels.

Acceptance: signing in while trying to submit a car or perform another gated action continues that task. Failed requests preserve entered information. Password managers work and repeated taps do not submit concurrent sign-in attempts.

### P2 — Card density and fixed row height sacrifice readability

Evidence: `src/components/CarCard.js:120` forces the vehicle name to one line. `CarListCard.js:113` fixes the entire row at 118px, while title, specifications, location, score and price compete inside it. Badge text reaches 10px (`:145,150`). In the rendered two-column Home cards, the exchange-rate warning is visibly truncated.

Recommendation: allow two title lines with a consistent reserved height, simplify metadata to the facts needed for scanning, and make row height respond to text rather than forcing text into a fixed box. Keep the primary RWF price prominent; express indicative conversion status compactly without hiding the uncertainty. Use one sales-card pattern across Home, Cars and Saved, with a deliberate rental variant.

Acceptance: long model names and translated prices remain understandable at small phone widths and large native text settings. Cards align without losing the distinction between vehicles. Test actual hit areas before calling a 36px heart too small: the current component already supplies hitSlop.

### P2 — Bottom navigation needs explicit accessibility semantics

Evidence: the custom bottom tab items at `src/navigation/TabNavigator.js:90` do not pass the selected state, a tab/button role, or an unread-count label. The wrapper component forwards props but does not create these semantics automatically. Labels are capped at 1.3× and fixed chrome needs device testing.

Recommendation: retain the five existing destinations. Expose accessible names, selected state and contextual unread counts. Avoid changing navigation structure merely to create a different-looking app.

Acceptance: VoiceOver and TalkBack identify each destination, its selected state and meaningful unread count. Native text enlargement and safe areas do not hide labels or content.

### P2 — First launch has too many brand/explanation steps

Evidence: `App.js:128` shows the first-run AnimatedSplash; `src/components/AnimatedSplash.js:87` requires Next to dismiss it. `OnboardingScreen.js` has three slides and finishes on Welcome, which is another branded entry screen. This describes the ordinary native launch path; a deep link or Expo web URL can choose a different initial route.

Recommendation: let the native splash hand over automatically, keep an optional, skippable explanation, and get people to inventory quickly. Retain the brand identity and any meaningful user choice; remove redundant mandatory taps. The splash animation currently does not read the reduced-motion preference.

Acceptance: a first-time visitor can reach stock without a mandatory logo-only Next action. Returning users and deep links continue to bypass the introduction. Reduced-motion users do not receive the rotating/scaling brand sequence.

### P2 — Home has competing discovery surfaces and motion

Evidence: Home includes search, buy/rent mode, featured placements, origin chips, stock, showrooms, brands, recently viewed, recommendations, popular vehicles, tools and imports, with conditional visibility. The featured rail advances every five seconds (`HomeScreen.js:36,122`), pausing for eight seconds after touch. Reduced motion, focus and app-background guards already exist and should be preserved.

Recommendation: keep search and live stock dominant, then show the most relevant existing supporting sections. Keep calculators and less-frequent tools accessible through their existing destinations without giving each equal home-page weight. Prefer manual featured browsing or provide an accessible persistent pause; don't add more automatic animation.

Acceptance: the first screen clearly explains how to find a vehicle, promotional placements remain disclosed, and people can inspect a featured car without it advancing unexpectedly. Do not use the large source-file size alone as proof that the visible page is cluttered: actual section visibility depends on data.

### P2 — Empty, offline and verification states need more precise meaning

Evidence: Home distinguishes an unreachable backend, but `SearchScreen.js` builds its empty state without reading backend reachability. Saved cards and search can therefore lack the same outage explanation. `IDVerificationScreen.js:57` draws completion marks for all three document types based only on pending/approved status; it does not inspect actual document presence or verification method.

Recommendation: carry the existing distinction between no matches, no stock, retained offline data, and a failed request into every discovery surface. In verification, show the actual evidence/method state or a neutral identity-review status rather than asserting that specific uploads exist. Maintain the existing rule that ID approval is required before publication/contact, not before starting a seller submission.

Acceptance: offline failure never masquerades as “no matching cars,” and valid off-platform verification does not claim three uploaded files. Avoid persisting raw identity photos to implement convenience.

## What to keep, simplify and remove

### Keep

- Existing palette, Satoshi family, recognizable brand assets, restrained inspection scoring and price hierarchy.
- Five bottom destinations: Home, Cars, Saved, Messages, Account.
- Seller submission, inspection reports, rental inquiries, import journeys, calculators and the distinct business/showroom/individual-seller concepts where the data requires them.
- Existing safe-area scaffolds, StickyFooter, shared loading/error primitives, cached photos, demo/release separation and account restrictions.
- The correct parts already present: real featured placements, guest browsing, genuine seller states, server-backed search, valuation prefill and a shared valuation engine.

### Simplify, without deleting capabilities

- Two discovery implementations → one shared query/paging system behind the current entry points.
- Repeated home-page entry surfaces → a clearer priority order, with secondary tools still reachable.
- Competing card/badge/price treatments → a consistent component system with fewer simultaneous signals.
- Repeated first-run branding → a shorter optional explanation.
- Native mobile admin document controls → an honest authenticated handoff unless the native review is fully implemented.
- Consider unifying Marketplace Safety and How Buying Works presentation after content comparison; both are currently linked, so neither is proven dead.

### Confirmed cleanup candidates

| Candidate | Evidence | Recommendation |
|---|---|---|
| `src/api/reviews.js` | No incoming imports in the static app graph; no call sites for its methods | Remove the unused client wrapper only after confirming there is no planned consumer. This does not authorize deletion of backend historical feedback/moderation or retention data |
| `MENU_SELLER` and `MENU_ACCOUNT`, `src/screens/ProfileScreen.js:12,19` | Each identifier appears only at its declaration; current menus are constructed separately with translated labels | Remove duplicate unused definitions |
| `LABELS`, `src/navigation/TabNavigator.js:30` | Declaration-only; rendered labels come from `t(...)` inside TabBar | Remove the unused English map |
| Auction/current-bid branches and `jeondan*` aliases | Referenced in live source, including pricing and badges | Treat as legacy review candidates, not proven dead code. Confirm backend/data contracts and import distinctions before removing; ordinary marketplace bidding should not be implied |

No screen file was proven unused by this import scan. In particular, DealerProfile and AdminAnalytics have current callers; ServiceFees and BuyingGuide are linked as well. Registration/import reachability alone does not prove that every role can navigate to a screen, but it is enough to reject the old blanket claim that these files are orphaned.

## Proposed visual standard

Retain the current identity. Use vehicle photography as the main visual material and inspection evidence as the distinctive trust signal. Keep backgrounds quiet and use red intentionally for primary actions, prices and selected states. Separate action fills from text colors within the existing palette.

| Surface | Target presentation |
|---|---|
| Home | Compact brand/navigation, one obvious search entry, buy/rent context, then stock; relevant supporting sections follow |
| Cars | Consistent search/filter/sort toolbar; complete paginated inventory; stable list/grid behavior |
| Vehicle detail | Photograph, name, asking price, condition/evidence and one primary contact action; existing supporting details remain easy to inspect |
| Saved | A reliable shortlist independent of the first page of stock; clear available/unavailable status |
| Messages | Readable threads, clear participant/vehicle context, visible sending/failure status; preserve current privacy rules |
| Selling | One visible next step, readable status and in-context validation; keep valuation prefill and the current shorter form |
| Verification | Clear capture instructions, actual upload/review states and a truthful explanation of next steps |
| Account/settings | Grouped personal, selling and preference actions; staff tools remain role-specific |
| Operations | Evidence before decisions, clear queues and status, no controls pretending to open unavailable information |

## Delivery order and acceptance

1. Correct the trust and continuity problems: mobile evidence review, complete catalogue search, saved-list resolution, inaccurate labels, sign-in resumption and text contrast.
2. Refine shared primitives: accessible tabs/inputs, long-name card layouts, adaptive rows, price and badge roles, and consistent empty/error states.
3. Simplify the existing Home and first-launch sequence without removing working capabilities.
4. Remove confirmed dead definitions; investigate legacy auction-related paths separately against current API contracts.
5. Run a native acceptance pass on a small iPhone, a small Android phone and a large phone: light/dark, French/Kinyarwanda, largest text settings, VoiceOver/TalkBack, keyboard visible, slow/offline network, back navigation, camera denial and interruption/recovery. Review staff and customer roles separately. A browser screenshot cannot close this requirement.

No new chat, financing, payment, social, or marketplace features are needed to complete these improvements.

## Validation performed

- Locked mobile dependencies installed using `npm ci`; manifests and lockfile unchanged.
- `npm run mobile:imports`: 736 relative imports resolved across 148 files.
- `node scripts/check-module-scope.js`: 146 modules loaded without throwing.
- `node scripts/check-undefined-refs.js`: 148 files passed.
- `node scripts/check-hook-order.js`: 147 files passed.
- `npm run release:check`: passed.
- Expo web bundled successfully in supported offline tooling mode. Representative shared-screen walkthrough had no page JavaScript errors.
- Reproduced saved-vehicle omission with a controlled first-page response and a valid saved vehicle outside that page.
- WCAG contrast calculations reproduced the ratios above. These are pair measurements, not a claim of full app accessibility conformance.

The older `docs/UX-AUDIT.md` contains references to removed checkout/booking paths and issues already corrected. It is historical context, not the current implementation backlog.
