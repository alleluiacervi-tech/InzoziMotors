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
- [ ] Consolidate inspection, paperwork and availability into a decision summary.

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
