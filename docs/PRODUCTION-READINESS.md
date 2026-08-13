# Sawa production readiness

This is the release gate and operational handoff for the web, admin, mobile,
API, database, mail, payments and VPS deployment. A green build proves the code
can ship; it does not by itself prove credentials, off-site recovery, alerts or
store accounts are configured.

## Automated evidence

- [x] CI validates backend source and SQL, applies the schema, runs API tests,
  parses the Expo app, and type-checks/builds both Next.js apps.
- [x] Deploys occur only after a trusted push to `main` passes CI.
- [x] The VPS receives prebuilt images instead of resource-heavy app builds.
- [x] Cleanup is restricted to images labelled `com.sawacars.managed=true`.
  Global Docker prune is forbidden because the VPS hosts another project.
- [x] API readiness and all three public surfaces are checked after deployment.
- [x] A scheduled workflow checks all public surfaces every 15 minutes and
  tolerates two transient failures before raising a failed run.
- [x] Migration deploys take a verified database backup before schema changes.
- [x] Rollback records the previous revision and never reverses migrations blindly.
- [x] `ops/readiness-report.sh` checks services, disk, backup age and off-site
  evidence without changing the host.

## Production configuration gate

- [ ] Schedule nightly backups with `REQUIRE_UPLOADS=1 REQUIRE_OFFSITE=1`.
- [ ] Create root-readable `/etc/sawa/backup.env` with `BACKUP_REMOTE` pointing
  to storage outside the VPS; restrict its credentials to Sawa's destination.
- [ ] Run **Ops → backup-strict** once and retain the successful workflow URL.
- [ ] Run **Ops → readiness-report** and retain the successful workflow URL.
- [ ] Route GitHub Actions failure notifications to the on-call owner (or connect
  a dedicated uptime provider) so scheduled-check failures create an alert.
- [ ] Configure SMTP/IMAP and verify send, receive and reply with an external mailbox.
- [ ] Configure production payment credentials and verify signed HTTPS webhooks.
- [ ] Confirm production secrets are environment/repository secrets, never files.

## End-to-end acceptance matrix

Record tester, date and evidence for every row. Use test personal data and a
provider sandbox or the smallest reversible transaction.

| Journey | Required result | Evidence |
| --- | --- | --- |
| Seller onboarding | Register, authenticate, verify identity and recover access | Screenshot + audit event |
| Vehicle submission | Draft, upload photos, submit and schedule inspection | Submission ID + audit history |
| Inspection to listing | Inspect, approve, publish and find via public search | Car ID + public URL |
| Buyer handover | Request, approve, confirm, complete sale and calculate fee in RWF | Handover ID + receipt |
| Rental lifecycle | Search, book, pay, pick up and return; totals remain RWF | Booking/payment IDs |
| Dispute/moderation | Open, investigate and resolve with actor history | Audit-event IDs |
| Admin inbox | Receive, assign, tag, search, reply and compose externally | Message IDs + delivered email |
| Admin operations | Search, filters, bulk actions, exports and alerts at mobile/desktop widths | Screen recording |
| Currency | Forms, notifications, receipts, charts, dashboards and exports show RWF | Sample set |
| Accessibility | Keyboard navigation, focus, modal trap, labels and reduced motion | Test notes |

## Recovery drill (quarterly and before risky migrations)

1. Run `REQUIRE_UPLOADS=1 REQUIRE_OFFSITE=1 ops/backup.sh`.
2. Copy the newest dump from off-site storage to an isolated host.
3. Run `RESTORE_DB=sawa_rehearsal ops/restore.sh <dump>` against a scratch database.
4. Apply migrations, start an isolated API and run its readiness probe.
5. Compare row counts for users, cars, handovers, fees, bookings and payments.
6. Sample vehicle and identity files from the matching uploads archive.
7. Record duration, backup timestamp, row counts and corrective action.

Never rehearse into the live `sawa` database.

## Incident decision guide

- Public failure: run **status**, then restart only the failed service.
- Bad code revision: use **rollback**. Destructive schema needs a reviewed restore.
- Low disk: run **storage-report**, **list-stale**, then **cleanup-stale** or
  **prune-sawa-images**. These cannot prune the other project.
- SSH timeout: check public health, then inspect firewall/fail2ban via provider console.
- Corrupt data: stop writes, preserve logs, select a verified off-site backup and
  restore with a second reviewer.

## Definition of production-ready

CI and deployment must be green, every configuration checkbox complete, every
acceptance row evidenced, and a restore drill successful within the last quarter.
Unchecked external items are launch risks the repository cannot certify itself.
