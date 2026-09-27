# Web parity plan: sawacars.com can do everything the app can

Status: **Phases 0–2 implemented 27 Sep 2026 (messaging, seller onboarding); Phase 3 (account & trust) next** · Drafted 27 Sep 2026 against `main` @ `c7d64b2`
O1, O2 and O4 were accepted as their recommended defaults on 27 Sep 2026 — O3 (referrals) is still open; see [§8](#8-open-decisions).

## 1. Goal

More people use sawacars.com than the mobile apps. So a signed-in user must be able to do everything on
the website that they can do in the app, with the same rules, the same data and
the same result. The website may differ in layout. It may never differ in
**capability**, and it may never differ in **policy**.

"Go to the app" is only acceptable where a browser truly can't do the job. Every
such case is listed in [§7](#7-permitted-differences) with its reason. Anything
not listed there is a bug.

## 2. Principles

1. **The backend is the single source of rules.** Seller eligibility, inspection
   gates, contact triple-gating and closure all stay server-side. The website
   renders the API's answers and never decides eligibility itself. This is
   already true, so parity is almost entirely a front-end job.
2. **Same endpoint, same payload.** A web feature calls the endpoint the app
   calls. If the web needs a new endpoint, the app gets it too, or the reason it
   doesn't is written down.
3. **The token never reaches browser JavaScript.** The web session is an
   httpOnly cookie (`web/src/lib/session.ts`). New browser features (uploads,
   realtime) go through a server-side hop or a short-lived, single-purpose
   ticket, never the long-lived JWT.
4. **Every invariant in CLAUDE.md §3 holds on the web on day one.** That includes
   direct-deal wording, the 428 terms acknowledgement, and no phone numbers in
   public payloads.
5. **Each phase ships to `main` on its own**, behind nothing. A half-built flow
   stays unlinked until it's complete, so users never find a dead end.

## 3. Current state (audited 27 Sep 2026; Phase 0 shipped 27 Sep 2026 — see §5)

Method: every screen in `src/screens/` and every API call in `src/api/` was
compared with the routes in `web/src/app/` and the calls in `web/src/lib/api.ts`.

### 3.1 Already at parity
Browse and search cars and rentals · vehicle detail, history and inspection report ·
save cars and saved searches · contact seller (the triple gate, via
`/cars/:id/contact`) · price change on own listing · rental inquiry and "my
inquiries" · showroom fleet and rental inbox · imports (catalogue, request,
agreement, payment proof) · notifications centre · valuation, finance and duty
tools · profile, contact channels, password change, account closure · six
languages · light/dark theme.

### 3.2 Gaps: app has it, website doesn't

| # | Capability | App | Web today | Backend |
|---|---|---|---|---|
| G1 | ✅ *closed 27 Sep 2026* **Read and reply to messages** (inbox and thread) | `Messages`, `Chat` | `/dashboard/messages` + `/dashboard/messages/[id]` | Ready (`routes/messages.js`) |
| G2 | ✅ *closed 27 Sep 2026* **Live chat updates** (new message, typing) | socket.io | `useSocket()` + the ticket (D2) | Ready (`src/socket.js`) |
| G3 | ✅ *closed 27 Sep 2026* **Report a conversation / block a user** | Yes | Inline in the thread's options menu | Ready (`/messages/…/report`, `/messages/users/:id/block`) |
| G4 | ✅ *closed 27 Sep 2026* **Seller ID verification** (ID front, back, selfie) | `IDVerification` | `/dashboard/verify` | Ready (`POST /id-verification`, 5 MB per file, deliberately uncompressed) |
| G5 | ✅ *closed 27 Sep 2026* **Submit a vehicle for inspection** | `CarSubmission` | `/sell/submit` | Ready (`POST /submissions`, JSON). `submissions.create` already exists in `web/src/lib/api.ts`, unused. |
| G6 | ✅ *closed 27 Sep 2026* **Book an inspection slot** | `InspectionScheduling` | `/dashboard/selling/[id]/schedule` | Ready (`PATCH /submissions/:id/schedule`). `submissions.schedule` exists, unused. |
| G7 | **Reopen a closed account** (30-day window) | Yes (`/auth/reopen`) | None | Ready |
| G8 | **Compare vehicles** | `Comparison` | None | Client-side only |
| G9 | **Public seller / showroom profile** with trust score and reviews | `SellerProfile`, `DealerProfile`, `Showroom`, `TrustScore` | None | Ready (`/reviews/seller/:id`, `/reviews/trust-score/:id`) |
| G10 | **Report a review** | Yes | None | Ready (`/reviews/:id/report`) |
| G11 | **Seller analytics** (views, saves, contacts per listing) | `SellerAnalytics` | Partial (selling page shows progress) | Ready (`/cars/seller/mine`) |
| G12 | **Referrals** ("my code" and redeem) | `Referral` | Page is a redirect stub (retired) | Ready (`/referrals/mine`, `/redeem`) |
| G13 | **Notifications while the site is closed** | Expo push | None | Expo push only; no web channel |
| G14 | **Buying guide / Sawa promise** | `BuyingGuide`, `SawaPromise` | `/how-it-works`, `/promise` | n/a. Check the content matches. |

### 3.3 Gaps on both platforms (found during the audit)

| # | Finding | Where |
|---|---|---|
| B1 | **Seller can't mark a listing sold or withdrawn** from either client. The endpoint exists and neither calls it. The app's `/cars/:id/status` is the *admin* route. | `PATCH /cars/:id/seller-status` (`routes/cars.js:1380`) |
| B2 | ✅ *fixed 27 Sep 2026* **The app's "reference photos" on submission are silently dropped.** They're collected on screen and never sent. `addSubmission` omits them, but the backend accepts `reference_images`. | `src/context/AppContext.js:1295`, `CarSubmissionScreen.js:330` |
| B3 | ✅ *fixed 27 Sep 2026* **The socket doesn't re-check the session.** A suspended or deleted user keeps a live socket until it drops, which breaks invariant 5 for realtime. | `backend/src/socket.js:7` |
| B4 | ✅ *fixed 27 Sep 2026* **ID documents keep their EXIF data**, which can include GPS location, because they're stored uncompressed on purpose. | `routes/id-verification.js`, `middleware/upload.js` |
| B5 | ✅ *fixed 27 Sep 2026* **The app's seller notes are dropped.** It sent `seller_notes`; the backend only stores `notes`. Found while planning Phase 2 (§10.1 F7). | `src/context/AppContext.js` `addSubmission` |

### 3.4 Blockers and stale content on the web

| # | Issue | Where |
|---|---|---|
| W1 | `Permissions-Policy: camera=()` blocks the camera site-wide. | `web/next.config.ts:38` |
| W2 | Server Actions refuse bodies over 1 MB by default, so they can't carry photos. | Next.js default |
| W3 | Copy tells users to use the app for things the web will do: `AppCapabilities.tsx` (which also still describes the retired 36-angle shoot), `VerificationNotice.tsx`, `dashboard/selling`, `dashboard/profile`, `cars/[id]/RequestCarForm.tsx`. | listed |
| W4 | A stale comment says `submissions.create` is "gated by requireVerified". The backend actually requires `role='seller'` and an active account, not ID approval. | `web/src/lib/api.ts:448` |
| W5 | The website has no automated tests beyond `tsc` and `next build`. | `web/package.json`, `ci.yml` |

## 4. Architecture decisions

**D1: Browser uploads go through a Next route handler, not a Server Action.**
`web/src/app/api/upload/[kind]/route.ts` reads the session cookie server-side and
streams the multipart body to the backend with the Bearer header. It enforces
the same per-kind limits as the backend (ID: 3 files × 5 MB; import proof: as
`uploadImportDocs`). This avoids the 1 MB Server Action limit (W2) and keeps the
token out of the browser. `client_max_body_size` on the `sawacars.com` nginx
vhost must be at least 25 MB, matching `api.`.

**D2: Realtime uses a short-lived socket ticket.**
A new `POST /auth/socket-ticket` (requireAuth plus live-session check) returns a
JWT with `purpose: 'socket'` and a 60-second expiry. The website fetches it
through a Server Action and passes it to `io(API, { auth: { ticket } })`.
`socket.js` accepts either a normal token (the app) or a ticket (the website),
and **both** paths run `verifyLiveSession` (fixes B3). The socket
re-authenticates on reconnect by fetching a new ticket.

**D3: "While you were away" is email first, web push later.**
When a message is written and the recipient has no connected socket, send one
email per conversation per hour at most, with no message text in it ("You have
a new message about *2016 Toyota RAV4*"). This goes through the existing
`lib/mail.js`, which already never throws. It needs no scheduler, keeping the
no-scheduler rule. Users can opt out in notification settings. Web Push (VAPID,
service worker, a `platform` column on device tokens) is phase 4. On iPhone it
only works for sites added to the home screen.

**D4: ID capture.**
On phones, use `<input type="file" accept="image/*" capture="environment">` (and
`"user"` for the selfie), which opens the camera directly. On desktop, use a
webcam capture component (`getUserMedia`), with file upload as a fallback
(**decision O2**). Images are **not recompressed** in the browser, matching the
backend's rule. They're only downscaled (long edge 3000 px, quality 0.92) when a
file exceeds 5 MB. EXIF stripping happens server-side for both clients (B4).
`Permissions-Policy` becomes `camera=(self)` only on the routes that need it.

**D5: Comparison is client-side and shared through the URL.**
`/compare?ids=a,b,c` renders from the public car endpoint, so a comparison can
be linked and indexed. The selection is kept in `localStorage`, following the
per-viewer convenience rule. There's no account requirement and no new endpoint.

**D6: Public profiles are server-rendered and indexable.**
`/sellers/[id]` and `/showrooms/[id]` show verified status, trust score,
reviews and live listings. They must **never** show phone numbers (invariant 3),
and they 404 for suspended, deleted or unverified accounts, just as listings do.

## 5. Phases

Each phase is one PR to `main`, and each is independently useful.

| Phase | Scope | Why this order |
|---|---|---|
| **0 — Foundations** ✅ *shipped 27 Sep 2026* | W1, W2 (D1), W4, W5 (Playwright set-up), the socket ticket (D2) and B3 | Unblocks everything after it; B3 is a security fix |
| **1 — Messaging** ✅ *implemented 27 Sep 2026, pending CI verification* | G1, G2, G3 and the D3 email | The biggest gap: web users can't read replies today |
| **2 — Seller onboarding** ✅ *implemented 27 Sep 2026* | G4, G5, G6, B2, B4 and B5 (see §10) | Turns web visitors into sellers without the app |
| **3 — Account and trust** | G7, G9, G10, G11, B1 and G8 | Completes the seller and buyer loops |
| **4 — Reach** | G12 (after O3), G13 Web Push, PWA install prompt, W3 copy sweep, G14 content check | Polish and re-engagement |

Rough size: phase 0 is 2–3 days; phases 1 and 2 are 4–5 days each; phase 3 is
3–4 days; phase 4 is 3 days.

## 6. Definition of done (every item)

- Same endpoint as the app. Any new endpoint has backend tests in `backend/test/`.
- Strings are in all six languages, and the route layout's `I18nScope` includes
  the namespace.
- Works at 360 px wide and on desktop, in light and dark themes, with zero axe
  violations (matching PR #126's bar).
- Loading, empty, error and "not allowed" states are designed, not blank.
- Direct-deal wording is present wherever money, contact or a deal is implied.
- No phone numbers, emails or ID images in logs, analytics or public payloads.
- A Playwright test covers the happy path, and the parity matrix (§3) is updated.
- `npm run release:check`, web `tsc` and `next build` all pass in CI.

## 7. Permitted differences

| Difference | Reason |
|---|---|
| Staff tools (`InspectionForm`, `AdminPanel`, `AdminAnalytics`) aren't on sawacars.com | Staff use admin.sawacars.com; the public site shouldn't expose staff surfaces |
| Web Push isn't available in iPhone Safari unless the site is installed to the home screen | Apple platform limit; email covers the gap |
| Haptics and the native share sheet | Browser equivalents are used where they exist (`navigator.share`) |

## 8. Open decisions

| # | Question | Recommendation | Status |
|---|---|---|---|
| O1 | Phase order: messaging first, or seller onboarding first? | Messaging first. It's a broken loop today, not a missing feature. | **Accepted 27 Sep 2026** (default) |
| O2 | May desktop users *upload* ID photos, or only take live webcam or phone-camera shots? | Allow upload, and flag uploaded (non-live) captures to reviewers so staff can apply extra care | **Accepted 27 Sep 2026** (default) |
| O3 | Referrals were deliberately retired on the web. Bring them back, or retire them in the app too? | Decide on product grounds; don't restore by default | **Still open** — no safe default; Phase 4 will not touch referrals until this is answered |
| O4 | Offline message email: on by default with opt-out, or opt-in? | On by default, with opt-out; it's transactional, not marketing | **Accepted 27 Sep 2026** (default) |

## 9. Tracking

The task list is [`docs/WEB-PARITY-TODO.md`](WEB-PARITY-TODO.md). Tick items there
in the same PR that ships them.

## 10. Phase 2 in detail: seller onboarding

Planned 27 Sep 2026, after reading the code the phase touches. Covers G4, G5, G6,
B2 and B4. The goal is that someone can become a seller on sawacars.com, prove
who they are, submit a car and book its inspection without ever installing the
app.

### 10.1 What the code showed (this changes the earlier plan)

| # | Finding | Consequence |
|---|---|---|
| F1 | **No ID rejection reason exists.** `PATCH /id-verification/:userId` takes only `{decision}`, and the app shows the same upload form for `none` and `rejected`. | The web shows a generic "try again with clearer photos" message, like the app. §4's "rejected (with reason)" is dropped; a stored reason would be a separate backend and admin change. |
| F2 | **The app lets sellers pick ID photos from their library** (`captureImage` offers "Take a photo" / "Choose from library"). Nothing records which one was used. | The live-or-file flag (O2) must be sent by **both** clients, or the admin badge would only describe website users. |
| F3 | **No route lets a seller upload a photo.** `reference_images` only accepts HTTPS URLs from somewhere else, and the only photo upload (`POST /inspections/cars/:carId/photos`) is admin-only. | A new route is needed; B2 can't be fixed in the clients alone. |
| F4 | **`resolveSubdir` in `middleware/upload.js` would put a submission upload in `id-docs`**, the private ID folder, because it has no rule for `/submissions`. | Add a `submissions/<id>` rule before the new route goes live. |
| F5 | **Photos under 600 KB skip `compressUploads`**, so they keep their EXIF data, including GPS. | Location data survives on small reference photos too, not just IDs. The B4 fix covers both. |
| F6 | **The web's unused `submissions.schedule` sends `{center, date, time}`**, but the backend reads `scheduled_date` and `scheduled_time`. | It would have failed with a 400 on first use. Fix the wrapper. |
| F7 | **The app's seller notes are dropped.** It sends `seller_notes`; the backend stores only `notes`. | New gap **B5**: the app maps its notes to `notes`, and the web sends `notes` from the start. |
| F8 | The app has no `condition` or `purpose` fields; `purpose` defaults to `sale`. | The web form matches the app: no `condition`, no `purpose`. |

### 10.2 Decisions

**P2-D1: Remove metadata without re-encoding.**
- JPEG: drop the APP1–APP15 and COM segments.
- PNG: drop the `eXIf`, `tEXt`, `iTXt`, `zTXt` and `tIME` chunks.
- WebP: drop the `EXIF` and `XMP ` chunks, and clear their flags in `VP8X`.

The pixel data is copied byte for byte. The one exception is a photo whose
orientation tag isn't 1: it's rotated with sharp and re-encoded at quality 95,
because a sideways ID is worse than a re-encode. This applies to ID documents and
reference photos, from both clients. Like `compressUploads`, it fails open: on
an error the original is kept and logged, so an upload never fails because of it.

**P2-D2: Record how the ID photos were captured.** `capture_source` is `live` or `file`:

| Client | `live` | `file` |
|---|---|---|
| Website | Frames came from the page's webcam view (`getUserMedia`) | Anything from a file input, including a phone's camera button, because the browser can't prove where it came from |
| App | "Take a photo" | "Choose from library" |

One value is stored per submission: `live` only if all three photos were live.
It goes in `users.id_capture_source` (migration 0049); `NULL` means an older
build that didn't send it. The admin ID queue shows a badge, and a `file` badge
asks reviewers to take extra care.

**P2-D3: Reference photos are attached after the submission is created.**
1. The form creates the submission (JSON, through a Server Action).
2. Photos then go through `/api/upload/reference?submission=<id>` to the new
   `POST /submissions/:id/reference-photos`. It is owner-only, stores at most 12
   photos, compresses them and removes their metadata.

If a photo upload fails, the submission is kept and the seller can retry. The
app uses the same route (B2).

**P2-D4: One booking page for both entry points.** `/dashboard/selling/[id]/schedule`
is reached straight after submitting and from the selling dashboard. It matches
the app:
- Centres from `/centers/active`, sent by name.
- The next 10 days starting tomorrow.
- Times from 8:00 AM to 4:00 PM, hourly.
- The server's "fully booked" 409 is shown as it comes.

**P2-D5: Downscale only when a file is over 5 MB.** The long edge goes to
3000 px and it's saved as JPEG at 0.92. The browser applies the orientation
(`createImageBitmap(..., {imageOrientation: 'from-image'})`), so the output is
upright and has no metadata. Smaller files are sent untouched.

**P2-D6: Who may submit.** `/sell/submit` requires sign-in (otherwise
`/signin?next=/sell/submit`) and a seller account, the same check the backend
makes. A buyer account sees why they can't, and a link to create a seller
account. There is no endpoint to switch roles, and the web doesn't invent one.

**P2-D7: Translations.** The new strings go in one new namespace, `onboarding`,
in all six languages. It is scoped on the dashboard and `/sell` layouts.

### 10.3 Order of work

1. Backend: metadata removal, the `capture_source` column and field, the
   reference-photo route with its folder rule, and tests.
2. Website: the upload proxy gets the `reference` kind and passes text fields
   through; the `submissions.schedule` wrapper is fixed.
3. Website: `/dashboard/verify`.
4. Website: `/sell/submit`, then `/dashboard/selling/[id]/schedule`.
5. Website: remove the "use the app" links from the selling dashboard, the
   verification notice and the profile page.
6. App: send `capture_source`, upload reference photos after creating a
   submission, map notes to `notes`. These are JavaScript-only changes, so an
   OTA update can ship them.
7. Admin: the capture badge in the ID queue.
8. Playwright: sign up as a seller, verify, submit, book a slot.

### 10.4 Not in this phase

- A stored ID rejection reason (F1).
- Letting a buyer switch to a seller account.
- Per-document capture flags. One flag per submission is enough for reviewers.
