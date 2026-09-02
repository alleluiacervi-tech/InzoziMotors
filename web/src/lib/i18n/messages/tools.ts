// Message section: tools. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
//
// Covers the three public calculators (finance, import duty, valuation), the
// tools hub, and the strings inside the shared calculator components. Money is
// never localized here — amounts and the "RWF" unit are formatted in code from
// canonical whole-franc figures. Brand names, "WhatsApp", place names, "CIF",
// "VAT", "RRA", "EAC" and code identifiers stay as they are.
import type { Locale } from '../config'

const en = {
  hub: {
    metaTitle: 'Free car valuation, finance and import-duty tools for Rwanda',
    metaDescription:
      'Free calculators for anyone buying, selling or importing a car in Rwanda: a market valuation from real Sawa Cars sales, the full RRA import duty breakdown, and a monthly finance estimate.',
    ogTitle: 'Free car tools · {{site}}',
    ogDescription:
      'Valuation, RRA import duty and finance calculators for the Rwandan market. No account needed.',
    eyebrow: 'Tools',
    title: 'Work out the numbers before you commit',
    lede: 'Three calculators built for the Rwandan market. No account, no phone number, no follow-up call — they are here because a buyer or seller who understands the numbers makes a better decision.',
    open: 'Open',
    valuationMeta: 'For sellers',
    valuationTitle: 'Free valuation',
    valuationBody:
      'What your car is worth today, priced against cars actually listed and sold on Sawa Cars. If there are not enough comparable cars, we say so rather than guess.',
    dutyMeta: 'For importers',
    dutyTitle: 'Import duty calculator',
    dutyBody:
      'The full RRA breakdown on an imported vehicle — CIF, customs, excise by engine size, VAT and the infrastructure levy — entirely in RWF.',
    financeMeta: 'For buyers',
    financeTitle: 'Finance calculator',
    financeBody:
      'A monthly repayment from a car price, or the car price your monthly budget supports. Deposit, term and total interest included.',
    pricingMeta: 'What we charge',
    pricingTitle: 'Pricing',
    pricingBody:
      'What Sawa Cars actually charges: a walk-in inspection, a resold report, a rental listing subscription. Browsing and messaging sellers stays free.',
  },

  financePage: {
    metaTitle: 'Car finance calculator',
    metaDescription:
      'Estimate the monthly repayment on a car loan in Kigali, or work backwards from what you can afford each month. Deposit, term and total interest, all in RWF.',
    ogTitle: 'Car finance calculator',
    ogDescription:
      'Monthly repayment, deposit and total interest on a car loan in Kigali — or the car price your monthly budget supports.',
    heroEyebrow: 'Free tool',
    heroTitle: 'Car finance calculator',
    heroLede:
      'Two ways round the same question. Start from a car you have found and see the monthly payment, or start from what you can pay each month and see which cars that reaches.',
    estimateTitle: 'Estimate a repayment',
    estimateDescription:
      'Calculated at {{rate}}% a year — a representative rate for car lending in Kigali, and the same rate behind the monthly figure on every listing card.',
    beforeEyebrow: 'Before you take it to a bank',
    beforeTitle: 'Three things that will change this number',
    beforeDescription:
      'Sawa Cars does not lend and takes no commission from any lender. This tool exists so you walk into the bank knowing roughly what to expect.',
    rateTitle: 'Your rate is personal',
    rateBody:
      '{{rate}}% a year is a market reference point, not a quote. Banks price on your income, your employment and your history with them, and the rate they offer may sit either side of it.',
    feesTitle: 'Fees are not in here',
    feesBody:
      'Arrangement fees, valuation fees and the comprehensive insurance most lenders require are charged separately. They usually add to the monthly figure rather than the price.',
    termTitle: 'A longer term costs more',
    termBody:
      'Stretching the same loan over more months lowers the payment and raises the total interest. Compare the "total you pay" line, not just the monthly one.',
    closeTitle: 'Finance is arranged outside Sawa Cars',
    closeBody:
      'This calculator is informational. Confirm any loan directly with the bank and agree the payment recipient, ownership transfer, delivery and written sale terms directly with the seller. Sawa Cars does not receive the funds or guarantee the transaction.',
    browse: 'Browse certified cars',
    howBuying: 'How buying works',
  },

  financeCalc: {
    yourNumbers: 'Your numbers',
    startFrom: 'Start from',
    fromPrice: 'From a price',
    fromBudget: 'From a budget',
    months: '{{months}} mo',
    standard: 'standard',
    repaymentTerm: 'Repayment term',
    carPrice: 'Car price',
    carPriceHint: 'The asking price on the listing.',
    monthlyBudget: 'Monthly budget',
    monthlyBudgetHint: 'What you can comfortably pay each month.',
    deposit: 'Deposit',
    depositHint: 'Banks in Kigali typically want {{pct}}% down. Up to {{max}}%.',
    estimatedRepayment: 'Estimated repayment',
    whatYouCanAfford: 'What you can afford',
    placeholderPrice:
      'Enter a car price to see the monthly payment, the deposit and the total cost of the loan.',
    placeholderBudget: 'Enter what you can pay each month to see the car price it supports.',
    overMonths: 'Over {{months}} months at {{rate}}% a year',
    perMonth: '{{amount}}/mo',
    standardNote:
      'At the standard {{deposit}}% over {{months}} months it would be {{amount}}/mo — the figure shown on listing cards.',
    depositRow: 'Deposit',
    depositRowHint: '{{pct}}% of the price, paid at the center',
    amountFinanced: 'Amount financed',
    interestRow: 'Interest over the term',
    interestHint: 'At the representative rate below',
    totalYouPay: 'Total you pay',
    totalHint: 'Deposit plus every repayment',
    browseUpTo: 'Browse certified cars up to {{amount}}',
    payingMonth: 'Paying {{amount}} a month for {{months}} months',
    upTo: 'Up to {{amount}}',
    budgetNote: 'Assumes a {{deposit}}% deposit at {{rate}}% a year.',
    depositNeeded: 'Deposit you would need',
    depositNeededHint: '{{pct}}% of the car price',
    liveResultPrice: 'Estimated {{amount}} a month over {{months}} months.',
    liveResultBudget: 'A budget of {{amount}} a month supports a car up to {{max}}.',
    disclaimer:
      'Sawa Cars does not lend and does not arrange finance. {{rate}}% a year is a representative Kigali market rate — your bank sets its own based on your profile, and usually adds arrangement fees and required insurance on top. Treat this as a starting point for that conversation.',
  },

  dutyPage: {
    metaTitle: 'Rwanda import duty calculator',
    metaDescription:
      'Estimate RRA import duty on a vehicle brought into Rwanda: CIF value, customs duty, excise by engine size, VAT and the infrastructure levy — all in RWF.',
    ogTitle: 'Rwanda import duty calculator',
    ogDescription:
      'Customs, excise, VAT and the infrastructure levy on an imported vehicle — the full RRA breakdown in RWF.',
    heroEyebrow: 'Free tool',
    heroTitle: 'Rwanda import duty calculator',
    heroLede:
      'Most cars in Rwanda are imported, so the sticker price abroad is only half the question. Work out what RRA will add — customs, excise, VAT and the infrastructure levy — before you commit to a car you have not seen.',
    landedTitle: 'Work out the landed cost',
    landedDescription:
      'Enter what you would pay the exporter and pick the engine size. The breakdown updates as you type.',
    chainEyebrow: 'How it is built',
    chainTitle: 'Duty is charged in a chain',
    chainDescription:
      'Each step is calculated on the step before it, which is why the total climbs faster than people expect. The percentages shown against each line in the breakdown come from the same calculation, not from this page.',
    cifTitle: 'CIF value',
    cifBody:
      'Everything starts here: the price you pay the exporter plus the cost of getting the car to Rwanda — freight and insurance. Duty is charged on this figure, not on your invoice alone.',
    customsTitle: 'Customs duty',
    customsBody:
      'The East African Community external tariff, charged as a percentage of the CIF value. It is the same on every imported car regardless of engine size.',
    exciseTitle: 'Excise duty',
    exciseBody:
      'The one charge that moves with the car. Bigger engines attract a higher rate, which is why a 3.0-litre SUV and a 1.5-litre saloon of the same value land at very different totals.',
    vatTitle: 'VAT',
    vatBody:
      'Charged on the CIF value plus customs and excise together — so VAT is paid on the duties as well as on the car. This is the step most people leave out of their own sums.',
    infraTitle: 'Infrastructure levy',
    infraBody:
      'A small percentage of CIF, applied on top. It is minor next to the others but it is not zero.',
    limitsEyebrow: 'Read this before you budget',
    limitsTitle: 'What this calculator cannot know',
    limitsDescription:
      'It is a planning figure. Treat the gap between it and the real assessment as the risk you are carrying.',
    rraTitle: 'RRA values the car itself',
    rraBody:
      'The assessment is made against RRA’s own valuation of the vehicle, which may be higher or lower than the price on your invoice. Your purchase price is an input, not the answer.',
    ageTitle: 'Age and condition move it',
    ageBody:
      'Depreciation allowances, the year of manufacture and the body type all affect the assessed value. Two cars bought for the same money can clear at different totals.',
    clearingTitle: 'Clearing costs sit on top',
    clearingBody:
      'Port handling, transport from Dar es Salaam or Mombasa, clearing agent fees, registration and first insurance are all real and none of them are in this figure.',
    altTitle: 'Or buy a car that has already landed',
    altBody:
      'Every car on Sawa Cars is already in Rwanda, duty settled. Its documentation — including the RRA duty stamp — is checked during the 150-point inspection and published on the listing, so the price you see is the price you pay.',
    browse: 'Browse certified cars',
    financeCalc: 'Finance calculator',
  },

  dutyCalc: {
    ageUnder2: 'Under 2 years',
    noAllowance: 'No allowance',
    age2to4: '2 – 4 years',
    age4to6: '4 – 6 years',
    age6to8: '6 – 8 years',
    age8to10: '8 – 10 years',
    ageOver10: 'Over 10 years',
    exciseWord: '{{pct}}% excise',
    theVehicle: 'The vehicle',
    purchasePrice: 'Purchase price',
    purchasePriceHint: 'What you pay for the vehicle before shipping, entered in RWF.',
    engineSize: 'Engine size',
    vehicleAge: 'Vehicle age',
    note: 'Excise moves with engine size, and an older vehicle is assessed on a reduced value under the EAC depreciation schedule. Everything else is charged the same way on every imported car.',
    estimatedLanded: 'Estimated landed cost',
    landedLabel: 'Purchase price plus duties and taxes',
    landedNote: 'Duties add {{pct}}% on top of what you pay the exporter.',
    assessedValue: 'Value assessed for duty',
    assessedHint: '{{pct}}% depreciation allowance for the vehicle’s age',
    cifValue: 'CIF value',
    cifHint: 'Assessed value plus {{pct}} freight and insurance',
    customsDuty: 'Customs duty',
    customsHint: '{{pct}} of CIF',
    exciseDuty: 'Excise duty',
    exciseHint: '{{pct}}% of CIF plus customs — set by engine size',
    vat: 'VAT',
    vatHint: '{{pct}} of CIF plus customs and excise',
    withholding: 'Withholding tax',
    withholdingHint: '{{pct}} of CIF',
    infra: 'Infrastructure levy',
    infraHint: '{{pct}} of CIF',
    totalDuties: 'Total duties and taxes',
    disclaimer:
      'An estimate for planning. RRA assesses duty against its own valuation of the vehicle, which can differ from your invoice — age, body type and condition all move the figure. The assessment at clearing is the one that counts.',
    ratesReviewed: 'Rates last reviewed {{date}}.',
    compareBtn: 'Compare against cars already in Rwanda',
    placeholder:
      'Enter a purchase price to see the full breakdown — CIF, customs, excise, VAT and the withholding tax and the infrastructure levy.',
    liveResult:
      'Estimated landed cost {{total}}, of which {{duties}} is duties and taxes.',
  },

  valuationPage: {
    metaTitle: 'Free car valuation',
    metaDescription:
      'What is your car worth in Kigali today? A free market valuation priced from cars actually listed and sold on Sawa Cars — never a lookup table. No account needed.',
    ogTitle: 'Free car valuation — Sawa Cars',
    heroEyebrow: 'Free tool',
    heroTitle: 'What is your car worth today?',
    heroLede:
      'Priced from cars actually listed and sold on Sawa Cars — never a lookup table. Where we do not have enough comparable cars to be sure, we say so instead of inventing a figure.',
  },

  valuationTool: {
    yourCar: 'Your car',
    make: 'Make',
    makeHint: 'Start typing — we suggest makes we already have on the site.',
    year: 'Year',
    mileage: 'Mileage',
    mileageHint: 'Optional. Left blank, we value at {{km}}.',
    checking: 'Checking the market…',
    getValuation: 'Get my valuation',
    noAccount: 'No account, no phone number. We do not call you afterwards.',
    whatWorth: 'What it is worth',
    notEnoughTitle: 'Not enough comparable cars yet',
    notEnoughBody:
      '{{message}}. We price from cars actually listed or sold on Sawa Cars, so a make and year we have not handled yet gets no number rather than a guess.',
    inspectionStill:
      'An inspection still tells you where your {{make}} stands. Our team prices it against the market on the day it is certified, and you keep the final say.',
    errorTitle: 'We could not run that estimate',
    placeholder:
      'Enter a make and year to see what comparable cars on Sawa Cars are selling for.',
    liveOk:
      'Estimated range {{low}} to {{high}}, based on {{comparables}} comparable cars.',
    liveEmpty: 'Not enough comparable cars for that make and year.',
    carLabel: '{{year}} {{make}}',
    adjusted: 'Adjusted for the mileage you entered.',
    valuedAt: 'Valued at our {{km}} reference — add your mileage for a closer range.',
    avgPrice: 'Average price of those cars',
    avgHint: '{{make}}, {{from}}–{{to}}',
    pricesSeen: 'Prices actually seen',
    pricesSeenHint: 'Lowest and highest of the same group',
    comparablesUsed: 'Comparable cars used',
    comparablesHint: 'Listed or sold on Sawa Cars',
    estimateNote:
      'This is a market estimate, not an offer. The final asking price is yours — we confirm it with you after the 150-point inspection, when we know the car’s real condition.',
    submitBtn: 'Submit this car for inspection',
    submissionHint: 'Submission starts with a one-time ID check, which happens in the app.',
    orWhatsApp: 'Or message us on WhatsApp',
  },

  pricingPage: {
    metaTitle: 'Sawa Cars pricing — inspection, report and rental listing fees',
    metaDescription:
      'What Sawa Cars charges for a walk-in vehicle inspection, a resold inspection report, and a rental listing subscription. Browsing, buying, selling and messaging sellers stays free.',
    ogTitle: 'Sawa Cars pricing',
    heroEyebrow: 'Pricing',
    heroTitle: 'What we actually charge for',
    heroLede:
      'Browsing, buying, selling and contacting a verified seller are free. These are the paid services: an independent inspection, a copy of an existing report, and keeping a rental car visible.',
    inspectionTitle: 'Walk-in inspection',
    inspectionBody:
      'Bring any car — one you are about to buy from someone else, not just a Sawa listing — to a center for the full 150-point inspection. Paid at the office; the report is yours either way.',
    reportTitle: 'Report resale',
    reportBody:
      'A car has already been inspected and you want the same report — as a second buyer, or the seller wanting their own copy. Pay once for read access instead of a fresh inspection.',
    rentalTitle: 'Rental listing subscription',
    rentalBody:
      'Per vehicle, per month, for a verified rental provider to keep a car visible in the rental fleet. Renters never pay to browse or inquire.',
    reviewedNote: 'Prices last reviewed {{date}}.',
    disclaimer:
      'These are fees for Sawa Cars’ own inspection and listing services, paid or recorded at our office — never a marketplace transaction fee. Sawa Cars is not a party to any sale or rental; buyers, sellers and renters agree their own price, payment and terms directly.',
    bookInspection: 'Book a walk-in inspection',
    browseCars: 'Browse inspected cars',
  },
} as const

