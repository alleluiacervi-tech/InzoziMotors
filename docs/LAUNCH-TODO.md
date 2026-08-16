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
- [ ] Add the final store identifiers to `eas.json` and both domain-association
  files, then enable the preflight as a required release workflow.

## Complete outside the repository

- [ ] Initialise the EAS project and provide production build credentials.
- [ ] Create App Store Connect and Google Play Console listings, including
  accurate privacy, support and review-contact information.
- [ ] Configure live environment variables and secrets (database, JWT,
  SMTP, storage, Sentry, Pesapal) in the deployment platform; never commit
  them to this repository.
- [ ] Configure production TLS, domain DNS, database backups and a tested
  restore procedure.
- [ ] Run a complete physical-device test of signup, email reset, listings,
  image upload, messages, reporting/blocking, account deletion and rental
  payment/cancellation.
- [ ] Complete Apple review access and Google Play testing requirements, then
  submit the final signed builds.

## Release decision

Publish only when every item above is checked, the production preflight passes,
and the live end-to-end test is recorded by the release owner.
