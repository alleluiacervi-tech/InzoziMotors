# Store submission pack — Data Safety, App Privacy, rating, listing copy

Pre-written answers for the store console forms, derived from what the code
actually does (verified in the pre-submission audit) and from the privacy
policy at https://sawacars.com/legal/privacy. Copy these in; don't guess in
the console.

Ground truth the forms rest on:

- The app collects: name, email, phone (account); password (bcrypt hash);
  national-ID photos + selfie (sellers only, KYC); vehicle submissions;
  saved cars and searches; messages; reviews; purchase/handover requests;
  Expo push token (device identifier); basic technical logs.
- Everything is first-party: one backend (api.sawacars.com), no analytics
  SDK, no ads SDK, no third-party tracking of any kind. Cross-app tracking
  does not exist in this app → **Apple's ATT prompt is NOT required**.
- All transport is HTTPS (enforced at boot in a release build).
- Account deletion is in-app (Settings → Danger zone) and documented at
  https://sawacars.com/account/delete.
- There is **no payment in the app**: cars are physical goods paid for in
  person at the handover center. No in-app purchases, no subscriptions.

---

## 1. Google Play — Data Safety form

**Does your app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by your app encrypted in transit?** Yes.

**Do you provide a way for users to request that their data is deleted?** Yes
→ deletion URL: `https://sawacars.com/account/delete`

Data types (everything is **Collected**, nothing is **Shared**; nothing is
processed ephemerally; everything is **required** unless marked optional):

| Category | Type | Purpose | Notes |
|---|---|---|---|
| Personal info | Name | App functionality, Account management | |
| Personal info | Email address | App functionality, Account management | |
| Personal info | Phone number | App functionality, Account management | contact for handover |
| Personal info | Other info | App functionality | national-ID details, **optional** (sellers only) |
| Photos and videos | Photos | App functionality | **optional**: seller ID photos + selfie, vehicle photos |
| Messages | Other in-app messages | App functionality | buyer↔seller chat |
| App activity | Other user-generated content | App functionality | reviews, saved searches, car submissions |
| App info and performance | Crash logs | Analytics | server request logs only; no crash SDK |
| Device or other IDs | Device or other IDs | App functionality | Expo push token, **optional** (only if push granted) |

Answer **No** to: location, financial info, health, contacts, calendar,
audio, files/docs, browsing history, installed apps.

**Photo and Video Permissions declaration**: not required — the app declares
no `READ_MEDIA_*` permission (it uses the Android system photo picker; the
legacy storage permissions are scoped to Android ≤ 12 by the OS itself).

## 2. Apple — App Privacy (nutrition label)

**Data used to track you: NONE.** (No tracking, no ATT prompt.)

**Data linked to you** (all "App Functionality" unless noted):

- Contact Info → Name, Email Address, Phone Number
- User Content → Photos or Videos (seller KYC + vehicle photos), Emails or
  Text Messages (in-app chat), Other User Content (reviews, submissions,
  saved searches)
- Identifiers → User ID, Device ID (push token)
- Sensitive Info → **only if the reviewer asks**: government-ID photos are
  collected from sellers for identity verification; they are admin-visible
  only and deleted with the account

**Data not linked to you:** none claimed (server logs are keyed by request,
but conservatively declare everything as linked — the account owns it).

## 3. Age rating

- **Google Play (IARC questionnaire):** no violence, no sexual content, no
  profanity, no drugs, no gambling, no scary content. **Users can interact**
  (chat) → yes. **Shares location** → no. **Digital purchases** → no.
  Expected outcome: *Everyone / PEGI 3* with the "Users Interact" notice.
- **Apple:** all content questionnaire answers "None"; unrestricted web
  access → No; gambling → No. Expected outcome: **4+**. UGC is moderated
  (report + block + takedown are in-app, which is what guideline 1.2 asks).

## 4. App Review notes (paste into both consoles)

