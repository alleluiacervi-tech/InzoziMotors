// ─────────────────────────────────────────────────────────────────────────────
// Site-wide constants: identity, store links, deep-link scheme, contact details.
// One place to change when the real numbers and store IDs land.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Sawa Cars',
  tagline: 'Rwanda’s certified car marketplace',
  description:
    'Every car on Sawa Cars is physically inspected on a 150-point check, photographed by our team, and backed by a 7-day drive-it guarantee. Buy, sell or rent with confidence in Kigali.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://sawacars.com',
  locale: 'en_RW',
  themeColor: '#CC050F',
} as const

/** App identifiers — must match app.config.js in the Expo project. */
export const APP = {
  scheme: 'sawa',
  androidPackage: 'com.sawacars.app',
  iosBundleId: 'com.sawacars.app',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sawacars.app',
  appStoreUrl: 'https://apps.apple.com/app/sawa/id0000000000',
  /**
   * HONESTY GATE. The store records don't exist yet, so every store badge and
   * store link on the site renders as absence (or "coming soon" copy) until
   * this flips. Flip it when the real App Store id and Play listing are live —
   * a button to a 404 store page is exactly the scam signal Sawa exists to
   * kill.
   */
  storesLive: false,
} as const

/** Sawa business line. TODO: replace with the real WhatsApp Business number
 *  before launch — the same placeholder lives in src/utils/whatsapp.js. */
export const CONTACT = {
  whatsapp: '250788000000',
  whatsappDisplay: '+250 788 000 000',
  email: 'hello@sawacars.com',
  supportEmail: 'support@sawacars.com',
  /**
   * HONESTY GATE. The number above is a placeholder. Every WhatsApp surface —
   * header furniture, contact page, escalation links in empty states — checks
   * this flag and renders nothing while it is false. "Three ways to reach us,
   * all of them real" must be literally true.
   */
  whatsappVerified: false,
} as const

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

// Three verbs and the trust page. Kept deliberately short — a marketplace nav
// that grows becomes a portal nav, and portals read as classifieds. /promise
// stays reachable from the footer and every trust surface.
export const NAV_LINKS = [
  { href: '/cars', label: 'Buy' },
  { href: '/rentals', label: 'Rentals' },
  { href: '/sell', label: 'Sell' },
  { href: '/how-it-works', label: 'How it works' },
] as const

