# Sawa — UX & Design Audit
> Jul 17, 2026 · Full-app trace of buyer, seller, renter, and admin flows.
> Every finding verified against actual code with file:line references.

## Executive Summary

The app's **shape is right** — flows are short on paper (buyer 9–10 taps, renter 5 taps) and the design language is consistent and modern. The problems are almost all **underneath the UI**: broken wiring that makes core actions silently fail, hardcoded demo data that has gone stale, duplicate data entry on the seller path, and features that are advertised but unreachable.

**Happy-path tap counts (current → achievable):**

| Journey | Current | Achievable | How |
|---|---|---|---|
| Buyer: open app → booked handover | 9–10 taps, 5 screens | ~7 taps, 4 screens | merge review into detail, smart defaults, lazy login |
| Seller: valuation → submitted | ~23 interactions | ~11 | prefill wizard from valuation, 2-step wizard, optional photos |
| Renter: open app → booked | 5 taps | 3 taps | pre-select first available date |
| Seller: book inspection | unreachable | 4 taps | wire scheduling to approved submissions |

---

## P0 — Demo-breaking (fix before showing anyone)

1. **Welcome "Certify & Sell My Vehicle" goes nowhere.** `navigation.replace('Main', { screen: 'Sell' })` but no Sell tab exists — lands on Home. `WelcomeScreen.js:123`, `TabNavigator.js:94-97`
2. **SellScreen is orphaned.** Not registered in any navigator; the valuation entry point dies with it — the "What's my car worth?" feature is unreachable. `SellScreen.js`, `RootNavigator.js`
3. **Purchase booking is broken.** `bookHandover` isn't awaited → booking ID renders as a Promise; no offline fallback → with no backend the success screen lies and OrderTracking never finds the order. `CheckoutScreen.js:293`, `AppContext.js:799-822`, `OrderTrackingScreen.js:45`
4. **Save heart never works.** `toggleSaveCar` silently returns for guests and silently fails without a backend — every heart in the app is a no-op. `AppContext.js:529-539`
5. **Sign-in is impossible in demo state.** `loginUser` has no offline fallback; LoginModal's guest login calls the real API with (name, email) as (email, password) and always rejects. `AppContext.js:475`, `VehicleDetailScreen.js:386`
6. **Every bookable date is in the past.** Hardcoded anchors: Checkout Jun 28 (`CheckoutScreen.js:23`), InspectionScheduling Jun 28 (`:41`), rentals Jul 16 (`rentals.js:270`), admin header Jun 28 (`AdminPanelScreen.js:311`). Use `new Date()`.
7. **Car submissions are silently lost.** `addSubmission` not awaited, throws without local fallback → "Submission Received!" but dashboard never shows the car. The payload also drops condition/photos/notes the seller typed, and the accident + notes fields share one state key so they overwrite each other. `CarSubmissionScreen.js:129,117,231`, `AppContext.js:582-611`
8. **Admin cannot review submissions.** No Submissions tab in AdminPanel — the pipeline's first admin step doesn't exist, so seller cars can never leave `under_review`. `AdminPanelScreen.js:10`
9. **Rent-mode search dumps renters into sale listings.** Search bar and Search tab only query sale `cars`. `HomeScreen.js:159`, `SearchScreen.js:15`
10. **Wizard "Continue" buttons aren't actually gated** — opacity only; an empty form can reach Submit (Button has no `disabled` support). `CarSubmissionScreen.js:194,253,297`, `Button.js:34`
11. **Fake price slider silently filters.** Static knobs at 12%/74% but `maxPrice: 45000` is really applied — results shrink and a chip appears the user never chose. `FiltersScreen.js:55-64`

## P1 — Process length & duplication (the "shorten everything" list)