> Sawa Cars is a certified used-car marketplace for Rwanda. Only our staff
> can publish listings, after physically inspecting each car (150-point
> report attached to every listing). Buyers browse free; a "purchase
> request" reserves a car — payment happens in person at our handover
> center, so the app contains no payment flow (physical goods, offline
> settlement).
>
> Test accounts (all flows): BUYER — email: `<fill in>` password: `<fill in>`;
> SELLER (ID-verified) — email: `<fill in>` password: `<fill in>`.
>
> The binary contains a staff-only operations screen (Team Portal) gated on
> an admin server role; the test accounts above cannot reach it. Happy to
> provide an admin demo account on request.
>
> UGC moderation: every chat and review can be reported in-app, users can be
> blocked, and our operations dashboard has takedown queues for both.

## 5. Listing copy — Google Play

- **Title (max 30):** `Sawa Cars: Certified Used Cars`
- **Short description (max 80):**
  `150-point inspected cars, verified sellers, 7-day guarantee. Kigali, Rwanda.`
- **Full description:**

> **Every car inspected. Every seller verified.**
>
> Sawa Cars is Rwanda's certified used-car marketplace. Unlike classifieds,
> nobody can post a listing here: our own team inspects every car on 150
> points, photographs it from 36 standard angles, and publishes the full
> report — flags included — with the listing.
>
> **Buy with confidence**
> • Browse certified cars with full inspection reports
> • Verified history: ownership, mileage and RRA duty status
> • Honest market pricing based on real comparables
> • 7-day drive-it guarantee on every handover at a Sawa center
> • Buyers pay nothing — every fee on the platform is the seller's
>
> **Sell without the hassle**
> • Submit your car online — no photos needed
> • We inspect, shoot and publish it for you
> • Track every step from submission to handover
> • Get paid in person at our center, safely
>
> **Also on Sawa Cars**
> • Rent inspected cars with documented condition photos
> • Import duty calculator for the true landed cost
> • Financing estimates from Kigali banks
>
> Payment happens in person at our handover centers in Kigali — never in
> the app. Questions? contact@sawacars.com · +250 788 308 611

## 6. Listing copy — App Store

- **Name (max 30):** `Sawa Cars: Certified Used Cars`
- **Subtitle (max 30):** `Inspected. Verified. Yours.`
- **Keywords (max 100 chars):**
  `used cars,rwanda,kigali,buy car,sell car,car rental,toyota,rav4,certified,inspection,marketplace`
- **Promotional text (max 170):**
  `Every car on Sawa passed the same 150-point inspection — there is no uninspected tier. Browse certified cars in Kigali with full reports and a 7-day guarantee.`
- **Description:** reuse the Play full description (drop the bullet-point
  `•` glyphs if the formatting looks off in preview).

## 7. Screenshot shot list (when the preview build exists)

Required sizes: Play — phone, min 2, up to 8 (16:9–9:16, ≥1080 px);
Apple — 6.9″ (1320×2868) and 6.5″ (1242×2688). No iPad set (supportsTablet
is false).

Suggested order (same story on both stores):
1. Home feed with certified listings — "Every car inspected"
2. A listing with the inspection report open — "150 points, published in full"
3. Vehicle history card — "Verified history, never guessed"
4. Chat with a seller — "Talk directly, safely"
5. Purchase request confirmation — "Reserve it, pay at handover"
6. Seller submission flow — "Sell it without the hassle"

## 8. What must exist before pressing Submit (cross-reference)

- [ ] EAS project created (`eas init`) — blocks any build
- [ ] `google-services.json` + FCM V1 key uploaded — Android push
- [ ] ASC app record + real `ascAppId` in eas.json — iOS submit
- [ ] Real inventory live in production — the reviewer must not meet an
      empty marketplace
- [ ] Test accounts created and pasted into the review notes above
- [ ] Privacy policy "Draft" banner resolved (legal review or removal)
- [ ] After first AAB: Play App Signing SHA-256 → `assetlinks.json`;
      Apple Team ID → `apple-app-site-association`