export const FOOTER_LINKS = [
  {
    heading: 'Marketplace',
    links: [
      { href: '/cars', label: 'Browse certified cars' },
      { href: '/rentals', label: 'Rent a car' },
      { href: '/sell', label: 'Sell your car' },
      { href: '/tools/valuation', label: 'Free valuation' },
      { href: '/tools/import-duty', label: 'Import duty calculator' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About Sawa Cars' },
      { href: '/promise', label: 'The Sawa Promise' },
      { href: '/how-it-works', label: 'How buying works' },
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
      { href: '/legal/guarantee', label: '7-day guarantee terms' },
      // Google Play requires this to be reachable without signing in, so it
      // belongs in the footer rather than only behind the dashboard.
      { href: '/account/delete', label: 'Delete your account' },
    ],
  },
] as const

/** The five guarantees — copy lifted verbatim from SawaPromiseScreen so the
 *  wording a customer reads on the site is the wording in the app. */
export const PROMISES = [
  {
    icon: 'shield',
    title: '150-Point Certification',
    desc: 'Every car — for sale or for rent — passes our full mechanical, body, electronics and documentation inspection before it appears on Sawa Cars. No exceptions, no seller shortcuts.',
  },
  {
    icon: 'refresh',
    title: 'Drive It for 7 Days',
    desc: 'Every certified purchase comes with a 7-day decision window. Drive it, live with it — if it doesn’t match its inspection report, return it at any Sawa center for a full refund.',
  },
  {
    icon: 'document',
    title: 'Verified History',
    desc: 'Ownership records, mileage verification and RRA duty status are checked and published on every listing. What you read is what we verified.',
  },
  {
    icon: 'cash',
    title: 'Deposit-Back Guarantee',
    desc: 'Rental deposits are returned in full after the return check — same day, at the center. Documented condition photos protect both sides.',
  },
  {
    icon: 'eye-off',
    title: 'Zero Fake Listings',
    desc: 'Only the Sawa team can publish listings, and only after physically inspecting the car. Every photo is shot by our photographers. If it looks real, it is.',
  },
] as const

/** Buyer journey — mirrors STEPS in BuyingGuideScreen. */
export const BUYING_STEPS = [
  {
    title: 'Request the car',
    desc: 'One tap, no payment. The car is reserved for you while we confirm with the seller. Cancelling before handover is always free.',
  },
  {
    title: 'We arrange everything',
    desc: 'Sawa Cars contacts you on WhatsApp within 24 hours to set a handover time at the center that suits you.',
  },
  {
    title: 'Handover at the center',
    desc: 'Meet at a Sawa center. Payment happens there — in person, never in the app. We check documents with both of you.',
  },
  {
    title: 'Ownership transfer',
    desc: 'We process the RRA transfer with you at the center. New registration documents typically complete within 2–3 working days.',
  },
  {
    title: 'Insure before you drive',
    desc: 'Third-party insurance is required before the car leaves the center. Bring a policy, or our team helps you arrange one on the spot.',
  },
  {
    title: 'Drive it for 7 days',
    desc: 'Your guarantee window. If the car doesn’t match its inspection report, bring it back for a full refund.',
  },
] as const

/** Seller journey — mirrors the pipeline in CLAUDE.md and SellerDashboardScreen. */
export const SELLING_STEPS = [
  { title: 'Verify your identity', desc: 'A one-time ID check. It is what keeps every Sawa Cars listing real — and it takes about two minutes.' },
  { title: 'Submit your car', desc: 'Tell us the make, model, mileage and your asking price. We suggest a range from real comparable sales.' },
  { title: 'Book your inspection', desc: 'Pick a center and a slot. Bring the car and your service records.' },
  { title: 'We inspect and photograph', desc: 'Our mechanics run the 150-point check; our photographers shoot the standard 36 angles.' },
  { title: 'Your listing goes live', desc: 'We publish it with the full report attached. You keep control of the price.' },
  { title: 'Handover and payment', desc: 'We arrange the meeting, verify the buyer, and process the RRA transfer at the center.' },
] as const

export const FAQS = [
  {
    q: 'Do I pay anything through the app or website?',
    a: 'Never. There is no payment feature at all. Payment happens physically at a Sawa center at handover — that is what protects both you and the seller.',
  },
  {
    q: 'What does the 150-point inspection actually cover?',
    a: 'Seven categories: engine and drivetrain, brakes and steering, body and exterior, interior and comfort, electronics and safety, tyres and wheels, and documentation. Every item is graded pass, flag or fail, and the full report is published on the listing before you commit.',
  },
  {
    q: 'How does the 7-day guarantee work?',
    a: 'From the day of handover you have 7 days. If the car does not match its published inspection report, return it to any Sawa center for a full refund. Change-of-mind returns are accepted with a reconditioning fee, and a per-km charge applies beyond 300 km.',
  },
  {
    q: 'Can sellers list cars themselves?',
    a: 'No — and that is the point. Only the Sawa team publishes listings, and only after physically inspecting and photographing the car. Sellers submit a car for inspection; they never post directly.',
  },
  {
    q: 'What does it cost to sell?',
    a: 'A certification fee covers the inspection, the professional photography and the listing. A small success commission applies only when the handover completes. Buyers pay nothing, ever.',
  },
  {
    q: 'What if the seller sells the car to someone else?',
    a: 'Once you request a car it is reserved and removed from the marketplace. Only you can complete or release that reservation.',
  },
  {
    q: 'Do I need the mobile app, or can I do everything on the web?',
    a: 'Browsing, full inspection reports, saved cars and searches, purchase requests and your whole account work on the web. The app adds camera capture for ID verification and seller photos, plus push notifications for price drops and messages.',
  },
  {
    q: 'Which areas do you cover?',
    a: 'We operate across Kigali with inspection and handover centers in Nyarutarama, Kicukiro and Kimironko. Listings show the neighbourhood the car is kept in.',
  },
] as const
