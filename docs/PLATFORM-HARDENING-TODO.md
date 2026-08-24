# Platform hardening backlog

This is the engineering backlog for turning Sawa from a launch-ready product
into an operationally mature marketplace. It is deliberately ordered by
customer/data risk, not by how visible the work is in the interface.

## P0 — release blockers and data protection

- [ ] Configure credentials, run migrations through `0019_policy_guardrails.sql`
  and execute the database-backed API workflow against local PostgreSQL 16.
- [x] Ensure admin suspension, restoration and password-reset initiation revoke
  active sessions and leave an audit trail.
- [x] Remove the fixed 360-degree photo requirement; accept a bounded, managed
  listing gallery instead.
- [x] Store generated document paths in portable POSIX form so Windows testing
  and Linux production use the same database values.
- [x] Bound API HTTP headers, requests and idle keep-alives to resist slow
  connections exhausting Node workers.
- [ ] Restore GitHub Actions billing/spending capacity and require a green CI
  run before deployment.
- [ ] Replace the Play App Signing fingerprint placeholder in
  `web/public/.well-known/assetlinks.json` and run `npm run release:check`.
- [ ] Configure transactional SMTP and verify reset, invitation, and account
  lifecycle emails externally.
- [ ] Rotate the previously exposed email/storage credentials at their
  providers; removing them from templates does not invalidate old keys.
- [ ] Complete and evidence an off-site backup restore drill.

## P1 — reliability and operations

- [ ] Send structured API logs to a retained, searchable log service and alert
  on readiness failures, sustained 5xxs, inquiry/contact failures, and backup
  failures.
- [ ] Add an error-reporting provider through `setErrorReporter()` with source
  maps and release versions for API, web, admin, and mobile.
- [ ] Add a database dashboard: connection pool saturation, slow queries,
  locks, replication/backup age, disk capacity, and migration version.
- [ ] Make rate-limit state shared (Redis or equivalent) before horizontally
  scaling the API; the current in-memory limit is correct for one process only.
- [ ] Define retention and deletion jobs for uploads, KYC documents, audit
  records, backups, and account-deletion data.
- [ ] Add idempotency keys to contact disclosures, rental inquiries and other
  high-value create operations that can be retried by a client or proxy.
- [ ] Introduce load testing for browsing, search, messaging, inquiries and
  photo uploads with a documented capacity target.

## P1 — product consistency

- [ ] Replace all demo inventory/content with reviewed production data and
  prohibit demo seeding in every release environment.
- [x] Enforce one seller/publication state model across account, identity,
  business verification, inspection, gallery, approval and suspension.
- [ ] Add admin settings for permitted business-controlled values (inspection
  centres, contact/legal links and feature flags) with audit history. Direct-deal,
  no-payment, no-guarantee and inspection-required rails remain immutable.
- [ ] Make admin user editing a designed form/dialog rather than a browser
  prompt, with field validation and an activity preview.
- [ ] Record a physical-device acceptance run for buyer, seller, rental inquiry,
  moderation, account deletion and recovery flows.

## P2 — scale and maintainability

- [ ] Extract API contracts into an OpenAPI schema and generate typed clients
  for web/admin/mobile; this removes duplicated assumptions between surfaces.
- [ ] Adopt a monorepo workspace strategy or shared package for business rules
  once Expo/Metro compatibility is planned and tested.
- [ ] Add contract, accessibility and visual-regression tests for the highest
  traffic web/admin/mobile journeys.
- [ ] Add pagination/cursor standards, query budgets, and indexes based on real
  production query plans before data volume makes them urgent.
- [ ] Establish SLOs: availability, API latency, error rate, contact/inquiry
  delivery time, support-response time, and recovery-time objective.

## Definition of done

A backlog item is complete only when its code/configuration is reviewed, its
failure mode is tested, its operational owner is known, and its evidence is
linked from `PRODUCTION-READINESS.md` or the release record.
