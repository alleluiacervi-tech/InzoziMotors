# Mobile app — next release: what is done, what is yours

Written 1 Oct 2026, from the audit of the mobile app. Two branches, merged in
this order, because the second sits on top of the first.

| Branch | Ships as | Contains |
|---|---|---|
| `feature/app-update-1` | Backend + website deploy, then an **over-the-air update** to 1.0.7 installs | Everything below under "Update 1" |
| `feature/app-1.0.8` | A **new store build** (1.0.8, new runtime) | Android push config, App Links, optional Sentry |

Merging `feature/app-update-1` publishes the over-the-air update by itself
(Deploy → `mobile-update.yml`); it touches no native file. Merging
`feature/app-1.0.8` makes `mobile-build.yml` start the builds instead, because
`app.config.js` and `package.json` change — that is the intended path.

## Done — Update 1 (over the air)

- [x] A car that failed a check is no longer hidden. The public inspection
      report and the vehicle history are served for any complete, consistent
      inspection (the transparency model, invariant 1); `passed` carries the
      verdict. Before, the app told people to "check your connection".
- [x] Listings carry `inspection_passed`. **Certified / Certified+ now need a
      pass**, not just a score (app and website). A car at 149 with a failed
      brake check is "Inspected", not "Certified+".
- [x] "Found at inspection" panel on the report, app and website, with critical
      failures first.
- [x] Rental page lists what to **ask the provider** (insurance, breakdown
      help, mileage, deposit) instead of claiming it. Steps reuse the honest
      wording. Same change on the website's rental list and detail.
- [x] Five unreachable screens and the referrals client deleted.
- [x] Rental providers get a **Rental requests** screen in the app (requests
      received, mark contacted / close, call, WhatsApp, vehicle status). The
      "New rental inquiry" notification opens it; before, it opened the
      renter's own list.
- [x] Settings: **message-email switch** (same as the website), **Service fees**
      screen (same endpoint as `/tools/pricing`), and **Send a test
      notification**.
- [x] Sessions renew on launch (`POST /auth/refresh`), so 30 days run from the
      last visit.
- [x] Push permission is asked at the first message to a seller and the first
      submitted car, as well as when saving a car.
- [x] One trust score and one grade scale. The profile no longer shows 35
      invented points.
- [x] Invented numbers removed: the 14-day "category average", the "reviews
      boost your trust score" tip, "priority listing / limited visibility".
- [x] Translated (6 languages): seller submission, dashboard, ID verification,
      contact settings, rental inquiry, my inquiries, analytics, comparison,
      seller profile, trust score, import catalogue, scheduling, settings
      (update and account-closure flows), the error screen.
- [x] Import detail screen now lists the website's eight order steps; the old
      copy promised an overseas inspection with video and GPS tracking.
- [x] JavaScript crashes are reported to `POST /client-errors` (one log line,
      no user data). The push sender reads Expo receipts and logs credential
      errors.
- [x] Universal links for `/sellers/*` and the calculators (iOS, no rebuild).

## Done — 1.0.8 (store build)

- [x] `android.googleServicesFile` read from `GOOGLE_SERVICES_JSON` (EAS file
      variable) or `./google-services.json`. Without it the build still works.
- [x] Android App Links for `/sellers` and `/tools`.
- [x] Sentry wired and **inert until `EXPO_PUBLIC_SENTRY_DSN` is set**. Drop the
      "Optional native crash reporting" commit if you would rather not.
- [x] Version 1.0.8.

## Yours, in this order

1. [ ] Review and merge `feature/app-update-1`. Confirm the Deploy run is green;
       the update publishes after it. (Ask me and I will open the PR.)
2. [ ] Upload the existing Android 1.0.7 `.aab` to Play and finish the listing
       (it will receive update 1 over the air).
3. [ ] **Android push** — all of it is credentials:
   - [ ] Firebase project → add Android app `com.sawacars.apps` → download
         `google-services.json`.
   - [ ] `eas env:create --name GOOGLE_SERVICES_JSON --type file --visibility secret --value ./google-services.json --environment production`
   - [ ] Firebase → Service accounts → generate a key → `eas credentials` →
         Android → Google Service Account Key for **FCM V1**.
4. [ ] Play Console → App integrity → copy the **App signing SHA-1 and SHA-256**
       and give them to me. `assetlinks.json` already lists `com.sawacars.apps`
       with the upload key (EAS, 5 Oct 2026); I add the app signing SHA-256
       beside it, and the SHA-1 becomes the second Google Android client
       (docs/SOCIAL-SIGN-IN.md). `release:check` refuses a placeholder.
5. [ ] Sentry (optional): create a React Native project; put the DSN in
       `eas.json` → `build.production.env.EXPO_PUBLIC_SENTRY_DSN` and in the
       update workflow env; add `SENTRY_ORG`, `SENTRY_PROJECT` and a
       `SENTRY_AUTH_TOKEN` secret for readable stack traces.
6. [ ] Update the privacy policy and the Play Data Safety / App Store privacy
       forms: crash and diagnostic data (own API, and Sentry if enabled), push
       token. Say what is *not* collected: no account, no typed content.
7. [ ] Merge `feature/app-1.0.8`, wait for the EAS builds, then
       `eas submit` (iOS and Android) and press Submit for review.
8. [ ] Native review of Kinyarwanda and Swahili:
       [i18n-review-1.0.8.csv](i18n-review-1.0.8.csv) lists the 348 new or
       changed strings with English beside them. French, Korean and Chinese
       are drafts too; mark anything off and I will fix it.
9. [ ] Send one test notification from Settings on an iPhone and on an Android
       phone after the 1.0.8 build. If Android shows an error, the message says
       which credential is missing.
10. [ ] Decisions still open: retire referrals in the app (the reward was a
        commission discount; the website still has a referrals page), and
        whether to keep Sentry.

## Check on a real phone before submitting

- [ ] Android 15: with the keyboard open, are the sign-up, message and submission
      fields still visible? (Every `KeyboardAvoidingView` uses no behaviour on
      Android. I did not change it without a device; if fields are hidden, set
      `behavior="padding"` for both platforms.)
- [ ] Open a car whose inspection failed a critical check: report opens, red
      "Found at inspection" panel, badge says "Inspected".
- [ ] Rental provider account: bell → "New rental inquiry" → Rental requests.
- [ ] Switch language to Kinyarwanda and walk the seller submission once.
- [ ] Settings → Send a test notification (iPhone, then Android).

## Not done, on purpose

- **My reports (PDF) in the app.** The PDF needs a Bearer header; a plain link
  cannot send one. It needs a short-lived signed link endpoint, a security
  decision I did not want to make blind. The website has it.
- **Expo SDK 57 upgrade, splitting `AppContext`, offline catalogue, Google /
  Apple sign-in, automated tests** — 1.1, after crash reporting has shown how
  the app behaves in the field.
- **Translating vehicle terms** (Petrol, SUV, body types) and the staff-only
  admin and inspector screens. Values are sent to the server in English.
- **Backend tests were not run here** (no Postgres on this machine). CI runs
  them; `session-refresh.test.js` is new.