const rw = {
  hub: {
    metaTitle: 'Ibikoresho by’ubuntu byo gusuzuma agaciro, inguzanyo n’umusoro wo gutumiza imodoka mu Rwanda',
    metaDescription:
      'Ibikoresho by’ubuntu ku muntu wese ugura, ugurisha cyangwa utumiza imodoka mu Rwanda: isuzuma ry’agaciro rishingiye ku igurisha nyaryo rya Sawa Cars, imbonerahamwe yuzuye y’umusoro wa RRA wo gutumiza, n’isuzuma ry’inguzanyo ya buri kwezi.',
    ogTitle: 'Ibikoresho by’imodoka ku buntu · {{site}}',
    ogDescription:
      'Isuzuma ry’agaciro, umusoro wa RRA wo gutumiza n’ibarurwa ry’inguzanyo ku isoko ry’u Rwanda. Nta konti isabwa.',
    eyebrow: 'Ibikoresho',
    title: 'Bara imibare mbere yo kwiyemeza',
    lede: 'Ibikoresho bitatu byo kubara byakorewe isoko ry’u Rwanda. Nta konti, nta numero ya telefone, nta guhamagara nyuma — biri hano kubera ko umuguzi cyangwa umugurisha usobanukiwe imibare afata icyemezo cyiza.',
    open: 'Fungura',
    valuationMeta: 'Ku bagurisha',
    valuationTitle: 'Isuzuma ry’agaciro ku buntu',
    valuationBody:
      'Agaciro imodoka yawe ifite uyu munsi, gishingiye ku modoka zamamajwe kandi zagurishijwe koko kuri Sawa Cars. Iyo nta modoka zihagije zisa, turabikubwira aho gukeka.',
    dutyMeta: 'Ku batumiza',
    dutyTitle: 'Ikibaruzo cy’umusoro wo gutumiza',
    dutyBody:
      'Imbonerahamwe yuzuye ya RRA ku modoka yatumijwe — CIF, gasutamo, akize gushingiye ku bunini bwa moteri, TVA n’umusoro w’ibikorwa remezo — byose muri RWF.',
    financeMeta: 'Ku baguzi',
    financeTitle: 'Ikibaruzo cy’inguzanyo',
    financeBody:
      'Ikiguzi cya buri kwezi gishingiye ku giciro cy’imodoka, cyangwa igiciro cy’imodoka ingengo yawe ya buri kwezi yakwiyemeza. Harimo ingwate, igihe n’inyungu yose.',
    pricingMeta: 'Ibyo dusaba',
    pricingTitle: 'Ibiciro',
    pricingBody:
      'Ibyo Sawa Cars isaba by’ukuri: isuzuma ku kigo, kopi ya raporo, ubwishyu bwo kwerekana imodoka ikodeshwa. Gushakisha no kuvugana n’abagurisha ni ubuntu.',
  },

  financePage: {
    metaTitle: 'Ikibaruzo cy’inguzanyo y’imodoka',
    metaDescription:
      'Suzuma ikiguzi cya buri kwezi ku nguzanyo y’imodoka i Kigali, cyangwa ubare usubira inyuma uhereye ku byo ushobora kwishyura buri kwezi. Ingwate, igihe n’inyungu yose, byose muri RWF.',
    ogTitle: 'Ikibaruzo cy’inguzanyo y’imodoka',
    ogDescription:
      'Ikiguzi cya buri kwezi, ingwate n’inyungu yose ku nguzanyo y’imodoka i Kigali — cyangwa igiciro cy’imodoka ingengo yawe ya buri kwezi yakwiyemeza.',
    heroEyebrow: 'Igikoresho cy’ubuntu',
    heroTitle: 'Ikibaruzo cy’inguzanyo y’imodoka',
    heroLede:
      'Uburyo bubiri bwo gukemura ikibazo kimwe. Tangira ku modoka wabonye urebe ikiguzi cya buri kwezi, cyangwa utangire ku byo ushobora kwishyura buri kwezi urebe imodoka bigeraho.',
    estimateTitle: 'Suzuma ikiguzi',
    estimateDescription:
      'Kibazwe ku gipimo cya {{rate}}% ku mwaka — igipimo gihagarariye inguzanyo z’imodoka i Kigali, ni na cyo gipimo giri inyuma y’umubare wa buri kwezi ku ikarita ya buri tangazo.',
    beforeEyebrow: 'Mbere yo kubijyana muri banki',
    beforeTitle: 'Ibintu bitatu bizahindura uyu mubare',
    beforeDescription:
      'Sawa Cars ntitanga inguzanyo kandi ntabwo ihabwa komisiyo n’uwatanga inguzanyo uwo ari we wese. Iki gikoresho kiriho kugira ngo winjire muri banki uzi hafi icyo witega.',
    rateTitle: 'Igipimo cyawe ni icyihariye',
    rateBody:
      '{{rate}}% ku mwaka ni ingero y’isoko, si ijambo rya nyuma. Amabanki agena ashingiye ku nyungu yawe, akazi kawe n’amateka yawe na yo, kandi igipimo bakugezaho gishobora kuba hejuru cyangwa hasi yacyo.',
    feesTitle: 'Amafaranga y’ibindi ntari muri iki',
    feesBody:
      'Amafaranga yo gutunganya, ayo gusuzuma agaciro n’ubwishingizi bwuzuye amabanki menshi asaba abarwa ukwabo. Akenshi yiyongera ku mubare wa buri kwezi aho kwiyongera ku giciro.',
    termTitle: 'Igihe kirekire kigura menshi',
    termBody:
      'Kurambura inguzanyo imwe ku mezi menshi bigabanya ikiguzi cya buri kwezi ariko byongera inyungu yose. Gereranya umurongo w’"amafaranga yose wishyura", atari uwa buri kwezi gusa.',
    closeTitle: 'Inguzanyo itegurwa hanze ya Sawa Cars',
    closeBody:
      'Iki kibaruzo ni icy’amakuru gusa. Emeza inguzanyo iyo ari yo yose muri banki ubwawe kandi wumvikane ku wakira ubwishyu, ihererekanya ry’uburenganzira, itangwa n’amasezerano y’igurisha yanditse n’umugurisha ubwanyu. Sawa Cars ntabwo yakira amafaranga cyangwa ngo yishingire igurishwa.',
    browse: 'Reba imodoka zemewe',
    howBuying: 'Uko kugura bikorwa',
  },

  financeCalc: {
    yourNumbers: 'Imibare yawe',
    startFrom: 'Tangira ku',
    fromPrice: 'Uhereye ku giciro',
    fromBudget: 'Uhereye ku ngengo',
    months: 'amezi {{months}}',
    standard: 'gisanzwe',
    repaymentTerm: 'Igihe cyo kwishyura',
    carPrice: 'Igiciro cy’imodoka',
    carPriceHint: 'Igiciro cyasabwe ku itangazo.',
    monthlyBudget: 'Ingengo ya buri kwezi',
    monthlyBudgetHint: 'Icyo ushobora kwishyura nta kabuza buri kwezi.',
    deposit: 'Ingwate',
    depositHint: 'Amabanki i Kigali akunze gusaba {{pct}}% y’ubwishyu bwa mbere. Kugeza kuri {{max}}%.',
    estimatedRepayment: 'Ikiguzi cyagenzuwe',
    whatYouCanAfford: 'Icyo ushobora kwishyura',
    placeholderPrice:
      'Injiza igiciro cy’imodoka urebe ikiguzi cya buri kwezi, ingwate n’ikiguzi cyose cy’inguzanyo.',
    placeholderBudget: 'Injiza icyo ushobora kwishyura buri kwezi urebe igiciro cy’imodoka bigeraho.',
    overMonths: 'Mu mezi {{months}} ku gipimo cya {{rate}}% ku mwaka',
    perMonth: '{{amount}}/ukwezi',
    standardNote:
      'Ku ngwate isanzwe ya {{deposit}}% mu mezi {{months}} byaba {{amount}}/ukwezi — umubare ugaragara ku makarita y’amatangazo.',
    depositRow: 'Ingwate',
    depositRowHint: '{{pct}}% by’igiciro, byishyurirwa mu kigo',
    amountFinanced: 'Amafaranga yaguriwe inguzanyo',
    interestRow: 'Inyungu mu gihe cyose',
    interestHint: 'Ku gipimo gihagarariye kiri hasi',
    totalYouPay: 'Amafaranga yose wishyura',
    totalHint: 'Ingwate n’ubwishyu bwose',
    browseUpTo: 'Reba imodoka zemewe kugeza kuri {{amount}}',
    payingMonth: 'Wishyura {{amount}} ku kwezi mu mezi {{months}}',
    upTo: 'Kugeza kuri {{amount}}',
    budgetNote: 'Bishingiye ku ngwate ya {{deposit}}% ku gipimo cya {{rate}}% ku mwaka.',
    depositNeeded: 'Ingwate wakenera',
    depositNeededHint: '{{pct}}% by’igiciro cy’imodoka',
    liveResultPrice: 'Byagenzuwe ku {{amount}} ku kwezi mu mezi {{months}}.',
    liveResultBudget: 'Ingengo ya {{amount}} ku kwezi yemerera imodoka kugeza kuri {{max}}.',
    disclaimer:
      'Sawa Cars ntitanga inguzanyo kandi ntitegura inguzanyo. {{rate}}% ku mwaka ni igipimo gihagarariye isoko rya Kigali — banki yawe igena icyayo ishingiye ku miterere yawe, kandi akenshi yongeraho amafaranga yo gutunganya n’ubwishingizi busabwa. Bifate nk’intangiriro y’iyo mishyikirano.',
  },

  dutyPage: {
    metaTitle: 'Ikibaruzo cy’umusoro wo gutumiza mu Rwanda',
    metaDescription:
      'Suzuma umusoro wa RRA wo gutumiza imodoka mu Rwanda: agaciro ka CIF, umusoro wa gasutamo, akize gushingiye ku bunini bwa moteri, TVA n’umusoro w’ibikorwa remezo — byose muri RWF.',
    ogTitle: 'Ikibaruzo cy’umusoro wo gutumiza mu Rwanda',
    ogDescription:
      'Gasutamo, akize, TVA n’umusoro w’ibikorwa remezo ku modoka yatumijwe — imbonerahamwe yuzuye ya RRA muri RWF.',
    heroEyebrow: 'Igikoresho cy’ubuntu',
    heroTitle: 'Ikibaruzo cy’umusoro wo gutumiza mu Rwanda',
    heroLede:
      'Imodoka nyinshi mu Rwanda zaratumijwe, bityo igiciro cyo hanze ni kimwe cya kabiri cy’ikibazo. Bara icyo RRA izongeraho — gasutamo, akize, TVA n’umusoro w’ibikorwa remezo — mbere yo kwiyemeza imodoka utabonye.',
    landedTitle: 'Bara ikiguzi cyose kugera mu gihugu',
    landedDescription:
      'Injiza icyo wishyura uwohereza kandi uhitemo ubunini bwa moteri. Imbonerahamwe yisubiramo uko wandika.',
    chainEyebrow: 'Uko byubatswe',
    chainTitle: 'Umusoro ubarwa ku rukurikirane',
    chainDescription:
      'Buri ntambwe ibarwa ku yayibanjirije, ni yo mpamvu igiteranyo cyiyongera vuba kurusha uko abantu bibwira. Ijanisha rigaragara kuri buri murongo mu mbonerahamwe riva mu mibare imwe, ntabwo riva kuri iyi paji.',
    cifTitle: 'Agaciro ka CIF',
    cifBody:
      'Byose bitangirira hano: igiciro wishyura uwohereza wongeyeho ikiguzi cyo kuzana imodoka mu Rwanda — ubwikorezi n’ubwishingizi. Umusoro ubarwa kuri uyu mubare, atari ku fagitire yawe yonyine.',
    customsTitle: 'Umusoro wa gasutamo',
    customsBody:
      'Ikoro rya gasutamo ry’Umuryango w’Afurika y’Iburasirazuba, ribarwa nk’ijanisha ry’agaciro ka CIF. Ni rimwe ku modoka zose zatumijwe uko ubunini bwa moteri bwaba bumeze kose.',
    exciseTitle: 'Akize',
    exciseBody:
      'Umusoro umwe uhinduka ukurikije imodoka. Moteri nini itera igipimo kiri hejuru, ni yo mpamvu SUV ya litiro 3.0 n’imodoka ya litiro 1.5 z’agaciro kamwe zigera ku giteranyo gitandukanye cyane.',
    vatTitle: 'TVA',
    vatBody:
      'Ibarwa ku gaciro ka CIF wongeyeho gasutamo n’akize hamwe — bityo TVA yishyurwa ku misoro no ku modoka ubwayo. Iyi ni intambwe abantu benshi basiga mu mibare yabo.',
    infraTitle: 'Umusoro w’ibikorwa remezo',
    infraBody:
      'Ijanisha rito rya CIF, ryongewe hejuru. Ni rito ugereranyije n’ayandi ariko ntabwo ari ubusa.',
    limitsEyebrow: 'Soma ibi mbere yo gukora ingengo',
    limitsTitle: 'Icyo iki kibaruzo kitamenya',
    limitsDescription:
      'Ni umubare wo guteganya. Fata icyuho kiri hagati yawo n’isuzuma nyako nk’ingaruka wikoreye.',
    rraTitle: 'RRA isuzuma imodoka ubwayo',
    rraBody:
      'Isuzuma rikorwa hashingiwe ku gaciro RRA ubwayo iha imodoka, gashobora kuba hejuru cyangwa hasi y’igiciro cyo ku fagitire yawe. Igiciro wazitanzeho ni icyinjizwa, atari igisubizo.',
    ageTitle: 'Imyaka n’imiterere bihindura umubare',
    ageBody:
      'Ibigabanywa ku gaciro, umwaka wakoreweho n’ubwoko bw’umubiri byose bigira ingaruka ku gaciro gasuzumwe. Imodoka ebyiri zaguzwe amafaranga amwe zishobora kurangira ku giteranyo gitandukanye.',
    clearingTitle: 'Amafaranga yo gukuramo ari hejuru',
    clearingBody:
      'Gutunganya ku cyambu, ubwikorezi buvuye Dar es Salaam cyangwa Mombasa, amafaranga y’umukozi ukuramo, kwiyandikisha n’ubwishingizi bwa mbere byose ni ukuri kandi nta na kimwe kiri muri uyu mubare.',
    altTitle: 'Cyangwa gura imodoka isanzwe yaje',
    altBody:
      'Imodoka zose kuri Sawa Cars zisanzwe ziri mu Rwanda, umusoro warishyuwe. Inyandiko zazo — harimo n’ikimenyetso cy’umusoro wa RRA — zigenzurwa mu gihe cy’isuzuma ry’ingingo 150 kandi zishyirwa ku itangazo, bityo igiciro ubona ni cyo wishyura.',
    browse: 'Reba imodoka zemewe',
    financeCalc: 'Ikibaruzo cy’inguzanyo',
  },

  dutyCalc: {
    ageUnder2: 'Munsi y’imyaka 2',
    noAllowance: 'Nta gabanywa',
    age2to4: 'Imyaka 2 – 4',
    age4to6: 'Imyaka 4 – 6',
    age6to8: 'Imyaka 6 – 8',
    age8to10: 'Imyaka 8 – 10',
    ageOver10: 'Hejuru y’imyaka 10',
    exciseWord: '{{pct}}% by’akize',
    theVehicle: 'Imodoka',
    purchasePrice: 'Igiciro cyo kugura',
    purchasePriceHint: 'Icyo wishyura ku modoka mbere y’ubwikorezi, cyanditswe muri RWF.',
    engineSize: 'Ubunini bwa moteri',
    vehicleAge: 'Imyaka y’imodoka',
    note: 'Akize kahinduka ukurikije ubunini bwa moteri, kandi imodoka ishaje isuzumwa ku gaciro kagabanyijwe hashingiwe ku igabanywa rya EAC. Ibindi byose bibarwa kimwe ku modoka zose zatumijwe.',
    estimatedLanded: 'Ikiguzi cyagenzuwe kugera mu gihugu',
    landedLabel: 'Igiciro cyo kugura wongeyeho imisoro',
    landedNote: 'Imisoro yongeraho {{pct}}% ku byo wishyura uwohereza.',
    assessedValue: 'Agaciro gasuzumiwe umusoro',
    assessedHint: '{{pct}}% by’igabanywa ku myaka y’imodoka',
    cifValue: 'Agaciro ka CIF',
    cifHint: 'Agaciro gasuzumye wongeyeho {{pct}} by’ubwikorezi n’ubwishingizi',
    customsDuty: 'Umusoro wa gasutamo',
    customsHint: '{{pct}} bya CIF',
    exciseDuty: 'Akize',
    exciseHint: '{{pct}}% bya CIF wongeyeho gasutamo — bigenwa n’ubunini bwa moteri',
    vat: 'TVA',
    vatHint: '{{pct}} bya CIF wongeyeho gasutamo n’akize',
    withholding: 'Umusoro ufatirwa',
    withholdingHint: '{{pct}} bya CIF',
    infra: 'Umusoro w’ibikorwa remezo',
    infraHint: '{{pct}} bya CIF',
    totalDuties: 'Imisoro yose',
    disclaimer:
      'Ni isuzuma ryo guteganya. RRA isuzuma umusoro hashingiwe ku gaciro kayo bwite ka imodoka, gashobora gutandukana n’ifagitire yawe — imyaka, ubwoko bw’umubiri n’imiterere byose bihindura umubare. Isuzuma rikorwa mu gukuramo ni ryo rifite agaciro.',
    ratesReviewed: 'Ibipimo byaheruka gusuzumwa {{date}}.',
    compareBtn: 'Gereranya n’imodoka zisanzwe ziri mu Rwanda',
    placeholder:
      'Injiza igiciro cyo kugura urebe imbonerahamwe yuzuye — CIF, gasutamo, akize, TVA n’umusoro ufatirwa n’umusoro w’ibikorwa remezo.',
    liveResult:
      'Ikiguzi cyagenzuwe kugera mu gihugu ni {{total}}, muri cyo {{duties}} ni imisoro.',
  },

  valuationPage: {
    metaTitle: 'Isuzuma ry’agaciro k’imodoka ku buntu',
    metaDescription:
      'Imodoka yawe igura iki i Kigali uyu munsi? Isuzuma ry’agaciro ku isoko ku buntu rishingiye ku modoka zamamajwe kandi zagurishijwe koko kuri Sawa Cars — atari imbonerahamwe yo kureba. Nta konti isabwa.',
    ogTitle: 'Isuzuma ry’agaciro k’imodoka ku buntu — Sawa Cars',
    heroEyebrow: 'Igikoresho cy’ubuntu',
    heroTitle: 'Imodoka yawe igura iki uyu munsi?',
    heroLede:
      'Gishingiye ku modoka zamamajwe kandi zagurishijwe koko kuri Sawa Cars — atari imbonerahamwe yo kureba. Aho tudafite imodoka zihagije zisa ngo tube twizeye, turabivuga aho guhimba umubare.',
  },

  valuationTool: {
    yourCar: 'Imodoka yawe',
    make: 'Ubwoko',
    makeHint: 'Tangira kwandika — dukwereka amoko dusanzwe dufite ku rubuga.',
    year: 'Umwaka',
    mileage: 'Ibirometero',
    mileageHint: 'Bishakwa. Iyo bisize ubusa, dusuzuma kuri {{km}}.',
    checking: 'Turareba isoko…',
    getValuation: 'Bona isuzuma ryanjye',
    noAccount: 'Nta konti, nta numero ya telefone. Ntituguhamagara nyuma.',
    whatWorth: 'Icyo igura',
    notEnoughTitle: 'Nta modoka zihagije zisa ziraboneka',
    notEnoughBody:
      '{{message}}. Dusuzuma dushingiye ku modoka zamamajwe cyangwa zagurishijwe koko kuri Sawa Cars, bityo ubwoko n’umwaka tutigeze dukoraho ntibihabwa umubare aho gukeka.',
    inspectionStill:
      'Isuzuma riracyakubwira aho {{make}} yawe ihagaze. Ikipe yacu iyisuzumira agaciro ku isoko umunsi yemejwe, kandi ijambo rya nyuma rikaba iryawe.',
    errorTitle: 'Ntitwashoboye gukora iryo suzuma',
    placeholder:
      'Injiza ubwoko n’umwaka urebe uko imodoka zisa kuri Sawa Cars zigurishwa.',
    liveOk:
      'Urwego rwagenzuwe {{low}} kugeza {{high}}, dushingiye ku modoka {{comparables}} zisa.',
    liveEmpty: 'Nta modoka zihagije zisa z’ubwo bwoko n’uwo mwaka.',
    carLabel: '{{make}} yo mu {{year}}',
    adjusted: 'Byahinduwe hakurikijwe ibirometero winjije.',
    valuedAt: 'Byasuzumiwe ku rugero rwacu rwa {{km}} — ongeraho ibirometero byawe kugira urwego rwegereye.',
    avgPrice: 'Igiciro rusange cy’izo modoka',
    avgHint: '{{make}}, {{from}}–{{to}}',
    pricesSeen: 'Ibiciro byabonetse koko',
    pricesSeenHint: 'Iciriritse n’ikinini by’itsinda rimwe',
    comparablesUsed: 'Imodoka zisa zakoreshejwe',
    comparablesHint: 'Zamamajwe cyangwa zagurishijwe kuri Sawa Cars',
    estimateNote:
      'Iri ni isuzuma ry’isoko, atari icyifuzo. Igiciro cya nyuma gisabwa ni icyawe — tukigemura nawe nyuma y’isuzuma ry’ingingo 150, igihe tuzi imiterere nyayo y’imodoka.',
    submitBtn: 'Tanga iyi modoka isuzumwe',
    submissionHint: 'Gutanga bitangirana n’igenzura ry’indangamuntu rimwe gusa, ribera muri porogaramu.',
    orWhatsApp: 'Cyangwa utwandikire kuri WhatsApp',
  },

  pricingPage: {
    metaTitle: 'Ibiciro bya Sawa Cars — isuzuma, raporo n’ikodeshwa',
    metaDescription:
      'Ibyo Sawa Cars isaba ku isuzuma ry’imodoka ku ikigo, kopi ya raporo isanzweho, n’ubwishyu bwo gukomeza kwerekana imodoka ikodeshwa. Gushakisha, kugura, kugurisha no kuvugana n’umugurisha wemejwe ni ubuntu.',
    ogTitle: 'Ibiciro bya Sawa Cars',
    heroEyebrow: 'Ibiciro',
    heroTitle: 'Ibyo dusaba by’ukuri',
    heroLede:
      'Gushakisha, kugura, kugurisha no kuvugana n’umugurisha wemejwe ni ubuntu. Ibi ni serivisi zishyurwa: isuzuma ryigenga, kopi ya raporo isanzweho, no gukomeza kwerekana imodoka ikodeshwa.',
    inspectionTitle: 'Isuzuma ku kigo',
    inspectionBody:
      'Zana imodoka iyo ari yo yose — harimo n’iyo ugiye kugura ku wundi muntu, atari gusa iri ku rutonde rwa Sawa — ku kigo kugira ngo isuzumwe ku ngingo 150. Byishyurwa ku kigo; raporo iraguhabwa uko byagenda kose.',
    reportTitle: 'Kopi ya raporo',
    reportBody:
      'Imodoka yamaze gusuzumwa kandi ushaka raporo imwe — nk’umuguzi wa kabiri, cyangwa umugurisha ushaka kopi ye bwite. Ishyura rimwe kugira ngo ubone raporo aho kongera gusuzumwa.',
    rentalTitle: 'Ubwishyu bwo kwerekana imodoka ikodeshwa',
    rentalBody:
      'Ku modoka imwe, buri kwezi, kugira ngo uwatanga imodoka wemejwe akomeze kuyerekana mu modoka zikodeshwa. Abakodesha ntibishyura gushakisha cyangwa gusaba.',
    reviewedNote: 'Ibiciro byasuzumwe bwa nyuma {{date}}.',
    disclaimer:
      'Aya ni amafaranga ya serivisi za Sawa Cars ubwazo z’isuzuma n’ikodeshwa, yishyurwa cyangwa yanditswe ku kigo cyacu — ntabwo ari amafaranga y’ubucuruzi bwo ku isoko. Sawa Cars ntabwo ari uruhande mu igurisha cyangwa ikodeshwa; abaguzi, abagurisha n’abakodesha bumvikana bwite ku giciro, kwishyura n’amabwiriza.',
    bookInspection: 'Saba isuzuma ku kigo',
    browseCars: 'Reba imodoka zasuzumwe',
  },
} as const

