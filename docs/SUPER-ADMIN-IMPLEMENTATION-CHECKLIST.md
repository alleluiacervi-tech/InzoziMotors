# Super Admin implementation checklist

This checklist is intentionally designed for one Super Admin. Multi-admin roles,
assignment and approval hierarchies are out of scope until the business adds staff.

## Phase 1 — daily operations

- [x] Aggregate every urgent workflow into one API response
- [x] Rank work as urgent, attention or routine using explicit time thresholds
- [x] Add direct links from every action to the page where it can be completed
- [x] Add a dashboard Action Center with priority filters and workload summary
- [ ] Add action counts to the navigation
- [ ] Add configurable operational thresholds

## Phase 2 — customer and showroom control

- [ ] Build a complete customer/showroom profile
- [ ] Add account suspension and reactivation
- [ ] Add session revocation
- [ ] Add showroom invitation resend and revoke
- [ ] Add private Super Admin notes and account history

## Phase 3 — import and finance operations

- [ ] Add itemized, versioned import quotations
- [ ] Add bank-statement reconciliation
- [ ] Add refund and cancellation workflows
- [ ] Add overdue balance and shipment exception alerts
- [ ] Add a consolidated RWF ledger with CSV export

## Phase 4 — communication and security

- [ ] Add inbox templates, internal notes and linked customer context
- [ ] Add Super Admin MFA and recovery codes
- [ ] Add active session and login history controls
- [ ] Require recent authentication for high-risk financial changes

## Verification gate for each phase

- [ ] Backend tests pass
- [ ] Admin production build passes
- [ ] Empty, loading and failure states are verified
- [ ] Mobile and narrow desktop layouts remain usable
- [ ] Sensitive mutations appear in the audit history
