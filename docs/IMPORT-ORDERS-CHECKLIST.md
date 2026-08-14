# Vehicle imports and commercial sellers

## Completed in the foundation slice

- [x] Keep imports separate from local car handovers and rental payments.
- [x] Store every monetary amount as integer RWF.
- [x] Create a controlled import-order state machine.
- [x] Generate separate initial 50% and final 50% payment milestones.
- [x] Preserve append-only customer/admin order events.
- [x] Restrict buyer reads to their own orders.
- [x] Restrict quotations, status changes and payment decisions to admins.
- [x] Record sensitive admin actions in the durable audit log.
- [x] Add an admin import pipeline with quotation and milestone controls.
- [x] Add customer import tracking to both web and mobile.
- [x] Keep public seller registration separate from commercial showroom status.
- [x] Require admins to create and pre-verify showroom accounts.
- [x] Send a single-use 48-hour password setup link instead of emailing passwords.
- [x] Prevent showroom activation links from being reused.

## Next implementation slice

- [ ] Version and electronically accept the full import agreement.
- [ ] Add secure uploads for inspection, invoice, bill of lading, customs and payment proof.
- [ ] Add buyer submission of bank references and payment proof.
- [ ] Add two-person approval for payment verification, refunds and bank-detail changes.
- [ ] Store Bank of Kigali instructions in encrypted/configured business settings.
- [ ] Add quote line items, exchange-rate provenance and capped adjustment approvals.
- [ ] Add supplier records and admin-only supplier verification.
- [ ] Add shipment identifiers, ETA history and delay alerts.
- [ ] Add arrival inspection and exception/dispute workflow.
- [ ] Add final invoice, customs release and handover checklist.
- [ ] Add milestone emails, in-app notifications and push notifications.
- [ ] Add account-invite resend/revoke controls and invitation delivery status.
- [ ] Add automated tests against PostgreSQL for every transition and permission boundary.
- [ ] Add operational analytics: conversion, cycle time, overdue stages and outstanding balances.

## Product boundary

The website and mobile app expose the same factual import status and money. Camera-first document capture and push notifications may remain mobile-enhanced, but every essential order, agreement, invoice, payment and support action must also be available on the website for accessibility and operational continuity.