const fr = {
  hub: {
    metaTitle: 'Outils gratuits d’estimation, de financement et de droits d’importation auto pour le Rwanda',
    metaDescription:
      'Des calculateurs gratuits pour quiconque achète, vend ou importe une voiture au Rwanda : une estimation de marché issue des ventes réelles de Sawa Cars, le détail complet des droits d’importation de la RRA et une estimation de mensualité.',
    ogTitle: 'Outils auto gratuits · {{site}}',
    ogDescription:
      'Calculateurs d’estimation, de droits d’importation RRA et de financement pour le marché rwandais. Sans compte.',
    eyebrow: 'Outils',
    title: 'Calculez les chiffres avant de vous engager',
    lede: 'Trois calculateurs conçus pour le marché rwandais. Pas de compte, pas de numéro de téléphone, pas d’appel de suivi — ils sont là parce qu’un acheteur ou un vendeur qui comprend les chiffres prend une meilleure décision.',
    open: 'Ouvrir',
    valuationMeta: 'Pour les vendeurs',
    valuationTitle: 'Estimation gratuite',
    valuationBody:
      'Ce que vaut votre voiture aujourd’hui, estimé par rapport aux voitures réellement mises en vente et vendues sur Sawa Cars. S’il n’y a pas assez de voitures comparables, nous le disons plutôt que de deviner.',
    dutyMeta: 'Pour les importateurs',
    dutyTitle: 'Calculateur de droits d’importation',
    dutyBody:
      'Le détail complet de la RRA sur un véhicule importé — valeur CIF, douane, accise selon la cylindrée, TVA et redevance d’infrastructure — entièrement en RWF.',
    financeMeta: 'Pour les acheteurs',
    financeTitle: 'Calculateur de financement',
    financeBody:
      'Une mensualité à partir d’un prix de voiture, ou le prix que votre budget mensuel permet. Apport, durée et intérêts totaux inclus.',
    pricingMeta: 'Ce que nous facturons',
    pricingTitle: 'Tarifs',
    pricingBody:
      'Ce que Sawa Cars facture réellement : une inspection sur place, un rapport revendu, un abonnement d’annonce de location. Parcourir et contacter les vendeurs reste gratuit.',
  },

  financePage: {
    metaTitle: 'Calculateur de financement auto',
    metaDescription:
      'Estimez la mensualité d’un prêt auto à Kigali, ou raisonnez à l’envers à partir de ce que vous pouvez payer chaque mois. Apport, durée et intérêts totaux, le tout en RWF.',
    ogTitle: 'Calculateur de financement auto',
    ogDescription:
      'Mensualité, apport et intérêts totaux d’un prêt auto à Kigali — ou le prix de voiture que votre budget mensuel permet.',
    heroEyebrow: 'Outil gratuit',
    heroTitle: 'Calculateur de financement auto',
    heroLede:
      'Deux façons d’aborder la même question. Partez d’une voiture que vous avez trouvée et voyez la mensualité, ou partez de ce que vous pouvez payer chaque mois et voyez quelles voitures cela permet.',
    estimateTitle: 'Estimer une mensualité',
    estimateDescription:
      'Calculé à {{rate}}% par an — un taux représentatif du crédit auto à Kigali, et le même taux derrière le montant mensuel affiché sur chaque fiche d’annonce.',
    beforeEyebrow: 'Avant d’aller à la banque',
    beforeTitle: 'Trois éléments qui changeront ce chiffre',
    beforeDescription:
      'Sawa Cars ne prête pas et ne perçoit aucune commission d’un prêteur. Cet outil existe pour que vous arriviez à la banque en sachant à peu près à quoi vous attendre.',
    rateTitle: 'Votre taux est personnel',
    rateBody:
      '{{rate}}% par an est un repère de marché, pas un devis. Les banques fixent leur taux selon vos revenus, votre emploi et vos antécédents avec elles, et le taux proposé peut se situer de part et d’autre.',
    feesTitle: 'Les frais n’y figurent pas',
    feesBody:
      'Les frais de dossier, les frais d’expertise et l’assurance tous risques exigée par la plupart des prêteurs sont facturés séparément. Ils s’ajoutent généralement à la mensualité plutôt qu’au prix.',
    termTitle: 'Une durée plus longue coûte plus cher',
    termBody:
      'Étaler le même prêt sur plus de mois réduit la mensualité et augmente les intérêts totaux. Comparez la ligne « total à payer », pas seulement la mensualité.',
    closeTitle: 'Le financement s’organise en dehors de Sawa Cars',
    closeBody:
      'Ce calculateur est informatif. Confirmez tout prêt directement avec la banque et convenez du bénéficiaire du paiement, du transfert de propriété, de la livraison et des conditions de vente écrites directement avec le vendeur. Sawa Cars ne reçoit pas les fonds et ne garantit pas la transaction.',
    browse: 'Voir les voitures certifiées',
    howBuying: 'Comment se déroule l’achat',
  },

  financeCalc: {
    yourNumbers: 'Vos chiffres',
    startFrom: 'Partir de',
    fromPrice: 'D’un prix',
    fromBudget: 'D’un budget',
    months: '{{months}} mois',
    standard: 'standard',
    repaymentTerm: 'Durée de remboursement',
    carPrice: 'Prix de la voiture',
    carPriceHint: 'Le prix demandé sur l’annonce.',
    monthlyBudget: 'Budget mensuel',
    monthlyBudgetHint: 'Ce que vous pouvez payer confortablement chaque mois.',
    deposit: 'Apport',
    depositHint: 'Les banques de Kigali demandent généralement {{pct}}% d’apport. Jusqu’à {{max}}%.',
    estimatedRepayment: 'Mensualité estimée',
    whatYouCanAfford: 'Ce que vous pouvez vous permettre',
    placeholderPrice:
      'Saisissez un prix de voiture pour voir la mensualité, l’apport et le coût total du prêt.',
    placeholderBudget: 'Saisissez ce que vous pouvez payer chaque mois pour voir le prix de voiture correspondant.',
    overMonths: 'Sur {{months}} mois à {{rate}}% par an',
    perMonth: '{{amount}}/mois',
    standardNote:
      'Aux conditions standard de {{deposit}}% sur {{months}} mois, ce serait {{amount}}/mois — le montant affiché sur les fiches d’annonce.',
    depositRow: 'Apport',
    depositRowHint: '{{pct}}% du prix, versé au centre',
    amountFinanced: 'Montant financé',
    interestRow: 'Intérêts sur la durée',
    interestHint: 'Au taux représentatif ci-dessous',
    totalYouPay: 'Total à payer',
    totalHint: 'Apport plus chaque mensualité',
    browseUpTo: 'Voir les voitures certifiées jusqu’à {{amount}}',
    payingMonth: 'En payant {{amount}} par mois pendant {{months}} mois',
    upTo: 'Jusqu’à {{amount}}',
    budgetNote: 'Suppose un apport de {{deposit}}% à {{rate}}% par an.',
    depositNeeded: 'Apport nécessaire',
    depositNeededHint: '{{pct}}% du prix de la voiture',
    liveResultPrice: 'Estimé à {{amount}} par mois sur {{months}} mois.',
    liveResultBudget: 'Un budget de {{amount}} par mois permet une voiture jusqu’à {{max}}.',
    disclaimer:
      'Sawa Cars ne prête pas et n’organise pas de financement. {{rate}}% par an est un taux de marché représentatif de Kigali — votre banque fixe le sien selon votre profil, et ajoute généralement des frais de dossier et l’assurance exigée. Considérez-le comme un point de départ pour cette discussion.',
  },

  dutyPage: {
    metaTitle: 'Calculateur de droits d’importation au Rwanda',
    metaDescription:
      'Estimez les droits d’importation de la RRA sur un véhicule introduit au Rwanda : valeur CIF, droits de douane, accise selon la cylindrée, TVA et redevance d’infrastructure — le tout en RWF.',
    ogTitle: 'Calculateur de droits d’importation au Rwanda',
    ogDescription:
      'Douane, accise, TVA et redevance d’infrastructure sur un véhicule importé — le détail complet de la RRA en RWF.',
    heroEyebrow: 'Outil gratuit',
    heroTitle: 'Calculateur de droits d’importation au Rwanda',
    heroLede:
      'La plupart des voitures au Rwanda sont importées, le prix affiché à l’étranger n’est donc que la moitié de la question. Calculez ce que la RRA ajoutera — douane, accise, TVA et redevance d’infrastructure — avant de vous engager sur une voiture que vous n’avez pas vue.',
    landedTitle: 'Calculez le coût rendu',
    landedDescription:
      'Saisissez ce que vous paieriez à l’exportateur et choisissez la cylindrée. Le détail se met à jour au fil de votre saisie.',
    chainEyebrow: 'Comment c’est construit',
    chainTitle: 'Les droits se calculent en chaîne',
    chainDescription:
      'Chaque étape se calcule sur la précédente, c’est pourquoi le total grimpe plus vite qu’on ne le pense. Les pourcentages affichés en regard de chaque ligne du détail proviennent du même calcul, pas de cette page.',
    cifTitle: 'Valeur CIF',
    cifBody:
      'Tout part d’ici : le prix payé à l’exportateur plus le coût pour acheminer la voiture au Rwanda — fret et assurance. Les droits sont calculés sur ce montant, pas sur votre facture seule.',
    customsTitle: 'Droits de douane',
    customsBody:
      'Le tarif extérieur de la Communauté d’Afrique de l’Est, prélevé en pourcentage de la valeur CIF. Il est le même sur toute voiture importée, quelle que soit la cylindrée.',
    exciseTitle: 'Accise',
    exciseBody:
      'Le seul prélèvement qui varie avec la voiture. Les gros moteurs entraînent un taux plus élevé, c’est pourquoi un SUV 3,0 litres et une berline 1,5 litre de même valeur aboutissent à des totaux très différents.',
    vatTitle: 'TVA',
    vatBody:
      'Prélevée sur la valeur CIF plus la douane et l’accise réunies — la TVA porte donc sur les droits comme sur la voiture. C’est l’étape que la plupart des gens oublient dans leurs calculs.',
    infraTitle: 'Redevance d’infrastructure',
    infraBody:
      'Un petit pourcentage de la valeur CIF, appliqué en plus. C’est mineur par rapport aux autres, mais ce n’est pas nul.',
    limitsEyebrow: 'À lire avant d’établir votre budget',
    limitsTitle: 'Ce que ce calculateur ne peut pas savoir',
    limitsDescription:
      'C’est un chiffre de planification. Considérez l’écart entre lui et l’évaluation réelle comme le risque que vous portez.',
    rraTitle: 'La RRA évalue la voiture elle-même',
    rraBody:
      'L’évaluation se fait selon la propre valeur que la RRA attribue au véhicule, qui peut être supérieure ou inférieure au prix de votre facture. Votre prix d’achat est une donnée d’entrée, pas la réponse.',
    ageTitle: 'L’âge et l’état la font bouger',
    ageBody:
      'Les abattements pour dépréciation, l’année de fabrication et le type de carrosserie influent tous sur la valeur retenue. Deux voitures achetées au même prix peuvent être dédouanées à des totaux différents.',
    clearingTitle: 'Les frais de dédouanement s’ajoutent',
    clearingBody:
      'La manutention portuaire, le transport depuis Dar es Salaam ou Mombasa, les honoraires du transitaire, l’immatriculation et la première assurance sont tous réels et aucun ne figure dans ce chiffre.',
    altTitle: 'Ou achetez une voiture déjà arrivée',
    altBody:
      'Chaque voiture sur Sawa Cars est déjà au Rwanda, droits acquittés. Ses documents — y compris le timbre de droits de la RRA — sont vérifiés lors de l’inspection en 150 points et publiés sur l’annonce, de sorte que le prix que vous voyez est le prix que vous payez.',
    browse: 'Voir les voitures certifiées',
    financeCalc: 'Calculateur de financement',
  },

  dutyCalc: {
    ageUnder2: 'Moins de 2 ans',
    noAllowance: 'Aucun abattement',
    age2to4: '2 – 4 ans',
    age4to6: '4 – 6 ans',
    age6to8: '6 – 8 ans',
    age8to10: '8 – 10 ans',
    ageOver10: 'Plus de 10 ans',
    exciseWord: '{{pct}}% d’accise',
    theVehicle: 'Le véhicule',
    purchasePrice: 'Prix d’achat',
    purchasePriceHint: 'Ce que vous payez pour le véhicule avant transport, saisi en RWF.',
    engineSize: 'Cylindrée',
    vehicleAge: 'Âge du véhicule',
    note: 'L’accise varie avec la cylindrée, et un véhicule plus ancien est évalué sur une valeur réduite selon le barème de dépréciation de l’EAC. Tout le reste est prélevé de la même manière sur chaque voiture importée.',
    estimatedLanded: 'Coût rendu estimé',
    landedLabel: 'Prix d’achat plus droits et taxes',
    landedNote: 'Les droits ajoutent {{pct}}% à ce que vous payez à l’exportateur.',
    assessedValue: 'Valeur retenue pour les droits',
    assessedHint: '{{pct}}% d’abattement pour dépréciation selon l’âge du véhicule',
    cifValue: 'Valeur CIF',
    cifHint: 'Valeur retenue plus {{pct}} de fret et d’assurance',
    customsDuty: 'Droits de douane',
    customsHint: '{{pct}} de la valeur CIF',
    exciseDuty: 'Accise',
    exciseHint: '{{pct}}% de la CIF plus la douane — fixé par la cylindrée',
    vat: 'TVA',
    vatHint: '{{pct}} de la CIF plus la douane et l’accise',
    withholding: 'Retenue à la source',
    withholdingHint: '{{pct}} de la valeur CIF',
    infra: 'Redevance d’infrastructure',
    infraHint: '{{pct}} de la valeur CIF',
    totalDuties: 'Total des droits et taxes',
    disclaimer:
      'Une estimation à des fins de planification. La RRA calcule les droits selon sa propre évaluation du véhicule, qui peut différer de votre facture — l’âge, le type de carrosserie et l’état font tous bouger le chiffre. C’est l’évaluation au dédouanement qui compte.',
    ratesReviewed: 'Taux révisés pour la dernière fois le {{date}}.',
    compareBtn: 'Comparer avec des voitures déjà au Rwanda',
    placeholder:
      'Saisissez un prix d’achat pour voir le détail complet — CIF, douane, accise, TVA, retenue à la source et redevance d’infrastructure.',
    liveResult:
      'Coût rendu estimé {{total}}, dont {{duties}} de droits et taxes.',
  },

  valuationPage: {
    metaTitle: 'Estimation gratuite de voiture',
    metaDescription:
      'Combien vaut votre voiture à Kigali aujourd’hui ? Une estimation de marché gratuite établie à partir des voitures réellement mises en vente et vendues sur Sawa Cars — jamais une grille toute faite. Sans compte.',
    ogTitle: 'Estimation gratuite de voiture — Sawa Cars',
    heroEyebrow: 'Outil gratuit',
    heroTitle: 'Combien vaut votre voiture aujourd’hui ?',
    heroLede:
      'Établie à partir des voitures réellement mises en vente et vendues sur Sawa Cars — jamais une grille toute faite. Lorsque nous n’avons pas assez de voitures comparables pour être sûrs, nous le disons au lieu d’inventer un chiffre.',
  },

  valuationTool: {
    yourCar: 'Votre voiture',
    make: 'Marque',
    makeHint: 'Commencez à taper — nous suggérons les marques déjà présentes sur le site.',
    year: 'Année',
    mileage: 'Kilométrage',
    mileageHint: 'Facultatif. Laissé vide, nous estimons à {{km}}.',
    checking: 'Analyse du marché…',
    getValuation: 'Obtenir mon estimation',
    noAccount: 'Pas de compte, pas de numéro de téléphone. Nous ne vous rappelons pas.',
    whatWorth: 'Ce qu’elle vaut',
    notEnoughTitle: 'Pas encore assez de voitures comparables',
    notEnoughBody:
      '{{message}}. Nous estimons à partir des voitures réellement mises en vente ou vendues sur Sawa Cars ; une marque et une année que nous n’avons pas encore traitées n’obtiennent donc aucun chiffre plutôt qu’une supposition.',
    inspectionStill:
      'Une inspection vous indique tout de même où se situe votre {{make}}. Notre équipe l’évalue par rapport au marché le jour de sa certification, et le dernier mot vous revient.',
    errorTitle: 'Nous n’avons pas pu réaliser cette estimation',
    placeholder:
      'Saisissez une marque et une année pour voir à quel prix se vendent les voitures comparables sur Sawa Cars.',
    liveOk:
      'Fourchette estimée de {{low}} à {{high}}, sur la base de {{comparables}} voitures comparables.',
    liveEmpty: 'Pas assez de voitures comparables pour cette marque et cette année.',
    carLabel: '{{make}} {{year}}',
    adjusted: 'Ajusté selon le kilométrage que vous avez saisi.',
    valuedAt: 'Estimé à notre référence de {{km}} — ajoutez votre kilométrage pour une fourchette plus précise.',
    avgPrice: 'Prix moyen de ces voitures',
    avgHint: '{{make}}, {{from}}–{{to}}',
    pricesSeen: 'Prix réellement observés',
    pricesSeenHint: 'Le plus bas et le plus haut du même groupe',
    comparablesUsed: 'Voitures comparables utilisées',
    comparablesHint: 'Mises en vente ou vendues sur Sawa Cars',
    estimateNote:
      'Ceci est une estimation de marché, pas une offre. Le prix de vente final vous appartient — nous le confirmons avec vous après l’inspection en 150 points, quand nous connaissons l’état réel de la voiture.',
    submitBtn: 'Soumettre cette voiture à l’inspection',
    submissionHint: 'La soumission commence par une vérification d’identité unique, qui se fait dans l’application.',
    orWhatsApp: 'Ou écrivez-nous sur WhatsApp',
  },

  pricingPage: {
    metaTitle: 'Tarifs Sawa Cars — inspection, rapport et abonnement de location',
    metaDescription:
      'Ce que Sawa Cars facture pour une inspection sur place, la revente d’un rapport existant et un abonnement d’annonce de location. Parcourir, acheter, vendre et contacter un vendeur reste gratuit.',
    ogTitle: 'Tarifs Sawa Cars',
    heroEyebrow: 'Tarifs',
    heroTitle: 'Ce que nous facturons réellement',
    heroLede:
      'Parcourir, acheter, vendre et contacter un vendeur vérifié est gratuit. Voici les services payants : une inspection indépendante, une copie d’un rapport existant, et le maintien de la visibilité d’une voiture de location.',
    inspectionTitle: 'Inspection sur place',
    inspectionBody:
      'Amenez n’importe quel véhicule — y compris un que vous êtes sur le point d’acheter à un particulier, pas seulement une annonce Sawa — dans un centre pour l’inspection complète en 150 points. Payée sur place ; le rapport vous revient dans tous les cas.',
    reportTitle: 'Revente du rapport',
    reportBody:
      'Un véhicule a déjà été inspecté et vous voulez le même rapport — en tant que second acheteur, ou vendeur souhaitant sa propre copie. Payez une fois pour y accéder plutôt que de payer une nouvelle inspection.',
    rentalTitle: 'Abonnement d’annonce de location',
    rentalBody:
      'Par véhicule, par mois, pour qu’un loueur vérifié garde une voiture visible dans le parc de location. Les locataires ne paient jamais pour parcourir ou envoyer une demande.',
    reviewedNote: 'Tarifs revus pour la dernière fois le {{date}}.',
    disclaimer:
      'Ce sont des frais pour les propres services d’inspection et d’annonce de Sawa Cars, payés ou enregistrés à notre bureau — jamais des frais de transaction sur le marché. Sawa Cars n’est partie à aucune vente ni location ; acheteurs, vendeurs et locataires conviennent eux-mêmes du prix, du paiement et des conditions.',
    bookInspection: 'Réserver une inspection sur place',
    browseCars: 'Parcourir les voitures inspectées',
  },
} as const

