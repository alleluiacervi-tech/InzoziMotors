// ─────────────────────────────────────────────────────────────────────────────
// Site-wide constants: identity, store links, deep-link scheme, contact details.
// One place to change when the real numbers and store IDs land.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Sawa Cars',
  tagline: 'Rwanda’s verified vehicle marketplace',
  description:
    'Discover reviewed vehicle listings, inspection information and verified sellers in Rwanda. Buyers, sellers and rental providers communicate and transact directly.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://sawacars.com',
  locale: 'en_RW',
  themeColor: '#CC050F',
} as const

/** App identifiers — must match app.config.js in the Expo project. */
export const APP = {
  scheme: 'sawa',
  androidPackage: 'com.sawacars.apps',
  iosBundleId: 'com.sawacars.app',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sawacars.apps',
  appStoreUrl: 'https://apps.apple.com/app/id6803097569',
  /**
   * HONESTY GATE, per platform. A badge or store link only renders for a store
   * the app is actually published on — a button to a 404 store page is exactly
   * the scam signal Sawa exists to kill.
   *
   * iOS went live on the App Store on 28 Aug 2026 (id 6803097569). Android is
   * not published yet, so its Play URL still 404s and its badge stays hidden.
   * Flip androidLive to true the moment the Play listing is live, and not
   * before.
   */
  iosLive: true,
  androidLive: false,
} as const

/** True when the app is installable on at least one store — the site may then
 *  lead with "Get the app" rather than the marketplace-first fallback. */
export const STORES_LIVE = APP.iosLive || APP.androidLive

/**
 * Sawa Cars' single business line and single public mailbox.
 *
 * ONE number and ONE address on purpose. Every extra contact route is another
 * place a customer can be ignored, and this is a trust product — "we inspect
 * every car" reads badly next to an unanswered inbox. The line takes calls and
 * WhatsApp on the same handset; the mailbox is read by the team through the
 * admin dashboard's inbox.
 *
 * The address here MUST be a mailbox the team actually monitors. contact@ is the
 * one the admin inbox connects to over IMAP, so advertising anything else would
 * send customers somewhere nobody is looking. operations@ exists as an internal
 * alias and is deliberately NOT published.
 *
 * Mirrored in src/utils/whatsapp.js for the Expo app — change both together.
 */
export const CONTACT = {
  /** Digits only, E.164 without the +. For wa.me and tel: URLs. */
  whatsapp: '250788308611',
  whatsappDisplay: '+250 788 308 611',
  /** Same handset. Kept as its own key so a future dedicated line is a one-line change. */
  phone: '250788308611',
  phoneDisplay: '+250 788 308 611',
  email: 'contact@sawacars.com',
  /** Support and general enquiries are the same mailbox — see above. */
  supportEmail: 'contact@sawacars.com',
  /**
   * HONESTY GATE, now satisfied. This was false while the number was a
   * placeholder, and every WhatsApp surface rendered as absence rather than
   * opening a chat to a number nobody answers. The number above is real, so the
   * surfaces are live. If the line is ever disconnected, set this back to false
   * rather than leaving a dead button on the site.
   */
  whatsappVerified: true,
} as const

/**
 * Public social profiles.
 *
 * Same honesty gate as the phone line: an entry only appears here once the
 * account exists and is actually posted to. An empty array renders no social
 * row at all rather than a set of dead icons — the site says nothing before it
 * says something untrue.
 *
 * URLs are stored CANONICAL: no utm_*, no `stkn` share token, no `igsh`. Those
 * parameters come off the "share" button in the app, are scoped to whoever
 * generated them, and expire — publishing one puts a personal share token in
 * every page's HTML and in the structured data Google indexes. The bare
 * profile URL resolves to the same account forever.
 *
 * `sameAs` in lib/seo.ts reads this array, so adding a profile here also tells
 * Google the account belongs to the organization — the entity link that makes
 * a knowledge panel possible.
 */
export const SOCIAL = [
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@sawacars_',
    href: 'https://www.instagram.com/sawacars_',
  },
] as const

