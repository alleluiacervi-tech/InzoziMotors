# Korean exporter: shortlist, indicative costs and what to send them (decision E7)

Researched 1 Oct 2026 from public web pages. **Nothing here is a quote, and none of these companies
has been contacted or verified.** The numbers are what exporters and Rwandan import guides publish;
the real figures come from the exporter's own written cost sheet. Do not put these into
Admin → Korean catalogue → Exporter costs, or tick "Show the landed-cost estimate", until the
exporter you choose has sent a written sheet. Until then the estimate stays off, on purpose.

## What Sawa needs from an exporter

Sawa runs the import: the customer pays Sawa (quote → agreement → 50/50 bank transfer). Sawa
therefore needs a Korean partner that will, per car:

1. confirm within a day that a listing (by Encar id) is still for sale, and its final price;
2. buy it, pay the Encar dealer, inspect it if asked, and deregister it for export;
3. truck it to the port, ship it (RoRo) to Dar es Salaam or Mombasa, and insure it;
4. send the documents Rwanda needs (export certificate, bill of lading, invoice, deregistration);
5. do all of that for **one all-in price per car, valid for a stated number of days.**

## Candidates

| Company | Why it is on the list | Concerns / what to check |
|---|---|---|
| [Autowini](https://www.autowini.com), with a **Kigali agency** (Muhima–Nyabugogo, KN1 RD 40; +250 782 522 711, per a [directory listing](https://www.isokorigari.com/rwanda/kigali/autowini-rwanda-agency)) | The only one with a local presence in Rwanda. Its country guide describes RoRo to Dar es Salaam and consolidated container to Mombasa, with a local agent handling the container ([Autowini Rwanda guide](https://m.autowini.com/ad/Ruanda/local-trade-information?countryCd=C1405), found in search; the page itself would not load for me). A buyer can simulate costs to Dar es Salaam ([directory summary](https://www.autoyas.com/RW/Kigali/101100158545678/Autowini-Rwanda---Plateforme-de-trading-automobile-N.1-en-Cor%C3%A9e)) | A wholesale marketplace for traders, so it may not fit buying one car for a named customer, or taking an Encar id. Ask whether they will |
| [KAutoExport](https://kautoexport.kr/faq.html) (ORITION Co., Ltd, Incheon; help@kautoexport.kr, +82-70-8285-3733) | Says it buys from Encar for foreign buyers and handles export procedures | US$300–400 deposit that is "generally non-refundable"; advance T/T payment; no Africa information on the page; no licence shown |
| [EncarExport](https://encarexport.com/en) | Buys from the Korean market and adds "one modest, flat service margin"; shows the Korean inspection record; quotes over WhatsApp | No fee amounts, no company registration, no destinations shown |
| [Carawon](https://carawon.com/en/export-from/south-korea) | Publishes ranges for Africa: RoRo US$600–1,500, 25–35 days | A platform, not clearly the exporter of record; fees not shown |
| [SH Global Auto](https://shglobalauto.com/blog/korean-used-car-roro-shipping-guide) | Publishes the most useful freight table (below) | Not checked whether it exports to Rwanda or buys from Encar |

Used-car export is full of intermediaries and a [buyer guide warns of scams and hidden fees](https://k-usedcar.com/encar-korean-used-cars-import-guide/). Treat every
name above as unverified until it passes the checklist below.

## Indicative costs per car (public figures, US$, not quotes)

| Item | Published range | Source |
|---|---|---|
| Encar dealer fee ("Maedobi"), on top of the listed price | KRW 330,000–440,000 (about US$235–315 at 1,400) | [KAutoExport](https://kautoexport.kr/faq.html) |
| Optional pre-purchase inspection | about US$100 | [Korean Used Car export guide](https://koreanusedcars.website/en/export-guide) |
| Inland trucking to the Korean port | US$80–250 | [SH Global Auto](https://shglobalauto.com/blog/korean-used-car-roro-shipping-guide) |
| Korean port handling | US$80–150 | same |
| Documentation | US$50–80 | same |
| **RoRo freight, Mombasa** | **US$1,450–1,750**, 28–35 days | same |
| **RoRo freight, Dar es Salaam** | **US$1,500–1,800**, 30–37 days | same |
| Larger vehicles (over 1.85 m high) | 10–25% above the base rate | same |
| Marine insurance | 0.45–0.85% of insured value | same |
| Exporter's own service margin | **not published anywhere I found** | the biggest unknown |
| Port → Kigali by road | US$400–700 from Mombasa, US$500–1,000 from Dar es Salaam | [Automag.rw](https://automag.rw/2025/05/15/how-to-import-a-car-into-rwanda-2025-procedures-and-costs/) |
| Clearing agent | about US$400 | same |
| RSB inspection | about US$100–150, plus a 0.2% quality inspection fee on customs value | Automag.rw, [Automag.rw on rejections](https://automag.rw/2026/03/28/cars-rejected-rwanda-customs-how-to-avoid/) |
| Registration | RWF 75,000–560,000 by engine size | Automag.rw |
| Storage after 15 days at the port | 4% of CIF value | Automag.rw |

Other pages quote RoRo to Rwanda at US$2,500–3,000 ([ALL Transport Depot](https://alltransportdepot.com/shipping-car-to-rwanda/)); that is
probably port-to-door and from other origins, so do not mix it with the table above. Rwanda's duties
are already modelled in `lib/duty-rates.js`.

**A gap this research exposed.** `encar_cost_inputs` covers export fee, "inland transport", freight
and insurance. The Rwanda-side costs (port → Kigali trucking, clearing agent, port charges) are not
separate fields. Until they are, put them into `inland_transport_usd` when entering the sheet and
say so in its note. I can add separate fields (a small change to the validator, the admin form and
the estimate) if you prefer.

## Rwanda rules that decide which Korean cars can be sold

These come from Rwandan import guides, not from RRA or RSB directly, and two of them conflict:

- **Left-hand drive only** for permanent import. Korean cars are left-hand drive, so this is fine.
- **Euro 4 emissions** required for all imported vehicles since 18 Aug 2025 ([Automag.rw](https://automag.rw/2026/03/28/cars-rejected-rwanda-customs-how-to-avoid/)).
- **Age:** one guide says vehicles must be under 10 years old; another says there is no age limit
  beyond the emissions rule. **Ask RSB or RRA in writing.** The answer decides whether to set
  `max_age_years` in the ingest rules (Admin → Korean catalogue → "Oldest model, in years"), so
  the catalogue never shows a car that cannot be cleared.
- Paperwork that causes rejections: de-registration card, bill of lading, invoice, COMESA
  certificate of origin, import declaration, certificate of conformity.

## Due-diligence checklist before paying anyone

- [ ] Korean business registration number, checked on the Korean tax office's business status lookup
- [ ] They are the exporter of record and can show a recent export declaration for another car
- [ ] The bank account is in the company's name, in Korea (never a personal account)
- [ ] Two references from Rwandan or East African buyers who received a car
- [ ] A written cost sheet and contract (terms below)
- [ ] A **trial order of one car**, paid in the agreed instalments, before any volume
- [ ] They will send the Encar id, the Korean inspection record and the export certificate for each car

## Terms to ask for in writing

1. All-in price per car, in US$, itemised, **valid for N days** (so our quote to the customer holds).
2. Availability and price confirmed within 24 hours of an Encar id.
3. Refund of everything paid if the car cannot be secured (the US$300–400 "non-refundable deposit"
   above is the kind of term to push back on).
4. Who owns the car and bears loss in transit; insurance cover and claim process (RoRo damage is
   about 1.2% of cars, [SH Global Auto](https://shglobalauto.com/blog/korean-used-car-roro-shipping-guide)).
5. Payment terms, and how Sawa pays Korea (a US$ account and Rwanda's foreign-exchange rules need a
   check with your bank).
6. Document pack and delivery time to Dar es Salaam or Mombasa, and who books the onward truck.
7. Whether they will fix a **freight price by body type** (sedan, SUV, van), which is what the cost
   sheet in the admin needs.

## Message to send each candidate

> Hello, we are Sawa Cars in Kigali, Rwanda. We import used Korean cars for customers and want a
> long-term export partner. For each car we will send you an Encar listing id.
>
> Please send, in writing: (1) your all-in price per car to Dar es Salaam and to Mombasa, itemised
> (your service fee, Encar dealer fee, inland transport, deregistration and documents, RoRo freight
> for a sedan, an SUV and a van, insurance); (2) how many days that price is valid; (3) how quickly
> you confirm a car is still for sale; (4) what is refunded if you cannot buy it; (5) your Korean
> business registration number and bank details in the company's name; (6) two references from
> East African buyers; (7) your payment terms. We would start with one trial car.

## Next steps

1. Send the message above to Autowini's Kigali agency, KAutoExport and EncarExport; add one or two
   more from your own contacts (Rwandan dealers who already import from Korea are the best source).
2. Compare the replies on the all-in price, the validity period, the refund terms and the checklist.
3. Order one trial car through the chosen exporter.
4. Enter the agreed sheet in Admin → Korean catalogue → Exporter costs, set "Costs reviewed on" to
   that day, tick "Show the landed-cost estimate", and keep the sheet and contract on file.
5. Ask RSB or RRA about the age rule and set `max_age_years` accordingly.
