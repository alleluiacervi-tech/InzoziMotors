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
- [ ] **D1** Confirm/raise `client_max_body_size` (≥ 25 MB) on the `sawacars.com` nginx vhost *(production change — ask first; not done)*
- [x] **W1** Route-scoped `Permissions-Policy: camera=(self)` for verification + submission routes only
- [x] **D2** Backend `POST /auth/socket-ticket` (60 s, `purpose: 'socket'`) + tests
- [x] **D2/B3** `socket.js`: accept token or ticket; run `verifyLiveSession` on both; tests for suspended/deleted/expired
- [x] **D2** Web `useSocket()` client hook: fetch ticket via Server Action, reconnect with a fresh ticket, disconnect on sign-out
- [x] **W4** Fix stale `requireVerified` comment in `web/src/lib/api.ts`
- [x] Parity matrix: add a "last verified" line to plan §3

## Phase 1 — Messaging (G1–G3)
- [ ] `/dashboard/messages` inbox — conversations, unread counts, car thumbnail, last message, empty state
- [ ] `/dashboard/messages/[id]` thread — history (paginated), send, optimistic append, failure retry
- [ ] Live updates: new message, typing indicator, unread badge in header + dashboard nav
- [ ] Report conversation (reason picker) and block / unblock user, matching app wording
- [ ] Blocked-state UI on both sides (can't send; explains why)
- [ ] "Message seller" on car page opens/creates the thread instead of a one-shot form
- [ ] Notification tap-through (`notificationRouting` parity) lands on the thread
- [ ] **D3** Backend: offline-recipient email, ≤ 1 per conversation per hour, no message body, opt-out setting + tests
- [ ] **O4** Opt-out toggle in `/dashboard/profile` notification settings
- [ ] i18n namespace `messages` in all six languages; `I18nScope` on the dashboard layout
- [ ] Playwright: buyer messages seller → seller replies → buyer sees it live

## Phase 2 — Seller onboarding (G4–G6, B2)
- [ ] **B4** Backend: strip EXIF (keep orientation) on ID uploads for both clients + test
- [ ] `/dashboard/verify` — ID front, ID back, selfie; mobile `capture`, desktop webcam (**D4**), upload fallback per **O2**
- [ ] Client downscale only when > 5 MB (long edge 3000 px, q 0.92); never recompress otherwise
- [ ] Status states: none / pending / rejected (with reason) / approved; resubmit path
- [ ] If O2 = yes: send `capture_source` so reviewers see upload vs live; show it in admin ID queue
- [ ] `/sell/submit` — vehicle form (same fields + validation as `CarSubmissionScreen`), `POST /submissions`
- [ ] **B2** Reference photos: upload via D1, send `reference_images` — **fix in the app too** (`AppContext.addSubmission`)
- [ ] Inspection slot booking — centers from `/centers/active`, `PATCH /submissions/:id/schedule`
- [ ] Replace "Submit in app" on `dashboard/selling` with the web flow
- [ ] i18n namespaces `verify`, `sell`
- [ ] Playwright: sign up as seller → verify → submit → book slot

## Phase 3 — Account & trust (G7–G11, B1)
- [ ] **G7** Reopen flow: sign-in on a closed account (within 30 days) offers reopen → `/auth/reopen`
- [ ] **B1** Seller "Mark sold / Withdraw" on own listings → `PATCH /cars/:id/seller-status` — **app too**
- [ ] **G11** Seller analytics per listing (views, saves, contacts) on `dashboard/selling`
- [ ] **G9** `/sellers/[id]` and `/showrooms/[id]` — verified badge, trust score, reviews, live listings; 404 when ineligible; no phone numbers; structured data without `aggregateRating` until real (seo.ts rule)
- [ ] **G10** Report a review
- [ ] **G8** `/compare?ids=` page + "Compare" toggle on `CarCard`, selection in `localStorage` (try/catch)
- [ ] Sitemap entries for public profiles
- [ ] Playwright: mark sold removes listing from `/cars`; compare page renders 3 cars

## Phase 4 — Reach & polish (G12–G14, W3)
- [ ] **O3** Referrals: implement web page or remove from app, per decision
- [ ] **G13** Web Push: VAPID keys (secret — human provides), service worker, `platform` on device tokens, backend sender + tests
- [ ] PWA install prompt on supported browsers
- [ ] **W3** Copy sweep: `AppCapabilities.tsx` (drop 36-angle + app-only claims), `VerificationNotice.tsx`, `dashboard/selling`, `dashboard/profile`, `RequestCarForm.tsx`, `/download` page
- [ ] **G14** Content check: `/how-it-works`, `/promise` vs app `BuyingGuide`, `SawaPromise`
- [ ] Final parity audit — re-run the §3 method; every row "at parity" or listed in §7
- [ ] Update CLAUDE.md "last verified" and remove "planned" status from the plan
