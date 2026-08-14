# Customer web design implementation checklist

This checklist converts the live design audit into shippable work. It is
limited to journeys the product already supports: buying, rentals, selling,
valuation, finance/import tools, accounts and Sawa centers.

## Foundation and trust

- [x] Correct legacy demo sale and rental amounts before visual presentation.
- [x] Compact seven-digit RWF values (`28.5M RWF`) while keeping exact values
  available for legal, payment and assistive contexts.
- [x] Establish Buy, Rent, Sell and Car tools as the homepage intent model.
- [x] Expose existing car tools in primary navigation.
- [ ] Replace preview/demo inventory and manufacturer imagery with real stock.
- [ ] Publish completed inspection/document evidence before claiming certification.
- [ ] Remove app-store promotion until real store listings are live.

## Homepage

- [x] Replace the single-purpose headline with a complete mobility proposition.
- [x] Add a compact intent switcher linking only to working journeys.
- [ ] Add truthful live marketplace signals once the API exposes them.
- [ ] Replace generic imagery with Sawa center, inspection and handover photography.

## Buying

- [x] Keep search and budget discovery above the fold.
- [x] Make large prices scannable and expose exact values on hover.
- [ ] Add compare only after comparison state/API behavior exists.
- [ ] Add price alerts only after notification preferences are implemented.
- [x] Consolidate inspection, paperwork, seller identity and availability into a decision summary.
- [x] Keep the primary buying action reachable on mobile without duplicating the request form.
- [x] Add a route-shaped loading experience for vehicle details.
- [x] Make vehicle galleries operable with arrow keys as well as pointer controls.

## Rentals

- [x] Correct daily, weekly and deposit amounts at the source.
- [ ] Make date and pickup selection the first interaction using the existing
  booking inputs, without inventing unavailable inventory behavior.
- [ ] Keep an accessible quote summary visible through booking.

## Selling and tools

- [x] Keep valuation as the primary seller action with no account requirement.
- [ ] Tighten long-form seller copy through progressive disclosure.
- [ ] Present comparable evidence, fees and next steps in one valuation result.
- [ ] Unify valuation, finance and import duty under one tools visual grammar.

## Quality gate

- [ ] Validate 390 px, 768 px, 1024 px and 1440 px layouts.
- [ ] Verify keyboard navigation, focus order, reduced motion and contrast.
- [ ] Verify metadata uses exact RWF amounts where abbreviated values are unclear.
- [ ] Run production build and inspect all five public journeys live.

## World-class consistency programme

### Vehicle detail and buying confidence

- [x] Put price, availability and the primary action immediately after the gallery on mobile.
- [x] Separate verified evidence from unavailable evidence; never imply that an unchecked item passed.
- [x] Present inspection, paperwork, seller and guarantee signals in one scan-friendly summary.
- [x] Keep full inspection and document evidence available below the summary.
- [ ] Validate the complete request journey against real production inventory.

### Marketplace discovery

- [x] Use shareable, indexable filter URLs and truthful result counts.
- [x] Keep active filters visible and individually removable.
- [x] Provide grid loading skeletons and a distinct API-unavailable state.
- [ ] Add comparison only when persistent comparison behavior exists.
- [ ] Add saved price alerts only when notification preferences exist.

### Rentals

- [x] Present daily, weekly, deposit and minimum-stay costs without conversion ambiguity.
- [x] Show real booked ranges and truthful availability.
- [ ] Move existing date selection into the first decision panel.
- [ ] Keep the calculated quote visible from date selection through booking handoff.

### Selling and tools

- [x] Make valuation the seller-page hero and require no account.
- [x] Share the same valuation component between the seller journey and tools hub.
- [ ] Consolidate valuation evidence, fees and next steps into one result state.
- [ ] Standardize tool results around one evidence-and-next-action layout.

### Responsive, accessibility and performance

- [x] Provide a global visible focus treatment and reduced-motion behavior.
- [x] Keep touch targets at least 40–44px on primary controls.
- [x] Prioritize only likely LCP imagery and defer non-critical listing photos.
- [ ] Run and record visual QA at 390, 768, 1024 and 1440 pixels.
- [ ] Run keyboard-only and screen-reader QA on Buy, Rent, Sell and Tools.
- [ ] Measure production Core Web Vitals and fix any failing route.
