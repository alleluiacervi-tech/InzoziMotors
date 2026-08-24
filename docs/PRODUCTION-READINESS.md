# Sawa Cars production readiness

This is the release gate for the verified-classifieds platform. Sawa Cars
inspects and publishes vehicles and provides communication tools. Buyers,
sellers, renters and rental providers agree and perform contracts, payments,
deposits, delivery, transfer and disputes independently. The platform has no
sale/rental checkout, escrow, payment gateway or seven-day guarantee.

## Engineering completed on the feature branch

- [x] Payment, handover, contract, transaction-dispute and guarantee write paths
  return `410 Gone`; current mobile/web clients do not expose those workflows.
- [x] A buyer must authenticate and accept the current direct-deal notice before
  seller/provider contact is disclosed or a rental inquiry is created.
- [x] Public contact requires seller consent, a usable number, an active account,
  identity approval and showroom business approval where applicable.
- [x] Sale publication requires an active verified seller, completed inspection,
  a valid gallery and a separate audited admin publication decision.
- [x] Galleries accept 1–40 images without mandatory 360-degree angle slots;
  operators are guided toward 6–10 honest, useful images.
- [x] Rental listings require an active identity- and business-verified provider
  and at least one HTTPS image. Availability requests never create bookings.
- [x] Suspended/unverified providers disappear from public sale/rental results
  while their records remain available to administrators.
- [x] Admin operations cover account correction, password-reset initiation,
  suspension/restoration, verification, listing CRUD/status/gallery, rental
  fleet/inquiries, immutable policy settings and audit history.
- [x] Mobile uses the real inspection queue, audited start/completion endpoints,
  server-weighted checklist IDs, flexible photo upload and 48-point primary
  controls. The full web admin console remains the complete operations surface.
- [x] CI checks backend syntax/SQL/API behavior, mobile Babel parsing/imports,
  production builds for web/admin, and operations-script safety.

## Release blockers owned outside source code

- [ ] Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` in
  `web/public/.well-known/assetlinks.json`, deploy the website, then run
  `npm run release:check` successfully.
- [ ] Configure local/test `DB_HOST`, `DB_NAME`, `DB_USER` and `DB_PASSWORD`,
  apply all migrations through `0019_policy_guardrails.sql`, and retain the
  passing database-backed API test output. PostgreSQL is reachable on this
  workstation, but no usable credentials are currently configured.
- [ ] Back up production, apply migrations in order, and verify `/health/ready`
  before deploying the clients that depend on the new schema.
- [ ] Rotate any previously exposed email/storage credentials and configure
  production SMTP/Resend, Cloudinary and Expo secrets outside Git.
- [ ] Verify password reset, showroom invitation and account lifecycle email
  delivery to an external mailbox.
- [ ] Create buyer, verified individual-seller, verified rental-company and admin
  reviewer accounts. Store the credentials only in App Store Connect/Play review.
- [ ] Record the Apple physical-device walkthrough and complete the device/OS
  test matrix below.
- [ ] Complete an off-site backup restore drill and retain the evidence.
- [ ] Merge this branch only after review; require one green `main` CI run before
  production deployment. Do not deploy the feature branch directly.

## End-to-end acceptance matrix

Record tester, date, build number and evidence for every row.

| Journey | Required result | Evidence |
| --- | --- | --- |
| Buyer account | Register, sign in, recover password, sign out and delete account | Recording + email + audit/log ID |
| Individual seller | Verify ID, submit vehicle, schedule inspection, manage approved contact visibility | User/submission IDs |
| Inspection to publication | Start/complete checklist, create/link listing, upload gallery, approve and publish | Inspection/car IDs + public URL |
| Direct sale contact | Accept notice, reveal opted-in phone/WhatsApp or start in-app chat; no checkout is offered | Contact event + conversation ID |
| Rental provider | Verify identity/business, add active vehicle with images, edit/retire inventory | Provider/rental IDs + audit events |
| Rental inquiry | Request future dates, provider receives lead, renter can cancel; no booking/payment row is created | Inquiry ID + database assertion |
| Suspension/revocation | Revoke access and confirm sessions end and public inventory disappears; restore deliberately | Recording + audit events |
| Admin consistency | Account/listing/rental/settings changes appear on web and mobile/public surfaces | Before/after evidence |
| UGC safety | Report/block a chat participant and confirm admin moderation access | Report/block IDs |
| Responsive/accessibility | iOS and Android small/large phones, large text, screen reader labels and all primary controls | Device matrix + notes |

## Physical-device matrix

| Device | OS | Build | Buyer | Seller | Rental | Account deletion | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<iPhone model>` | `<latest iOS>` | `<build>` | [ ] | [ ] | [ ] | [ ] | `<notes>` |
| `<Android model>` | `<supported Android>` | `<build>` | [ ] | [ ] | [ ] | [ ] | `<notes>` |
| `<older supported Android>` | `<version>` | `<build>` | [ ] | [ ] | [ ] | [ ] | `<notes>` |

## Deployment order and smoke test

1. Create and verify a database plus uploads backup.
2. Deploy the API/database migration; verify liveness, readiness and migration
   version before allowing client traffic.
3. Deploy web and admin; verify login, catalogue, legal pages and full admin CRUD.
4. Publish the mobile build to TestFlight/Play internal testing and run the
   acceptance matrix on physical devices.
5. Verify public links, password reset, direct contact, chat, rental inquiry,
   suspension and account deletion against production-like data.
6. Submit store metadata that exactly matches `docs/STORE-SUBMISSION.md`.
7. Release manually after approval and monitor readiness, 5xxs, mail, database
   capacity, storage and backup completion.

## Definition of ready

Ready means: all automated checks green on `main`, every external blocker above
closed, every acceptance row evidenced, store copy consistent with the binary,
and a recent restore drill proven. A successful build alone is not approval to
release.