**Seller side:**
12. Valuation collects make/model/year/mileage → wizard asks for all four again (no prefill param). `CarValuationScreen.js:75-80` → `CarSubmissionScreen.js:94`
13. Inspection scheduling is disconnected from the funnel: not a wizard step, no route from an approved submission, its booking writes nothing to context, and the Profile menu opens it context-free claiming "Your submission was approved!". `InspectionSchedulingScreen.js:80-88`, `ProfileScreen.js:12`
14. 4-step wizard (14 fields, 4 required photos) for a business where the team inspects everything anyway → 2 steps, photos optional. `CarSubmissionScreen.js:41,117`
15. ID verification neither enforced nor sequenced — require it at inspection booking, not before. `IDVerificationScreen.js` + `CarSubmissionScreen.js`
16. Rejected submissions offer no action (no resubmit/contact) — dead end at the critical moment. `SellerDashboardScreen.js:113-119`
17. "Relist at new price" on a *live* listing demotes it to `under_review` — price change takes the car off the market. `AppContext.js:620-636`
18. Six different labels for the one sell flow ("Certify & Showcase", "Certify My Car", "Submit My Car", "Certify & Sell My Vehicle", "Submit Your Car", "Book My Inspection"). Pick one pair.
19. Two independent price engines (wizard's `aiSuggestPrice` vs `estimateValuation`) give the same car two different "AI" ranges. `CarSubmissionScreen.js:16-25` vs `data/finance.js`

**Buyer side:**
20. SearchScreen and SearchResultsScreen are near-duplicate screens with divergent behavior; filters lose the typed query between them. Consolidate to one.
21. Login demanded before the Checkout *review* phase (informational) — defer to Confirm.
22. Checkout review phase repeats VehicleDetail content — merge into detail, open slot picker directly (~2 taps saved).
23. Booking starts with nothing selected — pre-select first center + first date (2 taps saved).
24. No way to create a saved search anywhere — `createSavedSearch` exists but no screen calls it; Searches tab is pure mock. `AppContext.js:866`
25. "Cancel Request" doesn't cancel anything — just `goBack()`. `OrderTrackingScreen.js:137-146`

**Renter side:**
26. No return/check-out flow — `completed` status unreachable; deposit-refund story ends halfway. `MyRentalsScreen.js:80`, `RentalCheckInScreen.js:29`
27. Booking validates only the start date — a 7-day trip can book straight through blocked days. `RentalBookingScreen.js:106`
28. Confirmation invents "9:00 AM" — a time never chosen. `RentalBookingScreen.js:62`
29. Check-in is 10 interactions for simulated photos — offer a guided/batch walkaround.
30. Pre-select first available pickup date → 3-tap booking.

## P2 — Missing states & feedback

31. OrderTracking default status `'sent'` isn't in the timeline → all steps pending while header says "Complete". `OrderTrackingScreen.js:45,126`
32. Notification filter chips are dead; bell dot is static (ignores real unread count); rental notifications don't deep-link to MyRentals. `NotificationCenterScreen.js:150,99`, `HomeScreen.js:125`
33. Settings rows (profile, language, help, terms…) all dead; dark-mode toggle changes nothing. `SettingsScreen.js:60-79`
34. SectionHeader renders a dead "See all" when no action is passed. `SectionHeader.js:10`
35. Dashboard "47 views" hardcoded; SellerAnalytics keyed to mock `sub1-3` with fallback to sub1 — real submissions show another car's numbers. `SellerDashboardScreen.js:86`, `SellerAnalyticsScreen.js:24-28`
36. Every car detail shows identical hardcoded copy ("single owner, non-smoker", tread 6/32") — obvious across two cars. `VehicleDetailScreen.js:295-308`
37. "Fresh This Week" and "Popular in Kigali" are the same `cars.slice()` — same cars twice in a row. `HomeScreen.js:90-91`
38. Missing empty states: Messages list, rent-mode zero-filter-results; missing loading state in rent mode.
39. Inspection report always shows the static 143-score mock — contradicting the rental row's own "148/150". `RentalDetailScreen.js:170`, `inspectionData.js:178`
40. Admin approves IDs without being able to view the documents. `AdminPanelScreen.js:108-157`
41. Demo user defaults to `id_verified: 'approved'` — the entire ID verification UX is untestable. `AppContext.js:17-22`
42. Dead buttons: Share (sale + rental detail), chat call/attach, Google/Apple signup, footer About/Privacy, drawer "Price Intelligence"/"Inspection Reports" → generic search.

## P3 — Consistency & polish

43. **Auth is incoherent:** buying gated, renting/chat/submission ungated — one policy needed.
44. Guest sees a fake fully-verified "Alex Morgan" profile with no sign-in prompt. `ProfileScreen.js`
45. Currency: RWF toggle exists in context but no UI uses it; rentals are USD-only; "< 30k miles" in saved search while app shows km.
46. Two save flows (detail gates login, card doesn't); two login UIs — LoginModal still offers **"Continue with Kakao"** (Encar leftover). `LoginModal.js:39-47`
47. Theme naming debt: `navyDeep/blueLight/blueTint` hold green values; `primary #0A5C2E` vs docs `#15803D`; off-palette hexes scattered (`#DCFCE7`, `#B45309`, `#EF4444`…).
48. Unreachable registered routes: ListingWizard (legacy, contradicts business model — delete), DealerProfile, AdminAnalytics.
49. CarCard: fabricated year format from `id % 12`; US city names (Francisco, Oakland, Berkeley) still in the location mapper.
50. Rentals absent from drawer; Saved buried behind drawer (not a tab); unread-notifications badge sits on Profile tab while notifications open from Home's bell.
51. Duplicated styles (`resultActions`, `layoutBtn` defined twice); chip/stepper components triplicated across wizards; mixed StatusBar libraries.

---

## Recommended fix order

1. **Wiring sprint (P0):** dates → `new Date()`, await + local fallbacks (bookHandover, addSubmission, loginUser, toggleSaveCar), fix Welcome CTA, register SellScreen, real `disabled` on Button, rent-mode search, admin Submissions tab.
2. **Funnel sprint (P1):** valuation→wizard prefill, 2-step wizard, scheduling wired to approved submissions, checkout collapse + smart defaults, rental return flow, one search screen.
3. **Feedback sprint (P2):** empty/error states, live notification dot + deep links, per-car detail copy, working saved-search creation.
4. **Polish sprint (P3):** one auth policy, currency toggle in UI, theme token rename, delete legacy screens, kill dead buttons.
