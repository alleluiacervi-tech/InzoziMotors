# Sawa Cars launch checklist

This is the release gate for the production mobile app. Run `npm run
release:check` before creating an iOS or Android store build; it intentionally
fails while store identity placeholders remain.

## Complete in the repository

- [x] Display rental prices in their actual API currency (RWF by default).
- [x] Add a preflight check for mobile-store and deep-link identity placeholders.
- [x] Reject a small set of high-risk UGC while preserving report, block and
  moderator review workflows for all other content.
- [ ] Replace development inventory, rental fleet, profiles, messages and
  claims with reviewed production content before opening the marketplace.
- [ ] Resolve and test production dependency upgrades from `npm audit`.
- [ ] Add the Play App Signing fingerprint to `assetlinks.json`, deploy both
  domain-association files, and make the preflight a required release workflow.

## Complete outside the repository

- [ ] Verify EAS/App Store/Play production signing credentials and access.
- [ ] Create App Store Connect and Google Play Console listings, including
  accurate privacy, support and review-contact information.
- [ ] Configure live environment variables and secrets (database, JWT,
  SMTP/Resend, storage, Expo and error reporting) in the deployment platform;
  never commit them to this repository. No payment-provider secret is required.
- [ ] Configure production TLS, domain DNS, database backups and a tested
  restore procedure.
- [ ] Run a complete physical-device test of signup, email reset, listings,
  flexible image upload, direct seller contact, messages, reporting/blocking,
  account deletion and rental inquiry/cancellation. Confirm that no marketplace
  checkout or payment flow is exposed.
- [ ] Complete Apple review access and Google Play testing requirements, then
  submit the final signed builds.

## Release decision

Publish only when every item above is checked, the production preflight passes,
and the live end-to-end test is recorded by the release owner.
