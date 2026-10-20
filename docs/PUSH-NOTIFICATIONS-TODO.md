# Push notifications — plan and TODO

Branch: `fix/push-delivery-check`. Started 20 Oct 2026.
Goal: every notification reaches the person whether the app is **open or
closed**, on **iOS and Android**, and on **sawacars.com** — in their language,
on the right channel, without spam.

Tick items in the PR that ships them. Web ↔ app parity applies: every
user-facing setting ships on both clients.

---

## Decisions (made 20 Oct 2026)

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | What does the daily summary cover? | **All new cars that went live in the last 24 h, leading with the ones that match the person's saved searches.** "12 new cars today · 3 match your searches." Never sent when nothing new went live. | Useful to everyone, more useful to people who saved searches; an empty summary teaches people to ignore it. |
| D2 | What time? | **18:00 Kigali.** A send missed at 18:00 (restart, deploy) catches up until **21:00**; after that the day is skipped, never sent at night. | After work is peak browsing; quiet hours start at 21:00. |
| D3 | On by default? | **Off. Explicit opt-in**, with plain consent wording ("Get one notification a day about new cars on Sawa"), a contextual ask after a first saved search or saved car, and a toggle in Settings / Profile → Notifications. | App Store guideline 4.5.4: promotional push requires explicit opt-in and an in-app way out. A summary of all new cars is promotional; a match for a search the person saved is not, so instant search matches stay on by default. |
| D4 | How is it scheduled? | **In-process sweep inside the API**, every 5 min, guarded by a Postgres advisory lock and a per-user `last_digest_on` (Kigali date). The unread-message email sweep (`lib/unread-message-email.js`) moves to the same runner. | A light query, not long-running work like `encar-sync`; no new container to build, deploy and monitor. The lock + date make a second instance or a restart unable to double-send. CLAUDE.md's "no scheduler" note is updated to say which jobs stay manual (account purge, PDFs). |

---

## Phase 0 — prerequisite (human)

- [ ] Run `npx eas credentials -p android` (production) and confirm an **FCM V1 service account key** is uploaded; upload it if not.
- [ ] Confirm the production `GOOGLE_SERVICES_JSON` is for package `com.sawacars.app`.
- [ ] Deploy the improved test button (below), then **Settings → Send a test notification** on an Android and an iPhone, app open and app closed.

## Phase 1 — delivery you can verify (code done, uncommitted)

- [x] `POST /devices/test` waits for Apple's/Google's receipt and reports `InvalidCredentials` etc. per device (`routes/devices.js`, `lib/push.js` `fetchReceipts`).
- [x] App toast shows the error code for this phone (`SettingsScreen.js`).
- [x] Foreground handler uses `shouldShowBanner` / `shouldShowList` (`src/utils/push.js`).
- [ ] Backend test for the receipt path in `/devices/test` (mocked Expo).

## Phase 2 — works with the app open as well as closed

- [ ] **Always send the message push.** Remove `skipPush: recipientOnline` in `routes/messages.js` (both send routes). Today an open sawacars.com tab, or a phone backgrounded under ~45 s, suppresses the phone's push.
- [ ] **App decides what to show while open.** `handleNotification` hides the banner only when the notification's `conversationId` is the thread on screen (AppContext's `activeConvRef`); everything else shows a banner.
- [ ] **Website does the same.** The service worker skips `showNotification` when a focused tab is on that conversation.
- [ ] **Android channels.** `messages` (high importance) and `alerts` (default) created at registration; the server sends `channelId` by type (`new_message`, rental inquiry replies → `messages`; `search_match`, `price_drop`, `daily_digest` → `alerts`; account/listing updates → `default`). The old `default` channel stays for older builds.
- [ ] **iOS badge.** Each push carries `badge` = unread notifications + unread messages; the app clears it on open and when everything is read.
- [ ] Verify on real devices: open, backgrounded, killed — iOS and Android.

## Phase 3 — in the person's language

- [ ] Migration: `users.preferred_language` (`en`, `rw`, `fr`, `sw`, … the client languages), nullable → English.
- [ ] App and web send the chosen language on sign-in and when it changes (`PATCH /auth/me` or equivalent).
- [ ] `lib/notification-copy.js`: one template per notification type per language; `notifyUser` / `notifyMany` / alerts render from it. Notification Center rows keep their stored text.
- [ ] Native-speaker review of the rw/sw strings (human).

## Phase 4 — calmer alerts

- [ ] **Search match once per car per search.** A listing that goes live → review → live again does not re-alert (`cars.js` ~1648, `lib/alerts.js`); record what was sent (`search_alert_log` or a unique index on the notification).
- [ ] **Price drop throttle.** At most one per car per 24 h, and only for a drop of **≥ 1 %**.
- [ ] **Search match delivery choice:** *instant* (default, today's behaviour) or *in the daily summary*, per saved search, on both clients.
- [ ] **Quiet hours 21:00–07:00 Kigali** for `search_match` and `price_drop` pushes: the row and the in-app bell are immediate; the push waits for 07:00 (sent by the Phase 5 runner). Messages, rentals and account notices are never held.

## Phase 5 — daily "new on Sawa" summary

- [ ] Migration: `users.alert_daily_digest BOOLEAN NOT NULL DEFAULT FALSE`, `users.last_digest_on DATE`.
- [ ] `lib/scheduler.js`: in-process runner (unref'd interval, advisory lock per job, off in `NODE_ENV=test`); started from `server.js`; jobs: unread-message email, daily digest, quiet-hours release.
- [ ] `lib/daily-digest.js`: between 18:00 and 21:00 Kigali, for opted-in users not sent today, count cars that went live in the last 24 h (and those matching their saved searches); skip when zero; one push + one notification row (`type: 'daily_digest'`); set `last_digest_on`. Batched, at most 100 per Expo request.
- [ ] `GET /cars?new_since=` (or a `new today` filter) for the summary to open onto; app screen route + web `/cars?new=today`.
- [ ] Settings toggle (app) and Profile → Notifications (web), next to the existing alert switches; consent wording per D3.
- [ ] Contextual opt-in card after the first saved search / saved car, once ever, both clients.
- [ ] Tap routing: `notificationRouting.js` (app) and `notificationTarget()` (web) know `daily_digest`.
- [ ] Tests: no double-send across two runs / two instances, skip on zero, respects opt-out, Kigali-day boundary.

## Phase 6 — rentals

- [ ] Saved searches can target rentals (category / location / price per day); a rental car that goes live matches them like a sale car.
- [ ] Rental cars appear in the daily summary as their own line ("4 new cars for hire").
- [ ] No "available" or "booked" wording (CLAUDE.md rentals rules).

## Phase 7 — finish

- [ ] Update CLAUDE.md §5 (push status, channels, digest, scheduler note) and `docs/STORE-SUBMISSION.md` if the notification disclosure changes.
- [ ] New store build for both platforms only after Phase 2 is verified on devices (channels and handler changes are JS and can also go OTA to 2.0.0 builds).
