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

## Status, 20 Oct 2026

Code for phases 1–6 is written on `fix/push-delivery-check`. **How it was checked:** the unit
tests run for real here; the database tests (`alerts-and-digest`, `rental-alerts`, and the
existing suites that touch these paths) were run against an in-process Postgres (PGlite),
because this machine has no Postgres. CI runs them on real Postgres. Not provable without two
real connections: the "second server cannot take a running job" test. **Not yet checked on a
real phone or browser: everything under "Verify on real devices".**

## Phase 0 — prerequisite (human)

- [x] FCM V1 service-account key uploaded to EAS for `com.sawacars.app` (20 Oct 2026). The first key pasted into a chat was replaced; delete the exposed key `cdf0b62fb5…` in Google Cloud → IAM → Service Accounts → Keys.
- [x] iOS: APNs push key present on EAS for `com.sawacars.app`, team `5Z2LA9U639` (confirmed 20 Oct 2026). **iOS still reported not delivering: cause unknown until the improved test button is deployed** and shows Apple's receipt.
- [ ] Confirm the production `GOOGLE_SERVICES_JSON` is for package `com.sawacars.app` (Firebase → Project settings → Your apps), and that Android build 26 was made after it was added; otherwise a new Android build is needed.
- [ ] Deploy (merge → CI → deploy), then **Settings → Send a test notification** on an Android and an iPhone, app open and app closed.

## Phase 1 — delivery you can verify

- [x] `POST /devices/test` waits for Apple's/Google's receipt and reports `InvalidCredentials` etc. per device (`routes/devices.js`, `lib/push.js` `fetchReceipts`).
- [x] App toast shows the error code for this phone (`SettingsScreen.js`).
- [x] Foreground handler uses `shouldShowBanner` / `shouldShowList` (`src/utils/push.js`).
- [x] Tests: receipt parsing and the test endpoint (`push-delivery.test.js`, `alerts-and-digest.test.js`).

## Phase 2 — works with the app open as well as closed

- [x] **Always send the message push** (`skipPush: recipientOnline` removed from both send routes).
- [x] **App decides what to show while open** (`isForCurrentThread` in `src/utils/push.js`, fed by AppContext's active thread).
- [x] **Website does the same** (`web/public/sw.js` skips only a message for the focused, visible thread).
- [x] **Android channels** `messages`, `alerts`, `default` (created in `src/utils/push.js`, chosen by `channelForType` in `lib/notify.js`). JS-only, so OTA to 2.0.0 builds.
- [x] **iOS badge**: server sets it per device (`unreadCounts`); the app keeps it true and clears it at sign-out.
- [ ] **Verify on real devices:** open, backgrounded, killed; iOS and Android; and the website with a tab open and closed.

## Phase 3 — in the person's language

- [x] Migration 0063 `users.preferred_language` (en, rw, fr, sw, ko, zh); `PATCH /auth/me` validates it.
- [x] App sends it at sign-in and on change; the website sends it from the dashboard layout, **only when the visitor actually chose a language** (cookie present).
- [x] `lib/notification-copy.js`: messages, search matches, price drops, rental matches, daily summary. Other notification types keep their stored English text until added there.
- [ ] **Native-speaker review of the rw/sw strings** (human). ko/zh also worth a read.

## Phase 4 — calmer alerts (migration 0064)

- [x] Search match once per car per search (`search_alert_log`).
- [x] Price drop: ≥ 1 %, at most once per car per 24 h (`price_alert_log`).
- [x] Per saved search: `instant` or `daily` (`saved_searches.alert_mode`), switchable on both clients; choosing daily switches the account's summary on and says so.
- [x] Quiet hours 21:00–07:00 Kigali hold search-match and price-drop pushes (`notifications.push_after`); released by the runner. Messages, rentals and account notices are never held.

## Phase 5 — daily "new on Sawa" summary

- [x] `users.alert_daily_digest` (default FALSE) and `last_digest_on`.
- [x] `lib/scheduler.js` (advisory lock per job, off in tests) runs: held pushes, new rentals, daily summary, unread-message email.
- [x] `lib/daily-digest.js`: 18:00–21:00 Kigali, opted-in only, once per Kigali day (claimed before sending), skipped on an empty day, counts only publicly visible cars (`publiclyVisibleSql`, shared with the catalogue list).
- [x] `GET /cars?new=today`; app "New today" chip; web `/cars?new=today` (filter + chip, kept when other filters change).
- [x] Switch: app Settings, website Profile → Notifications.
- [x] Opt-in ask, once ever: **after the first saved search** (app alert; website card on Saved). *Deviation from the plan:* not also after saving a car, so it never stacks on the OS permission dialog that moment can show.
- [x] Tap routing: `notificationRouting.js` (app), `notificationTarget()` (web) know `daily_digest`.
- [x] Tests: window, opt-in, once per day, empty day, language, visibility.

## Phase 6 — rentals (migration 0065)

- [x] Saved searches with `listingType: 'rental'` (category, make, model, location, max daily rate, keyword). The runner finds newly public rental cars (same predicate as the catalogue) and stamps `first_listed_at` once.
- [x] A rental search never matches a car for sale, and a sale search never matches a rental.
- [x] "For hire: N" is its own line in the daily summary.
- [x] Wording says "listed for hire"; a test fails if it says "available" or "booked".
- [x] Clients: app rent mode can save a keyword search; the website `/rentals` can save "tell me when a new {category} for hire is listed". Tapping opens the car for hire.
- Known limit: a rental car created before migration 0065 that is still waiting for its first Rental Check is never announced (listed in the migration's comment).

## Phase 7 — finish

- [x] CLAUDE.md §5 (push status, channels, language, calm alerts, summary, rentals, the runner) and the "no scheduler" notes.
- [ ] `docs/STORE-SUBMISSION.md`: check the notification disclosure still reads true (the daily summary is opt-in).
- [x] The notification work shipped over the air to 2.0.0 apps on 20 Oct 2026; nothing in it needs a native change.
- [x] Store builds: Apple had already approved 2.0.0, which closes it to new builds (build 88 was refused with 90062/90186), so the next store build is **2.0.1**. That version number also moves the over-the-air line, so 2.0.0 installs stop getting updates. After the 2.0.1 builds are out, run "Mobile Over-The-Air Update" once from the Actions tab with **allow_native_changes** ticked, or every later commit is declined.
- [ ] Install the 2.0.1 iOS build from TestFlight and run Settings -> Send a test notification. The message now names the reason when this phone is not registered (permission-not-asked, permission-denied, token-error, sync-failed) or the Apple/Expo error code when it is.
