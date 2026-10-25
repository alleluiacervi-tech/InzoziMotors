# Web parity — task list

Plan and reasoning: [`WEB-PARITY-PLAN.md`](WEB-PARITY-PLAN.md). IDs (G#, B#, W#,
D#, O#) refer to that document. Tick items in the PR that ships them.

## Before starting
- [x] O1 — confirm phase order → **messaging first** (recommended default, accepted 2026-09-27)
- [x] O2 — desktop ID upload allowed? → **yes, flagged for reviewers** (recommended default, accepted 2026-09-27)
- [ ] O3 — referrals: restore on web or retire in app — **still open**, no safe default; needs an actual product call, not just a "go ahead"
- [x] O4 — offline message email default → **on, with opt-out** (recommended default, accepted 2026-09-27)

## Phase 0 — Foundations
- [x] **W5** Add Playwright to `web/` with one smoke test (home → car → sign-in page); run in CI against backend + Postgres service
- [x] **D1** `web/src/app/api/upload/[kind]/route.ts` — cookie → Bearer streaming proxy, per-kind size/count limits, no body logging (`id` kind wired to `POST /id-verification`; more kinds land with the feature that needs them)
- [x] **D1** Upload size at the edge: **nothing to change.** Production is fronted by Caddy, not nginx (`ops/caddy/sawacars.Caddyfile`), and the `sawacars.com` block sets no `request_body` limit, so Caddy imposes none. The upload proxy enforces its own per-file limits.
- [x] **W1** Route-scoped `Permissions-Policy: camera=(self)` for verification + submission routes only
- [x] **D2** Backend `POST /auth/socket-ticket` (60 s, `purpose: 'socket'`) + tests
- [x] **D2/B3** `socket.js`: accept token or ticket; run `verifyLiveSession` on both; tests for suspended/deleted/expired
- [x] **D2** Web `useSocket()` client hook: fetch ticket via Server Action, reconnect with a fresh ticket, disconnect on sign-out
- [x] **W4** Fix stale `requireVerified` comment in `web/src/lib/api.ts`
- [x] Parity matrix: add a "last verified" line to plan §3

## Phase 1 — Messaging (G1–G3)
- [x] `/dashboard/messages` inbox — conversations, unread counts, car thumbnail, last message, empty state
- [x] `/dashboard/messages/[id]` thread — send, optimistic append, failure retry. **Not paginated**: `GET /messages/conversations/:id` has no limit/offset today (pre-existing on the backend, not something this pass added) — fine at current volumes, a backend change if it ever isn't
- [x] Live updates: new message, typing indicator, unread badge in header + dashboard nav (nav badge freshens via `router.refresh()` on thread mount rather than a live socket-driven counter — see `ThreadView.tsx`)
- [x] Report conversation (reason picker) and block / unblock user, matching app wording
- [x] Blocked-state UI on both sides — a block hides the thread for BOTH parties at the backend (`isBlockedBetween` is symmetric), so there's no "still viewing a thread someone else blocked" case to design for; the blocker's own session shows a banner until they navigate away
- [x] "Message seller" on car page opens/creates the thread instead of a one-shot form — links straight into `/dashboard/messages/[id]`
- [x] Notification tap-through (`notificationRouting` parity) lands on the thread — `dashboard/meta.ts`'s `conversationId` branch, highest priority, matching the app
- [x] **D3** Backend: offline-recipient email, ≤ 1 per conversation per hour, no message body, opt-out setting + tests (migration `0048`, `mailer.sendNewMessageEmail`, `routes/messages.js`)
- [x] **O4** Opt-out toggle in `/dashboard/profile` notification settings
- [x] i18n namespace `messages` in all six languages; `I18nScope` on the dashboard layout (and on `cars/layout.tsx`, for the car-page CTA copy)
- [x] Playwright: buyer messages seller → seller replies → buyer sees it live (`e2e/messaging.spec.ts`) — passed in CI on #128 and #129

## Phase 2 — Seller onboarding (G4–G6, B2, B4, B5)
Detailed plan: [`WEB-PARITY-PLAN.md` §10](WEB-PARITY-PLAN.md#10-phase-2-in-detail-seller-onboarding).

**Backend**
- [x] **B4 / P2-D1** `middleware/strip-metadata.js`: remove metadata without re-encoding (JPEG APPn/COM, PNG text/eXIf/tIME, WebP EXIF/XMP and VP8X flags); rotate at q95 only when orientation ≠ 1; fail open. Unit tests that run without Postgres, checking the pixels are identical and the metadata is gone.
- [x] Wire it into `POST /id-verification`
- [x] **P2-D2** Migration `0049`: `users.id_capture_source` (`live` | `file` | NULL). `POST /id-verification` accepts `capture_source`, and `GET /id-verification/queue` returns it.
- [x] **F4** `resolveSubdir`: `/submissions/:id` goes to `submissions/<id>`, not `id-docs`
- [x] **B2 / P2-D3** `POST /submissions/:id/reference-photos`: owner only; status `under_review`, `approved` or `scheduled`; at most 12 in total; compressed and metadata removed; URLs appended to `reference_images`
- [x] Tests: the route stores photos, refuses a stranger and refuses a 13th photo; `capture_source` is stored and validated; the queue returns it

**Website**
- [x] Upload proxy: `reference` kind (`?submission=<uuid>`, 2 photos, 10 MB each); pass `capture_source` through
- [x] **F6** Fix `submissions.schedule` to send `scheduled_date`/`scheduled_time`
- [x] `/dashboard/verify`:
  - three slots (front, back, selfie), with the app's copy
  - a file input **without** `capture`, so a phone offers camera or library like the app's sheet; plus an in-page webcam view on desktop (the only capture reported as `live`)
  - downscale only over 5 MB (P2-D5)
  - status screens for `pending` and `approved`; the upload form for `none` and `rejected`, with a generic message for `rejected` (F1)
- [x] `/sell/submit`:
  - two steps, matching the app: first make, model, year (this year back 16, as in the app), mileage, fuel, transmission, body type and colour; then asking price, two optional reference photos and notes
  - sign-in and seller-account checks (P2-D6)
- [x] `/dashboard/selling/[id]/schedule`: centres, the next 10 days, 8 AM to 4 PM, a summary, then confirm. Show the "fully booked" message as the server sends it.
- [x] Remove "use the app" from the selling dashboard ("Submit in app", "Open seller app"), `VerificationNotice` and the profile page's "Get the app"
- [x] "Book inspection" link on each submission card that has no slot yet
- [x] `onboarding` namespace in all six languages, scoped on the dashboard and `/sell` layouts

**App** (JavaScript only, so it can ship by OTA)
- [x] `captureImage` records whether the photo came from the camera or the library; `submitIdVerification` sends `capture_source`
- [x] **B2** Upload reference photos after `createSubmission`
- [x] **B5** Map the "Anything we should know?" notes to `notes`

**Admin**
- [x] ID queue: "Live camera capture" or "Chosen from files — check closely" badge next to the pending pill

**Tests**
- [x] Playwright: sign up as a seller, verify (upload three files), submit a car with a reference photo, book a slot, and see it on the selling dashboard

## Phase 3 — Account & trust (G7–G11, B1, B6–B8)
Detailed plan: [`WEB-PARITY-PLAN.md` §11](WEB-PARITY-PLAN.md#11-phase-3-in-detail-account-and-trust).

**Backend**
- [x] **F9** `GET /sellers/:id`: public profile, same eligibility as `GET /cars`, 404 otherwise, never contact details
- [x] **F9** `GET /cars?seller_id=<uuid>` filter, on the same eligibility-gated query
- [x] **F16** `contacts_count` on `/cars/seller/mine`
- [x] Tests: profile 404s for suspended, unverified or unverified-showroom sellers and never carries a phone number; the `seller_id` filter; `contacts_count`; seller-status transitions

**Website**
- [x] **G7 / P3-D1** Reopen a closed account from sign-in (403 `ACCOUNT_CLOSED` → prompt → `POST /auth/reopen`)
- [x] **G9 / P3-D2** `/sellers/[id]`: profile, trust breakdown, reviews, live listings, JSON-LD without `aggregateRating`, sitemap entries; the car page's seller card links to it
- [x] **G10 / P3-D3** Report a review
- [x] **G8 / P3-D4** Compare toggle on the car page, tray, and `/compare?ids=`
- [x] **B1 / P3-D5** Pause, make live again, and mark sold on the selling dashboard; a paused group (F15)
- [x] **G11** Per-listing analytics: views, saves, enquiries, contact requests, days live
- [x] **F17** Fix the `sellers.reviews` type
- [x] `/sell/submit` sends signed-out visitors straight to sign-in (a real 307 in middleware, not a streamed redirect)
- [x] `market` namespace in all six languages

**App** (JavaScript only)
- [x] **B1** Pause, make live again, and mark sold on `SellerDashboard` (`PATCH /cars/:id/seller-status`)
- [x] **B8** Remove the fake local "Relist at new price" and its invented notification
- [x] **B7** A real views total on the dashboard; "all time" on the analytics hero; contact requests metric
- [x] **B6** Remove the "Return Policy" row from Compare
- [x] **F9** `SellerProfile` gets member-since and live listings from the new endpoints

**Tests**
- [x] Playwright: mark sold removes the car from `/cars`; a profile lists live cars; compare renders chosen cars; reopen a closed account from sign-in

## Phase 4 — Reach & polish (G12–G14, W3)
- [ ] **O3** Referrals: implement web page or remove from app, per decision
- [x] **G13** Web Push: service worker (`web/public/sw.js`), own table `web_push_subscriptions` (migration 0059) instead of `platform` on device tokens, backend sender `lib/web-push.js` + tests, toggle and test button in Profile → Notifications, sign-out drops the subscription. **Ships off** until the VAPID keys are in the server's `.env` (human)
- [x] PWA install prompt on supported browsers (dashboard overview; Chrome/Edge/Samsung via `beforeinstallprompt`; hidden where the store app is live, so not on iPhone)
- [x] **W3** Copy sweep (25 Oct 2026): `AppCapabilities.tsx` is gone and the other listed components already point to the web flows; the `/download` page was the last offender (photo upload is not app-only, "purchase history" is a retired concept) and is fixed in all six languages
- [x] **G14** Content check (25 Oct 2026): `/how-it-works` and `/legal/guarantee` agree with the app's `BuyingGuide` and `SawaPromise` (no checkout, escrow, guarantee or fee claims). Fixed the app's valuation screen, which promised cars "sell up to 12% more and 3× faster" with no data behind it. The web has no page named `/promise`; `/legal/guarantee` is its equivalent
- [ ] Final parity audit — re-run the §3 method; every row "at parity" or listed in §7
- [ ] Update CLAUDE.md "last verified" and remove "planned" status from the plan