const sw = {
  hub: {
    metaTitle: 'Zana za bure za kukadiria thamani, ufadhili na ushuru wa kuagiza gari kwa Rwanda',
    metaDescription:
      'Vikokotoo vya bure kwa yeyote anayenunua, kuuza au kuagiza gari nchini Rwanda: ukadiriaji wa soko kutoka mauzo halisi ya Sawa Cars, mchanganuo kamili wa ushuru wa kuagiza wa RRA, na kadirio la malipo ya kila mwezi.',
    ogTitle: 'Zana za bure za magari · {{site}}',
    ogDescription:
      'Vikokotoo vya kukadiria thamani, ushuru wa kuagiza wa RRA na ufadhili kwa soko la Rwanda. Bila akaunti.',
    eyebrow: 'Zana',
    title: 'Kokotoa namba kabla ya kujitolea',
    lede: 'Vikokotoo vitatu vilivyotengenezwa kwa soko la Rwanda. Hakuna akaunti, hakuna namba ya simu, hakuna simu ya kufuatilia — vipo hapa kwa sababu mnunuzi au muuzaji anayeelewa namba hufanya uamuzi bora.',
    open: 'Fungua',
    valuationMeta: 'Kwa wauzaji',
    valuationTitle: 'Ukadiriaji wa bure',
    valuationBody:
      'Thamani ya gari lako leo, ikilinganishwa na magari yaliyotangazwa na kuuzwa kwa hakika kwenye Sawa Cars. Kama hakuna magari ya kutosha ya kulinganisha, tunasema hivyo badala ya kubahatisha.',
    dutyMeta: 'Kwa waagizaji',
    dutyTitle: 'Kikokotoo cha ushuru wa kuagiza',
    dutyBody:
      'Mchanganuo kamili wa RRA kwa gari lililoagizwa — thamani ya CIF, forodha, ushuru wa bidhaa kulingana na ukubwa wa injini, VAT na tozo la miundombinu — vyote kwa RWF.',
    financeMeta: 'Kwa wanunuzi',
    financeTitle: 'Kikokotoo cha ufadhili',
    financeBody:
      'Malipo ya kila mwezi kutoka bei ya gari, au bei ya gari ambayo bajeti yako ya kila mwezi inaweza kumudu. Kianzio, muda na riba yote imejumuishwa.',
    pricingMeta: 'Tunachotoza',
    pricingTitle: 'Bei',
    pricingBody:
      'Sawa Cars inatoza nini kwa uhalisia: ukaguzi kituoni, ripoti iliyouzwa tena, usajili wa tangazo la kukodisha. Kutafuta na kuwasiliana na wauzaji ni bure.',
  },

  financePage: {
    metaTitle: 'Kikokotoo cha ufadhili wa gari',
    metaDescription:
      'Kadiria malipo ya kila mwezi ya mkopo wa gari mjini Kigali, au fanya kinyume kutoka kile unachoweza kumudu kila mwezi. Kianzio, muda na riba yote, vyote kwa RWF.',
    ogTitle: 'Kikokotoo cha ufadhili wa gari',
    ogDescription:
      'Malipo ya kila mwezi, kianzio na riba yote ya mkopo wa gari mjini Kigali — au bei ya gari ambayo bajeti yako ya kila mwezi inaweza kumudu.',
    heroEyebrow: 'Zana ya bure',
    heroTitle: 'Kikokotoo cha ufadhili wa gari',
    heroLede:
      'Njia mbili za swali moja. Anza na gari uliolipata uone malipo ya kila mwezi, au anza na kile unachoweza kulipa kila mwezi uone ni magari gani hilo linafikia.',
    estimateTitle: 'Kadiria malipo',
    estimateDescription:
      'Kimekokotolewa kwa {{rate}}% kwa mwaka — kiwango kinachowakilisha mikopo ya magari mjini Kigali, na kiwango kilekile kilicho nyuma ya takwimu ya kila mwezi kwenye kila kadi ya tangazo.',
    beforeEyebrow: 'Kabla ya kwenda benki',
    beforeTitle: 'Mambo matatu yatakayobadilisha namba hii',
    beforeDescription:
      'Sawa Cars haikopeshi na haichukui kamisheni kutoka kwa mkopeshaji yeyote. Zana hii ipo ili uingie benki ukijua takribani cha kutarajia.',
    rateTitle: 'Kiwango chako ni cha binafsi',
    rateBody:
      '{{rate}}% kwa mwaka ni kiwango cha kumbukumbu cha soko, si nukuu. Benki hupanga kulingana na mapato yako, ajira yako na historia yako nazo, na kiwango wanachokupa kinaweza kuwa juu au chini yake.',
    feesTitle: 'Ada hazimo humu',
    feesBody:
      'Ada za mpangilio, ada za ukadiriaji na bima ya kina inayohitajika na wakopeshaji wengi hutozwa kando. Kwa kawaida huongezwa kwenye takwimu ya kila mwezi badala ya bei.',
    termTitle: 'Muda mrefu hugharimu zaidi',
    termBody:
      'Kunyoosha mkopo uleule kwa miezi mingi hupunguza malipo na kuongeza riba yote. Linganisha mstari wa "jumla unayolipa", si tu wa kila mwezi.',
    closeTitle: 'Ufadhili hupangwa nje ya Sawa Cars',
    closeBody:
      'Kikokotoo hiki ni cha taarifa. Thibitisha mkopo wowote moja kwa moja na benki na ukubaliane kuhusu mpokeaji wa malipo, uhamishaji wa umiliki, uwasilishaji na masharti ya mauzo yaliyoandikwa moja kwa moja na muuzaji. Sawa Cars haipokei fedha wala haidhamini muamala.',
    browse: 'Angalia magari yaliyothibitishwa',
    howBuying: 'Jinsi ununuzi unavyofanya kazi',
  },

  financeCalc: {
    yourNumbers: 'Namba zako',
    startFrom: 'Anza na',
    fromPrice: 'Kutoka bei',
    fromBudget: 'Kutoka bajeti',
    months: 'miezi {{months}}',
    standard: 'kawaida',
    repaymentTerm: 'Muda wa kulipa',
    carPrice: 'Bei ya gari',
    carPriceHint: 'Bei inayoombwa kwenye tangazo.',
    monthlyBudget: 'Bajeti ya kila mwezi',
    monthlyBudgetHint: 'Kile unachoweza kulipa kwa raha kila mwezi.',
    deposit: 'Kianzio',
    depositHint: 'Benki za Kigali kwa kawaida huhitaji {{pct}}% ya kianzio. Hadi {{max}}%.',
    estimatedRepayment: 'Malipo yaliyokadiriwa',
    whatYouCanAfford: 'Kile unachoweza kumudu',
    placeholderPrice:
      'Weka bei ya gari uone malipo ya kila mwezi, kianzio na gharama yote ya mkopo.',
    placeholderBudget: 'Weka kile unachoweza kulipa kila mwezi uone bei ya gari inayowezekana.',
    overMonths: 'Kwa miezi {{months}} kwa {{rate}}% kwa mwaka',
    perMonth: '{{amount}}/mwezi',
    standardNote:
      'Kwa masharti ya kawaida ya {{deposit}}% kwa miezi {{months}} yangekuwa {{amount}}/mwezi — takwimu inayoonyeshwa kwenye kadi za matangazo.',
    depositRow: 'Kianzio',
    depositRowHint: '{{pct}}% ya bei, kinacholipwa kituoni',
    amountFinanced: 'Kiasi kilichofadhiliwa',
    interestRow: 'Riba kwa muda wote',
    interestHint: 'Kwa kiwango kinachowakilisha kilicho hapa chini',
    totalYouPay: 'Jumla unayolipa',
    totalHint: 'Kianzio pamoja na kila malipo',
    browseUpTo: 'Angalia magari yaliyothibitishwa hadi {{amount}}',
    payingMonth: 'Kulipa {{amount}} kwa mwezi kwa miezi {{months}}',
    upTo: 'Hadi {{amount}}',
    budgetNote: 'Inachukulia kianzio cha {{deposit}}% kwa {{rate}}% kwa mwaka.',
    depositNeeded: 'Kianzio utakachohitaji',
    depositNeededHint: '{{pct}}% ya bei ya gari',
    liveResultPrice: 'Imekadiriwa {{amount}} kwa mwezi kwa miezi {{months}}.',
    liveResultBudget: 'Bajeti ya {{amount}} kwa mwezi inaweza kumudu gari hadi {{max}}.',
    disclaimer:
      'Sawa Cars haikopeshi wala haipangi ufadhili. {{rate}}% kwa mwaka ni kiwango cha soko kinachowakilisha Kigali — benki yako hupanga chake kulingana na wasifu wako, na kwa kawaida huongeza ada za mpangilio na bima inayohitajika juu yake. Ichukulie kama mahali pa kuanzia mazungumzo hayo.',
  },

  dutyPage: {
    metaTitle: 'Kikokotoo cha ushuru wa kuagiza cha Rwanda',
    metaDescription:
      'Kadiria ushuru wa kuagiza wa RRA kwa gari lililoletwa Rwanda: thamani ya CIF, ushuru wa forodha, ushuru wa bidhaa kulingana na ukubwa wa injini, VAT na tozo la miundombinu — vyote kwa RWF.',
    ogTitle: 'Kikokotoo cha ushuru wa kuagiza cha Rwanda',
    ogDescription:
      'Forodha, ushuru wa bidhaa, VAT na tozo la miundombinu kwa gari lililoagizwa — mchanganuo kamili wa RRA kwa RWF.',
    heroEyebrow: 'Zana ya bure',
    heroTitle: 'Kikokotoo cha ushuru wa kuagiza cha Rwanda',
    heroLede:
      'Magari mengi nchini Rwanda huagizwa, kwa hivyo bei ya nje ni nusu tu ya swali. Kokotoa kile RRA itakachoongeza — forodha, ushuru wa bidhaa, VAT na tozo la miundombinu — kabla ya kujitolea kwa gari usilotaona.',
    landedTitle: 'Kokotoa gharama ya kufikisha',
    landedDescription:
      'Weka kile ungemlipa muuzaji wa nje na uchague ukubwa wa injini. Mchanganuo hujisasisha unapoandika.',
    chainEyebrow: 'Jinsi kinavyojengwa',
    chainTitle: 'Ushuru hutozwa kwa mnyororo',
    chainDescription:
      'Kila hatua hukokotolewa juu ya iliyotangulia, ndiyo maana jumla hupanda kwa kasi zaidi ya watu wanavyotarajia. Asilimia zinazoonyeshwa dhidi ya kila mstari kwenye mchanganuo hutoka katika kokotoo lilelile, si kutoka ukurasa huu.',
    cifTitle: 'Thamani ya CIF',
    cifBody:
      'Kila kitu huanzia hapa: bei unayomlipa muuzaji wa nje pamoja na gharama ya kufikisha gari Rwanda — usafirishaji na bima. Ushuru hutozwa juu ya takwimu hii, si juu ya ankara yako pekee.',
    customsTitle: 'Ushuru wa forodha',
    customsBody:
      'Ushuru wa nje wa Jumuiya ya Afrika Mashariki, unaotozwa kama asilimia ya thamani ya CIF. Ni uleule kwa kila gari lililoagizwa bila kujali ukubwa wa injini.',
    exciseTitle: 'Ushuru wa bidhaa',
    exciseBody:
      'Tozo pekee linalobadilika na gari. Injini kubwa huvutia kiwango cha juu, ndiyo maana SUV ya lita 3.0 na sedan ya lita 1.5 za thamani sawa hufikia jumla tofauti sana.',
    vatTitle: 'VAT',
    vatBody:
      'Hutozwa juu ya thamani ya CIF pamoja na forodha na ushuru wa bidhaa kwa pamoja — kwa hivyo VAT hulipwa juu ya tozo pamoja na gari. Hii ndiyo hatua ambayo watu wengi huiacha katika hesabu zao.',
    infraTitle: 'Tozo la miundombinu',
    infraBody:
      'Asilimia ndogo ya CIF, inayoongezwa juu. Ni ndogo ikilinganishwa na nyingine lakini si sifuri.',
    limitsEyebrow: 'Soma haya kabla ya kupanga bajeti',
    limitsTitle: 'Kile kikokotoo hiki kisichoweza kujua',
    limitsDescription:
      'Ni takwimu ya kupanga. Chukua pengo kati yake na tathmini halisi kama hatari unayobeba.',
    rraTitle: 'RRA hukadiria gari lenyewe',
    rraBody:
      'Tathmini hufanywa dhidi ya thamani ya RRA yenyewe ya gari, ambayo inaweza kuwa juu au chini ya bei kwenye ankara yako. Bei yako ya kununua ni pembejeo, si jibu.',
    ageTitle: 'Umri na hali hulisogeza',
    ageBody:
      'Mapunguzo ya uchakavu, mwaka wa utengenezaji na aina ya mwili vyote huathiri thamani inayokadiriwa. Magari mawili yaliyonunuliwa kwa fedha sawa yanaweza kutozwa jumla tofauti.',
    clearingTitle: 'Gharama za kutoa forodha huja juu',
    clearingBody:
      'Utunzaji bandarini, usafiri kutoka Dar es Salaam au Mombasa, ada za wakala wa forodha, usajili na bima ya kwanza vyote ni halisi na hakuna hata kimoja kilicho katika takwimu hii.',
    altTitle: 'Au nunua gari ambalo tayari limefika',
    altBody:
      'Kila gari kwenye Sawa Cars tayari liko Rwanda, ushuru umelipwa. Nyaraka zake — pamoja na mhuri wa ushuru wa RRA — huthibitishwa wakati wa ukaguzi wa pointi 150 na kuchapishwa kwenye tangazo, hivyo bei unayoiona ndiyo bei unayolipa.',
    browse: 'Angalia magari yaliyothibitishwa',
    financeCalc: 'Kikokotoo cha ufadhili',
  },

  dutyCalc: {
    ageUnder2: 'Chini ya miaka 2',
    noAllowance: 'Hakuna punguzo',
    age2to4: 'Miaka 2 – 4',
    age4to6: 'Miaka 4 – 6',
    age6to8: 'Miaka 6 – 8',
    age8to10: 'Miaka 8 – 10',
    ageOver10: 'Zaidi ya miaka 10',
    exciseWord: '{{pct}}% ushuru wa bidhaa',
    theVehicle: 'Gari',
    purchasePrice: 'Bei ya kununua',
    purchasePriceHint: 'Kile unacholipa kwa gari kabla ya usafirishaji, kimewekwa kwa RWF.',
    engineSize: 'Ukubwa wa injini',
    vehicleAge: 'Umri wa gari',
    note: 'Ushuru wa bidhaa hubadilika na ukubwa wa injini, na gari kongwe hukadiriwa kwa thamani iliyopunguzwa chini ya ratiba ya uchakavu ya EAC. Kila kitu kingine hutozwa kwa njia sawa kwa kila gari lililoagizwa.',
    estimatedLanded: 'Gharama ya kufikisha iliyokadiriwa',
    landedLabel: 'Bei ya kununua pamoja na ushuru na kodi',
    landedNote: 'Ushuru huongeza {{pct}}% juu ya kile unacholipa muuzaji wa nje.',
    assessedValue: 'Thamani iliyokadiriwa kwa ushuru',
    assessedHint: 'Punguzo la uchakavu la {{pct}}% kwa umri wa gari',
    cifValue: 'Thamani ya CIF',
    cifHint: 'Thamani iliyokadiriwa pamoja na {{pct}} ya usafirishaji na bima',
    customsDuty: 'Ushuru wa forodha',
    customsHint: '{{pct}} ya CIF',
    exciseDuty: 'Ushuru wa bidhaa',
    exciseHint: '{{pct}}% ya CIF pamoja na forodha — huwekwa na ukubwa wa injini',
    vat: 'VAT',
    vatHint: '{{pct}} ya CIF pamoja na forodha na ushuru wa bidhaa',
    withholding: 'Kodi ya makato',
    withholdingHint: '{{pct}} ya CIF',
    infra: 'Tozo la miundombinu',
    infraHint: '{{pct}} ya CIF',
    totalDuties: 'Jumla ya ushuru na kodi',
    disclaimer:
      'Ni kadirio la kupanga. RRA hukadiria ushuru dhidi ya tathmini yake yenyewe ya gari, ambayo inaweza kutofautiana na ankara yako — umri, aina ya mwili na hali vyote husogeza takwimu. Tathmini wakati wa kutoa forodha ndiyo inayohesabika.',
    ratesReviewed: 'Viwango vilikaguliwa mara ya mwisho {{date}}.',
    compareBtn: 'Linganisha na magari yaliyo tayari Rwanda',
    placeholder:
      'Weka bei ya kununua uone mchanganuo kamili — CIF, forodha, ushuru wa bidhaa, VAT na kodi ya makato na tozo la miundombinu.',
    liveResult:
      'Gharama ya kufikisha iliyokadiriwa {{total}}, ambapo {{duties}} ni ushuru na kodi.',
  },

  valuationPage: {
    metaTitle: 'Ukadiriaji wa bure wa gari',
    metaDescription:
      'Gari lako lina thamani gani Kigali leo? Ukadiriaji wa soko wa bure ulioandaliwa kutoka magari yaliyotangazwa na kuuzwa kwa hakika kwenye Sawa Cars — kamwe si jedwali la kutafuta. Bila akaunti.',
    ogTitle: 'Ukadiriaji wa bure wa gari — Sawa Cars',
    heroEyebrow: 'Zana ya bure',
    heroTitle: 'Gari lako lina thamani gani leo?',
    heroLede:
      'Umeandaliwa kutoka magari yaliyotangazwa na kuuzwa kwa hakika kwenye Sawa Cars — kamwe si jedwali la kutafuta. Pale ambapo hatuna magari ya kutosha ya kulinganisha ili tuwe na uhakika, tunasema hivyo badala ya kubuni takwimu.',
  },

  valuationTool: {
    yourCar: 'Gari lako',
    make: 'Chapa',
    makeHint: 'Anza kuandika — tunapendekeza chapa tulizonazo tayari kwenye tovuti.',
    year: 'Mwaka',
    mileage: 'Umbali uliosafiri',
    mileageHint: 'Si lazima. Ukiacha wazi, tunakadiria kwa {{km}}.',
    checking: 'Tunaangalia soko…',
    getValuation: 'Pata ukadiriaji wangu',
    noAccount: 'Hakuna akaunti, hakuna namba ya simu. Hatukupigii simu baadaye.',
    whatWorth: 'Thamani yake',
    notEnoughTitle: 'Bado hakuna magari ya kutosha ya kulinganisha',
    notEnoughBody:
      '{{message}}. Tunakadiria kutoka magari yaliyotangazwa au kuuzwa kwa hakika kwenye Sawa Cars, kwa hivyo chapa na mwaka ambao bado hatujaushughulikia hupata hakuna takwimu badala ya kubahatisha.',
    inspectionStill:
      'Ukaguzi bado hukuambia gari lako {{make}} liko wapi. Timu yetu hulikadiria dhidi ya soko siku linapothibitishwa, na uamuzi wa mwisho unabaki kwako.',
    errorTitle: 'Hatukuweza kufanya ukadiriaji huo',
    placeholder:
      'Weka chapa na mwaka uone magari yanayolingana kwenye Sawa Cars yanauzwa kwa bei gani.',
    liveOk:
      'Kadirio la mfululizo {{low}} hadi {{high}}, kwa msingi wa magari {{comparables}} yanayolingana.',
    liveEmpty: 'Hakuna magari ya kutosha ya kulinganisha kwa chapa na mwaka huo.',
    carLabel: '{{make}} ya {{year}}',
    adjusted: 'Imerekebishwa kulingana na umbali uliouweka.',
    valuedAt: 'Imekadiriwa kwa rejea yetu ya {{km}} — ongeza umbali wako kwa mfululizo wa karibu zaidi.',
    avgPrice: 'Bei ya wastani ya magari hayo',
    avgHint: '{{make}}, {{from}}–{{to}}',
    pricesSeen: 'Bei zilizoonekana kwa hakika',
    pricesSeenHint: 'Ya chini na ya juu ya kundi lilelile',
    comparablesUsed: 'Magari yanayolingana yaliyotumika',
    comparablesHint: 'Yaliyotangazwa au kuuzwa kwenye Sawa Cars',
    estimateNote:
      'Hili ni kadirio la soko, si ofa. Bei ya mwisho inayoombwa ni yako — tunaithibitisha nawe baada ya ukaguzi wa pointi 150, tunapojua hali halisi ya gari.',
    submitBtn: 'Wasilisha gari hili kwa ukaguzi',
    submissionHint: 'Uwasilishaji huanza na uthibitisho wa utambulisho wa mara moja, unaofanyika ndani ya programu.',
    orWhatsApp: 'Au tuandikie kwa WhatsApp',
  },

  pricingPage: {
    metaTitle: 'Bei za Sawa Cars — ukaguzi, ripoti na usajili wa kukodisha',
    metaDescription:
      'Sawa Cars inatoza nini kwa ukaguzi wa gari kituoni, nakala ya ripoti iliyopo, na usajili wa tangazo la kukodisha. Kutafuta, kununua, kuuza na kuwasiliana na muuzaji aliyethibitishwa ni bure.',
    ogTitle: 'Bei za Sawa Cars',
    heroEyebrow: 'Bei',
    heroTitle: 'Tunachotoza kwa uhalisia',
    heroLede:
      'Kutafuta, kununua, kuuza na kuwasiliana na muuzaji aliyethibitishwa ni bure. Hizi ni huduma zinazolipiwa: ukaguzi huru, nakala ya ripoti iliyopo, na kuendelea kuonyesha gari la kukodisha.',
    inspectionTitle: 'Ukaguzi kituoni',
    inspectionBody:
      'Leta gari lolote — ikiwa ni pamoja na lile unalokaribia kununua kutoka kwa mtu mwingine, si tu tangazo la Sawa — kituoni kwa ajili ya ukaguzi kamili wa pointi 150. Inalipwa kituoni; ripoti ni yako kwa hali yoyote.',
    reportTitle: 'Uuzaji wa ripoti',
    reportBody:
      'Gari tayari limekaguliwa na unataka ripoti hiyo hiyo — kama mnunuzi wa pili, au muuzaji anayetaka nakala yake mwenyewe. Lipa mara moja badala ya ukaguzi mpya.',
    rentalTitle: 'Usajili wa tangazo la kukodisha',
    rentalBody:
      'Kwa gari moja, kwa mwezi, ili mtoa huduma wa kukodisha aliyethibitishwa aendelee kuonyesha gari kwenye orodha ya kukodisha. Wakodishaji hawalipi kutafuta au kuuliza.',
    reviewedNote: 'Bei zilipitiwa mara ya mwisho {{date}}.',
    disclaimer:
      'Haya ni malipo kwa huduma za Sawa Cars mwenyewe za ukaguzi na tangazo, yanayolipwa au kuandikwa kituoni kwetu — si ada ya muamala wa sokoni. Sawa Cars si upande katika mauzo au ukodishaji wowote; wanunuzi, wauzaji na wakodishaji hukubaliana wenyewe bei, malipo na masharti.',
    bookInspection: 'Panga ukaguzi kituoni',
    browseCars: 'Tazama magari yaliyokaguliwa',
  },
} as const