/** Inspection centers — mirrors the inspection_centers table seeded in schema.sql. */
export const CENTERS = [
  {
    id: 'nyarutarama',
    name: 'Nyarutarama Center',
    area: 'Nyarutarama, Gasabo',
    address: 'KG 9 Ave, Nyarutarama',
    hours: 'Mon–Sat · 8:00 – 18:00',
  },
  {
    id: 'kicukiro',
    name: 'Kicukiro Center',
    area: 'Kicukiro',
    address: 'KN 5 Rd, Kicukiro',
    hours: 'Mon–Sat · 8:00 – 18:00',
  },
  {
    id: 'kimironko',
    name: 'Kimironko Center',
    area: 'Kimironko, Gasabo',
    address: 'KG 28 St, Kimironko',
    hours: 'Mon–Fri · 8:00 – 17:00',
  },
] as const

/**
 * Rent is only promoted (nav, homepage search tabs, homepage cards) once the
 * fleet has this many cars. An empty business in the primary navigation tells
 * a first-time visitor the site is unfinished. /rentals itself stays live and
 * linked from the footer, so nothing 404s and providers can still be found.
 */
export const RENT_MIN_FLEET = 3
export const rentPromoted = (fleetSize: number) => fleetSize >= RENT_MIN_FLEET

// The businesses in the order people arrive with them, then the one page that
// explains Sawa. Rent is listed but filtered out by the header until the fleet
// is worth promoting (rentPromoted, above). Tools is not here: valuation lives
// on Sell, duty on Import, finance on every listing; /tools stays reachable
// from those pages and the footer. Four or five words, never a portal.
export const NAV_LINKS = [
  { href: '/cars', label: 'Buy' },
  { href: '/rentals', label: 'Rent' },
  { href: '/sell', label: 'Sell' },
  { href: '/imports', label: 'Import' },
  { href: '/how-it-works', label: 'How Sawa works' },
] as const

