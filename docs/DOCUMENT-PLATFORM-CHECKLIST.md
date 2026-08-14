# Sawa Cars document platform checklist

Documents are generated on the backend from immutable snapshots. Issued files
are never silently overwritten, money is printed in exact RWF, private files
are streamed through authenticated routes, and every issue action is audited.

## Foundation

- [x] Immutable generated-document registry
- [x] Gap-free document numbering by type and year
- [x] Atomic private file storage
- [x] SHA-256 integrity fingerprints
- [x] Version-ready snapshots and lifecycle statuses
- [x] Authenticated inline/download streaming
- [x] Admin audit event on issue
- [ ] Document Center with search, filters and complete case ZIPs
- [ ] Email delivery and delivery history
- [ ] QR verification page with no private data leakage

## Vehicle sales

- [x] Branded 150-point inspection report PDF
- [ ] Vehicle history and document-verification PDF
- [x] Sale contract PDF (existing contract register)
- [ ] Handover confirmation
- [ ] Payment receipt
- [ ] Complete vehicle-sale document pack

## Imports

- [ ] Itemized quotation
- [ ] Import service agreement
- [ ] 50% deposit invoice and receipt
- [ ] Final balance invoice and receipt
- [ ] Payment-verification record
- [ ] Shipping-status report
- [ ] Customs checklist and final import dossier

## Rentals

- [ ] Rental quotation and agreement
- [ ] Pickup and return condition reports
- [ ] Rental payment receipt
- [ ] Deposit receipt and release confirmation

## Administration

- [ ] Revenue and transaction ledger PDF/CSV
- [ ] Outstanding balances report
- [ ] Inventory and sales performance report
- [ ] Rental utilization report
- [ ] Import pipeline report
- [ ] Inspection performance report
- [ ] Customer/showroom report
- [ ] Audit-history report

## Quality gates

- [ ] Generated content has no blank required identity or vehicle fields
- [ ] Multi-page reports repeat document identity and page numbers
- [ ] Download responses use private no-store caching
- [ ] Unauthorized callers cannot generate or download private files
- [ ] Repeated generation returns the exact same issued document
- [ ] Database, filesystem and rendering failures never expose partial files