const ko = {
  hub: {
    metaTitle: '르완다를 위한 무료 차량 시세, 금융, 수입 관세 도구',
    metaDescription:
      '르완다에서 차량을 구매, 판매 또는 수입하는 누구에게나 유용한 무료 계산기: Sawa Cars의 실제 판매 데이터에 기반한 시세 평가, RRA 수입 관세 전체 내역, 월 금융 견적.',
    ogTitle: '무료 차량 도구 · {{site}}',
    ogDescription:
      '르완다 시장을 위한 시세 평가, RRA 수입 관세, 금융 계산기입니다. 계정이 필요 없습니다.',
    eyebrow: '도구',
    title: '결정하기 전에 숫자를 계산하세요',
    lede: '르완다 시장을 위해 만든 세 가지 계산기입니다. 계정도, 전화번호도, 후속 전화도 없습니다 — 숫자를 이해하는 구매자와 판매자가 더 나은 결정을 내리기 때문에 여기 있습니다.',
    open: '열기',
    valuationMeta: '판매자용',
    valuationTitle: '무료 시세 평가',
    valuationBody:
      'Sawa Cars에 실제로 등록되고 판매된 차량과 비교한 오늘 당신 차의 가치입니다. 비교할 만한 차량이 충분하지 않으면 추측하는 대신 그렇다고 말씀드립니다.',
    dutyMeta: '수입자용',
    dutyTitle: '수입 관세 계산기',
    dutyBody:
      '수입 차량에 대한 RRA 전체 내역 — CIF, 관세, 배기량별 특별소비세, VAT, 인프라 부담금 — 전부 RWF 기준입니다.',
    financeMeta: '구매자용',
    financeTitle: '금융 계산기',
    financeBody:
      '차량 가격으로부터의 월 상환액, 또는 월 예산으로 감당할 수 있는 차량 가격입니다. 계약금, 기간, 총이자가 포함됩니다.',
    pricingMeta: '요금 안내',
    pricingTitle: '요금',
    pricingBody:
      'Sawa Cars가 실제로 부과하는 요금입니다: 워크인 검사, 보고서 재구매, 렌트 등록 구독. 둘러보기와 판매자 연락은 무료입니다.',
  },

  financePage: {
    metaTitle: '차량 금융 계산기',
    metaDescription:
      '키갈리에서 차량 대출의 월 상환액을 추정하거나, 매달 감당할 수 있는 금액에서 거꾸로 계산해 보세요. 계약금, 기간, 총이자 모두 RWF 기준입니다.',
    ogTitle: '차량 금융 계산기',
    ogDescription:
      '키갈리 차량 대출의 월 상환액, 계약금, 총이자 — 또는 월 예산으로 감당할 수 있는 차량 가격입니다.',
    heroEyebrow: '무료 도구',
    heroTitle: '차량 금융 계산기',
    heroLede:
      '같은 질문에 접근하는 두 가지 방법입니다. 찾은 차량에서 시작해 월 납입액을 보거나, 매달 낼 수 있는 금액에서 시작해 어떤 차량이 가능한지 확인하세요.',
    estimateTitle: '상환액 추정하기',
    estimateDescription:
      '연 {{rate}}%로 계산했습니다 — 키갈리 차량 대출의 대표적인 금리이며, 모든 매물 카드의 월 금액 뒤에 있는 것과 같은 금리입니다.',
    beforeEyebrow: '은행에 가기 전에',
    beforeTitle: '이 숫자를 바꿀 세 가지',
    beforeDescription:
      'Sawa Cars는 대출을 하지 않으며 어떤 대출 기관으로부터도 수수료를 받지 않습니다. 이 도구는 은행에 갈 때 대략 무엇을 예상할지 알고 가도록 하기 위해 있습니다.',
    rateTitle: '금리는 개인마다 다릅니다',
    rateBody:
      '연 {{rate}}%는 견적이 아니라 시장 기준점입니다. 은행은 당신의 소득, 직업, 거래 이력에 따라 금리를 책정하며, 제시하는 금리는 이보다 높을 수도 낮을 수도 있습니다.',
    feesTitle: '수수료는 여기에 포함되지 않습니다',
    feesBody:
      '취급 수수료, 감정 수수료, 대부분의 대출 기관이 요구하는 종합 보험은 별도로 청구됩니다. 보통 가격이 아니라 월 금액에 더해집니다.',
    termTitle: '기간이 길수록 더 비쌉니다',
    termBody:
      '같은 대출을 더 많은 개월로 늘리면 납입액은 낮아지지만 총이자는 커집니다. 월 납입액만이 아니라 "총 납입액" 항목을 비교하세요.',
    closeTitle: '금융은 Sawa Cars 외부에서 진행됩니다',
    closeBody:
      '이 계산기는 정보 제공용입니다. 대출은 은행과 직접 확인하고, 대금 수취인, 소유권 이전, 인도, 서면 매매 조건은 판매자와 직접 합의하세요. Sawa Cars는 자금을 수령하지 않으며 거래를 보증하지 않습니다.',
    browse: '인증 차량 둘러보기',
    howBuying: '구매 방법',
  },

  financeCalc: {
    yourNumbers: '당신의 숫자',
    startFrom: '시작 기준',
    fromPrice: '가격에서',
    fromBudget: '예산에서',
    months: '{{months}}개월',
    standard: '표준',
    repaymentTerm: '상환 기간',
    carPrice: '차량 가격',
    carPriceHint: '매물에 표시된 호가입니다.',
    monthlyBudget: '월 예산',
    monthlyBudgetHint: '매달 부담 없이 낼 수 있는 금액입니다.',
    deposit: '계약금',
    depositHint: '키갈리의 은행은 보통 {{pct}}%의 계약금을 요구합니다. 최대 {{max}}%까지.',
    estimatedRepayment: '예상 상환액',
    whatYouCanAfford: '감당 가능한 금액',
    placeholderPrice:
      '차량 가격을 입력하면 월 납입액, 계약금, 대출 총비용을 볼 수 있습니다.',
    placeholderBudget: '매달 낼 수 있는 금액을 입력하면 감당 가능한 차량 가격을 볼 수 있습니다.',
    overMonths: '연 {{rate}}%로 {{months}}개월 동안',
    perMonth: '{{amount}}/월',
    standardNote:
      '표준인 {{deposit}}% 계약금에 {{months}}개월로 하면 {{amount}}/월이 됩니다 — 매물 카드에 표시되는 금액입니다.',
    depositRow: '계약금',
    depositRowHint: '가격의 {{pct}}%, 센터에서 납부',
    amountFinanced: '대출 금액',
    interestRow: '기간 동안의 이자',
    interestHint: '아래 대표 금리 기준',
    totalYouPay: '총 납입액',
    totalHint: '계약금과 모든 상환액 합계',
    browseUpTo: '{{amount}}까지 인증 차량 둘러보기',
    payingMonth: '{{months}}개월 동안 매달 {{amount}} 납입',
    upTo: '최대 {{amount}}',
    budgetNote: '연 {{rate}}%로 {{deposit}}% 계약금을 가정합니다.',
    depositNeeded: '필요한 계약금',
    depositNeededHint: '차량 가격의 {{pct}}%',
    liveResultPrice: '{{months}}개월 동안 매달 약 {{amount}}로 추정됩니다.',
    liveResultBudget: '월 {{amount}} 예산으로 최대 {{max}}까지의 차량이 가능합니다.',
    disclaimer:
      'Sawa Cars는 대출을 하지 않으며 금융을 주선하지 않습니다. 연 {{rate}}%는 키갈리의 대표적인 시장 금리입니다 — 은행은 당신의 프로필에 따라 자체 금리를 정하며, 보통 취급 수수료와 필수 보험을 그 위에 더합니다. 이를 그 대화를 위한 출발점으로 삼으세요.',
  },

  dutyPage: {
    metaTitle: '르완다 수입 관세 계산기',
    metaDescription:
      '르완다로 반입되는 차량의 RRA 수입 관세를 추정하세요: CIF 가치, 관세, 배기량별 특별소비세, VAT, 인프라 부담금 — 전부 RWF 기준입니다.',
    ogTitle: '르완다 수입 관세 계산기',
    ogDescription:
      '수입 차량에 대한 관세, 특별소비세, VAT, 인프라 부담금 — RWF로 된 RRA 전체 내역입니다.',
    heroEyebrow: '무료 도구',
    heroTitle: '르완다 수입 관세 계산기',
    heroLede:
      '르완다의 차량은 대부분 수입되므로 해외 표시 가격은 질문의 절반에 불과합니다. 보지 못한 차량에 결정하기 전에 RRA가 더할 금액 — 관세, 특별소비세, VAT, 인프라 부담금 — 을 계산하세요.',
    landedTitle: '반입 비용 계산하기',
    landedDescription:
      '수출자에게 지불할 금액을 입력하고 배기량을 선택하세요. 입력하는 대로 내역이 갱신됩니다.',
    chainEyebrow: '어떻게 구성되는가',
    chainTitle: '관세는 사슬처럼 부과됩니다',
    chainDescription:
      '각 단계는 이전 단계 위에서 계산되며, 그래서 총액이 사람들의 예상보다 빠르게 오릅니다. 내역의 각 항목 옆에 표시된 백분율은 이 페이지가 아니라 같은 계산에서 나옵니다.',
    cifTitle: 'CIF 가치',
    cifBody:
      '모든 것이 여기서 시작됩니다: 수출자에게 지불하는 가격에 차량을 르완다로 들여오는 비용 — 운임과 보험 — 을 더한 값입니다. 관세는 당신의 송장만이 아니라 이 금액에 부과됩니다.',
    customsTitle: '관세',
    customsBody:
      '동아프리카공동체 대외 관세로, CIF 가치의 백분율로 부과됩니다. 배기량과 관계없이 모든 수입 차량에 동일합니다.',
    exciseTitle: '특별소비세',
    exciseBody:
      '차량에 따라 달라지는 유일한 부과금입니다. 배기량이 클수록 높은 세율이 적용되며, 그래서 같은 가치의 3.0리터 SUV와 1.5리터 세단이 매우 다른 총액에 도달합니다.',
    vatTitle: 'VAT',
    vatBody:
      'CIF 가치에 관세와 특별소비세를 합한 값에 부과됩니다 — 그래서 VAT는 차량뿐 아니라 관세에도 붙습니다. 대부분의 사람이 자기 계산에서 빠뜨리는 단계입니다.',
    infraTitle: '인프라 부담금',
    infraBody:
      'CIF의 작은 백분율로, 위에 더해집니다. 다른 것들에 비하면 작지만 0은 아닙니다.',
    limitsEyebrow: '예산을 세우기 전에 읽으세요',
    limitsTitle: '이 계산기가 알 수 없는 것',
    limitsDescription:
      '계획용 수치입니다. 이 값과 실제 산정액의 차이를 당신이 감수하는 위험으로 여기세요.',
    rraTitle: 'RRA는 차량 자체를 평가합니다',
    rraBody:
      '산정은 RRA 자체의 차량 평가액을 기준으로 이루어지며, 이는 당신의 송장 가격보다 높거나 낮을 수 있습니다. 당신의 구매 가격은 입력값이지 답이 아닙니다.',
    ageTitle: '연식과 상태가 값을 바꿉니다',
    ageBody:
      '감가상각 공제, 제조 연도, 차체 유형 모두 산정 가치에 영향을 미칩니다. 같은 돈으로 산 두 차량이 서로 다른 총액으로 통관될 수 있습니다.',
    clearingTitle: '통관 비용이 위에 더해집니다',
    clearingBody:
      '항만 하역, 다르에스살람이나 몸바사로부터의 운송, 통관 대리인 수수료, 등록, 첫 보험 모두 실제 비용이며 어느 것도 이 수치에 포함되지 않습니다.',
    altTitle: '아니면 이미 도착한 차량을 사세요',
    altBody:
      'Sawa Cars의 모든 차량은 이미 르완다에 있으며 관세가 완납되었습니다. RRA 관세 스탬프를 포함한 서류가 150포인트 점검 중에 확인되어 매물에 게시되므로, 보이는 가격이 지불하는 가격입니다.',
    browse: '인증 차량 둘러보기',
    financeCalc: '금융 계산기',
  },

  dutyCalc: {
    ageUnder2: '2년 미만',
    noAllowance: '공제 없음',
    age2to4: '2 – 4년',
    age4to6: '4 – 6년',
    age6to8: '6 – 8년',
    age8to10: '8 – 10년',
    ageOver10: '10년 초과',
    exciseWord: '특별소비세 {{pct}}%',
    theVehicle: '차량',
    purchasePrice: '구매 가격',
    purchasePriceHint: '운송 전 차량에 지불하는 금액으로, RWF로 입력합니다.',
    engineSize: '배기량',
    vehicleAge: '차량 연식',
    note: '특별소비세는 배기량에 따라 달라지며, 오래된 차량은 EAC 감가상각 기준에 따라 낮춰진 가치로 산정됩니다. 그 밖의 모든 것은 모든 수입 차량에 동일하게 부과됩니다.',
    estimatedLanded: '예상 반입 비용',
    landedLabel: '구매 가격에 관세와 세금을 더한 값',
    landedNote: '관세가 수출자에게 지불하는 금액 위에 {{pct}}%를 더합니다.',
    assessedValue: '관세 산정 가치',
    assessedHint: '차량 연식에 대한 {{pct}}% 감가상각 공제',
    cifValue: 'CIF 가치',
    cifHint: '산정 가치에 운임과 보험 {{pct}}%를 더한 값',
    customsDuty: '관세',
    customsHint: 'CIF의 {{pct}}',
    exciseDuty: '특별소비세',
    exciseHint: 'CIF에 관세를 더한 값의 {{pct}}% — 배기량으로 결정',
    vat: 'VAT',
    vatHint: 'CIF에 관세와 특별소비세를 더한 값의 {{pct}}',
    withholding: '원천징수세',
    withholdingHint: 'CIF의 {{pct}}',
    infra: '인프라 부담금',
    infraHint: 'CIF의 {{pct}}',
    totalDuties: '관세 및 세금 총액',
    disclaimer:
      '계획을 위한 추정치입니다. RRA는 자체의 차량 평가액을 기준으로 관세를 산정하며, 이는 당신의 송장과 다를 수 있습니다 — 연식, 차체 유형, 상태 모두 수치를 움직입니다. 통관 시의 산정액이 실제로 적용되는 값입니다.',
    ratesReviewed: '세율 최종 검토일 {{date}}.',
    compareBtn: '이미 르완다에 있는 차량과 비교하기',
    placeholder:
      '구매 가격을 입력하면 전체 내역 — CIF, 관세, 특별소비세, VAT, 원천징수세, 인프라 부담금 — 을 볼 수 있습니다.',
    liveResult:
      '예상 반입 비용 {{total}}, 그중 {{duties}}가 관세와 세금입니다.',
  },

  valuationPage: {
    metaTitle: '무료 차량 시세 평가',
    metaDescription:
      '오늘 키갈리에서 당신 차의 가치는 얼마일까요? Sawa Cars에 실제로 등록되고 판매된 차량으로 산정한 무료 시세 평가입니다 — 조회표가 아닙니다. 계정이 필요 없습니다.',
    ogTitle: '무료 차량 시세 평가 — Sawa Cars',
    heroEyebrow: '무료 도구',
    heroTitle: '오늘 당신 차의 가치는 얼마일까요?',
    heroLede:
      'Sawa Cars에 실제로 등록되고 판매된 차량으로 산정합니다 — 조회표가 아닙니다. 확신할 만큼 비교 차량이 충분하지 않은 경우, 숫자를 지어내는 대신 그렇다고 말씀드립니다.',
  },

  valuationTool: {
    yourCar: '당신의 차량',
    make: '제조사',
    makeHint: '입력을 시작하세요 — 사이트에 이미 있는 제조사를 제안해 드립니다.',
    year: '연식',
    mileage: '주행거리',
    mileageHint: '선택 사항. 비워 두면 {{km}} 기준으로 평가합니다.',
    checking: '시장을 확인하는 중…',
    getValuation: '내 시세 평가 받기',
    noAccount: '계정도, 전화번호도 없습니다. 이후에 전화드리지 않습니다.',
    whatWorth: '차량의 가치',
    notEnoughTitle: '아직 비교할 차량이 충분하지 않습니다',
    notEnoughBody:
      '{{message}}. 저희는 Sawa Cars에 실제로 등록되거나 판매된 차량으로 산정하므로, 아직 다뤄 보지 않은 제조사와 연식은 추측 대신 숫자를 제시하지 않습니다.',
    inspectionStill:
      '점검은 여전히 당신의 {{make}}가 어디쯤인지 알려 줍니다. 저희 팀이 인증되는 날 시장과 비교해 평가하며, 최종 결정은 당신의 몫입니다.',
    errorTitle: '해당 추정을 실행할 수 없었습니다',
    placeholder:
      '제조사와 연식을 입력하면 Sawa Cars의 비교 차량이 얼마에 판매되는지 볼 수 있습니다.',
    liveOk:
      '비교 차량 {{comparables}}대를 기준으로 추정 범위는 {{low}}에서 {{high}}입니다.',
    liveEmpty: '해당 제조사와 연식에 대해 비교할 차량이 충분하지 않습니다.',
    carLabel: '{{year}} {{make}}',
    adjusted: '입력하신 주행거리에 맞춰 조정했습니다.',
    valuedAt: '저희 기준인 {{km}}로 평가했습니다 — 주행거리를 추가하면 더 정확한 범위가 나옵니다.',
    avgPrice: '해당 차량들의 평균 가격',
    avgHint: '{{make}}, {{from}}–{{to}}',
    pricesSeen: '실제로 관측된 가격',
    pricesSeenHint: '같은 그룹의 최저가와 최고가',
    comparablesUsed: '사용된 비교 차량',
    comparablesHint: 'Sawa Cars에 등록되거나 판매됨',
    estimateNote:
      '이것은 제안이 아니라 시장 추정치입니다. 최종 호가는 당신의 것입니다 — 150포인트 점검 후 차량의 실제 상태를 파악했을 때 당신과 함께 확정합니다.',
    submitBtn: '이 차량 점검 신청하기',
    submissionHint: '신청은 앱에서 이루어지는 일회성 신원 확인으로 시작됩니다.',
    orWhatsApp: '아니면 WhatsApp으로 문의하세요',
  },

  pricingPage: {
    metaTitle: 'Sawa Cars 요금 안내 — 검사, 보고서, 렌트 등록',
    metaDescription:
      'Sawa Cars가 워크인 차량 검사, 기존 검사 보고서 재구매, 렌트 등록 구독에 부과하는 요금입니다. 둘러보기, 구매, 판매, 판매자에게 연락하는 것은 무료입니다.',
    ogTitle: 'Sawa Cars 요금 안내',
    heroEyebrow: '요금',
    heroTitle: '실제로 부과하는 요금',
    heroLede:
      '둘러보기, 구매, 판매, 인증된 판매자에게 연락하는 것은 무료입니다. 아래는 유료 서비스입니다: 독립적인 검사, 기존 보고서 사본, 렌트 차량의 노출 유지.',
    inspectionTitle: '워크인 검사',
    inspectionBody:
      'Sawa 매물뿐 아니라 다른 사람에게서 구매하려는 차량도 포함해, 어떤 차량이든 센터로 가져와 150개 항목 전체 검사를 받으세요. 요금은 현장에서 지불하며, 결과와 상관없이 보고서는 당신 것입니다.',
    reportTitle: '보고서 재구매',
    reportBody:
      '이미 검사받은 차량의 동일한 보고서를 원할 때 — 두 번째 구매자로서, 또는 자신의 사본을 원하는 판매자로서. 새로 검사받는 대신 한 번만 지불하고 열람 권한을 얻습니다.',
    rentalTitle: '렌트 등록 구독',
    rentalBody:
      '인증된 렌트 제공자가 차량을 렌트 목록에 계속 노출하기 위해 차량당 월 단위로 지불합니다. 렌트 이용자는 둘러보거나 문의하는 데 비용을 지불하지 않습니다.',
    reviewedNote: '요금은 {{date}}에 마지막으로 검토되었습니다.',
    disclaimer:
      '이는 Sawa Cars 자체의 검사 및 등록 서비스에 대한 요금으로, 저희 사무실에서 지불되거나 기록됩니다 — 마켓플레이스 거래 수수료가 아닙니다. Sawa Cars는 어떤 판매나 렌트 계약의 당사자도 아니며, 구매자·판매자·렌트 이용자가 가격, 결제, 조건을 직접 합의합니다.',
    bookInspection: '워크인 검사 예약',
    browseCars: '검사된 차량 둘러보기',
  },
} as const

export const tools: Record<Locale, Record<string, unknown>> = { en, rw, fr, sw, ko }