export const FOOTER_LINKS = [
  {
    heading: 'Marketplace',
    links: [
      { href: '/cars', label: 'Browse certified cars' },
      { href: '/rentals', label: 'Rent a car' },
      { href: '/imports', label: 'Import a car' },
      { href: '/sell', label: 'Sell your car' },
      { href: '/tools/valuation', label: 'Free valuation' },
      { href: '/tools/import-duty', label: 'Import duty calculator' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/how-it-works', label: 'How Sawa works' },
      { href: '/how-it-works#buying', label: 'How buying works' },
      { href: '/contact', label: 'Contact & centers' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: '/signin', label: 'Sign in' },
      { href: '/signup', label: 'Create account' },
      { href: '/dashboard', label: 'My dashboard' },
      { href: '/dashboard/saved', label: 'Saved cars' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/legal/terms', label: 'Terms of service' },
      { href: '/legal/privacy', label: 'Privacy policy' },
      { href: '/legal/guarantee', label: 'Direct-deal notice' },
      // Google Play requires this to be reachable without signing in, so it
      // belongs in the footer rather than only behind the dashboard.
      { href: '/account/delete', label: 'Delete your account' },
    ],
  },
] as const

/** Marketplace safety commitments. These describe platform controls, not a
 * transaction warranty or promise about an agreement between users. */
export const PROMISES = [
  {
    icon: 'shield',
    title: 'Inspection Information',
    desc: 'Where an inspection has been completed, the listing shows the recorded mechanical, body, electronics and document checks so buyers can make a better-informed decision.',
  },
  {
    icon: 'user',
    title: 'Verified Sellers',
    desc: 'Seller identity and account status are reviewed before a vehicle can be published. Business providers receive a separate verification control.',
  },
  {
    icon: 'document',
    title: 'Clear Evidence',
    desc: 'Listings distinguish recorded checks from unknown information. Buyers should still verify the vehicle and original documents before agreeing a deal.',
  },
  {
    icon: 'mail',
    title: 'Consent-Based Contact',
    desc: 'A seller’s phone or WhatsApp number is shared only when that seller enables it and a signed-in buyer acknowledges the direct-deal notice.',
  },
  {
    icon: 'eye-off',
    title: 'Controlled Publication',
    desc: 'Only authorized administrators can publish listings. Identity, inspection and photo requirements are checked again at publication time.',
  },
] as const

/** Buyer journey — mirrors STEPS in BuyingGuideScreen. */
export const BUYING_STEPS = [
  {
    title: 'Review the listing',
    desc: 'Read the vehicle details, gallery, inspection information and any limitations before contacting the seller.',
  },
  {
    title: 'Contact the seller',
    desc: 'Use in-app chat, phone or WhatsApp when the verified seller has enabled that channel.',
  },
  {
    title: 'Inspect and verify',
    desc: 'Arrange your own viewing or additional inspection and check the vehicle, VIN, original documents and ownership independently.',
  },
  {
    title: 'Agree written terms',
    desc: 'Buyer and seller decide the price, payment method, delivery, ownership transfer and written contract directly.',
  },
  {
    title: 'Complete the deal independently',
    desc: 'You pay the seller directly, and any problem with the deal is settled between the two of you.',
  },
] as const

/** Seller journey in five steps — the one count used on every page
 *  (docs/WEBSITE-REDESIGN-TODO.md, D4); mirrors marketing.howItWorks.sellingSteps. */
export const SELLING_STEPS = [
  { title: 'Submit your car', desc: 'Make, model, mileage and your asking price, then a one-time ID check. Both work here on the website or in the app.' },
  { title: 'Book the inspection', desc: 'Pick a centre and a time, and bring the car and its documents. A Sawa mechanic runs the 150 checks.' },
  { title: 'We publish it', desc: 'Our team adds the photos and publishes the listing with its full report. Only Sawa staff can publish.' },
  { title: 'Buyers contact you', desc: 'Through in-app messages, or by phone and WhatsApp if you allow it. You keep control of the price.' },
  { title: 'You agree the sale directly', desc: 'Price, payment, transfer and handover are agreed between you and the buyer.' },
] as const

export const FAQS = [
  {
    id: 'pay',
    q: 'Do I pay anything through the app or website?',
    a: 'No. Sawa Cars has no checkout or payment gateway for vehicle sales or rentals. Buyers, sellers and rental providers decide payment and contract arrangements directly and should document them carefully.',
  },
  {
    id: 'inspection',
    q: 'What does the 150-point inspection actually cover?',
    a: 'Seven categories: engine and drivetrain, brakes and steering, body and exterior, interior and comfort, electronics and safety, tyres and wheels, and documentation. Every item is graded pass, flag or fail, and the full report is published on the listing before you commit.',
  },
  {
    id: 'guarantee',
    q: 'Does Sawa Cars guarantee the transaction?',
    a: 'No. Sawa Cars reviews listings and seller eligibility, but it does not guarantee a vehicle, payment, rental deposit, contract, delivery or outcome between users. Always inspect, verify and agree terms in writing.',
  },
  {
    id: 'listing',
    q: 'Can sellers list cars themselves?',
    a: 'Sellers submit vehicle information and can manage approved listing details, but only an authorized administrator can make a listing public after the required checks.',
  },
  {
    id: 'cost',
    q: 'What does it cost to sell?',
    a: 'One charge: the 150-point inspection, paid at the centre (the current price is on the Sell page). Listing your car, buyer messages and the valuation are free, and Sawa Cars never takes a share of the sale.',
  },
  {
    id: 'reserve',
    q: 'Does contacting a seller reserve a car?',
    a: 'No. Contacting a seller starts a conversation only. Availability remains the seller’s responsibility until you and the seller make your own agreement.',
  },
  {
    id: 'appOrWeb',
    q: 'Do I need the mobile app, or can I do everything on the web?',
    a: 'Everything works on the web: browsing, inspection reports, saved cars, messages, ID verification, submitting a car and your account. The app adds push notifications and a faster camera.',
  },
  {
    id: 'areas',
    q: 'Which areas do you cover?',
    a: 'We operate inspection services across Kigali. Listings show the location supplied for each vehicle. Buyer and seller decide where to view or exchange a vehicle.',
  },
] as const
