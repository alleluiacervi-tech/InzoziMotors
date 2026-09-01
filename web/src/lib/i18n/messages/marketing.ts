// Message section: marketing. One subtree per locale, all sharing the shape of `en`.
// English is complete first; other locales fall back to it per missing key.
import type { Locale } from '../config'

const en = {
  about: {
    meta: {
      title: 'About Sawa Cars',
      desc: 'Sawa Cars is a verified vehicle marketplace in Rwanda: our team reviews sellers, inspections and listing evidence before publication, then users communicate directly.',
    },
    header: {
      eyebrow: 'About',
      title: 'A stronger marketplace, with clear boundaries.',
      lede: 'Buying a used car in Kigali can mean trusting information that is difficult to verify. Sawa Cars adds seller checks, inspection evidence and controlled publication while leaving the final decision and transaction with the users.',
      browse: 'Browse certified cars',
      visit: 'Visit a center',
    },
    why: {
      eyebrow: 'Why it exists',
      title: 'Provenance is the hard problem here',
      description: 'Not price. Not choice. Knowing what the car in front of you has actually been through.',
      p1: 'A large share of the cars on Rwandan roads arrived as used imports, many of them right-hand drive from Japan. They come with a service history written somewhere else, an odometer that is difficult to verify, and paperwork that a private buyer has no practical way to audit before handing over money.',
      p2: 'A classifieds site does not solve that. It carries whatever is posted to it: the seller writes the description, the seller takes the photographs, and the seller is the only person who has ever looked under the bonnet.',
      p3: 'So Sawa Cars took the opposite position. We take the car in, run a 150-point check across its mechanics, body, electronics and documents, photograph it in a fixed useful photo gallery, and publish the listing only after an admin review. The seller keeps control of the price. We keep control of the truth.',
    },
    pipeline: {
      eyebrow: 'How a car gets on the site',
      title: 'Five stages, none of them skippable',
      description: 'The same pipeline runs behind the seller dashboard, the admin queue and this website — there is no side door.',
      stages: [
        { title: 'Submitted', desc: 'A verified seller sends us the car’s details and asking price.' },
        { title: 'Reviewed', desc: 'Our team reads the submission and books an inspection slot.' },
        { title: 'Inspected', desc: 'A mechanic runs the 150-point check at the center.' },
        { title: 'Documented', desc: 'A clear, truthful gallery is added with as many useful images as the vehicle needs.' },
        { title: 'Published', desc: 'We create the listing, report attached, and it goes live.' },
      ],
    },
    weDoNot: {
      eyebrow: 'Where we draw the line',
      title: 'Four things Sawa Cars will not do',
      description: 'Most of what makes this marketplace trustworthy is what it refuses to offer.',
      items: [
        { title: 'We do not take payments', desc: 'There is no checkout, payment gateway or escrow in the app or website. Buyers, sellers and rental providers decide payment directly at their own risk.' },
        { title: 'We do not let sellers publish', desc: 'A seller submits a car. Only the Sawa team can turn a submission into a listing, and only after the car has been at a center.' },
        { title: 'We do not list what we have not inspected', desc: 'Every live listing has a 150-point report behind it. Cars that fall below our threshold are not published.' },
        { title: 'We do not manage user contracts', desc: 'We do not confirm the sale or rental, take custody of a deposit, write the parties’ contract, process ownership transfer or decide an external transaction dispute.' },
      ],
    },
    centers: {
      eyebrow: 'Where we work',
      title: 'Inspection centers in Kigali',
      description: 'These locations support platform inspection services. Users independently decide where and how to complete any later transaction.',
      directions: 'Directions and opening hours',
    },
  },

  promise: {
    meta: {
      title: 'Marketplace safety',
      desc: 'The verification, evidence, consent and publication controls used by Sawa Cars.',
    },
    header: {
      eyebrow: 'Marketplace safety',
      title: 'Useful controls. Honest limits.',
      lede: 'Sawa Cars reduces avoidable marketplace risk through verification, evidence and controlled publication. Those controls improve information; they do not make Sawa Cars a party to the deal.',
      browse: 'Browse verified listings',
      notice: 'Read the direct-deal notice',
    },
    controls: {
      eyebrow: 'Platform controls',
      title: 'Five layers before and during contact',
      description: 'Each one is specific, auditable and limited to what the platform can actually control.',
      items: [
        { title: 'Inspection Information', desc: 'Where an inspection has been completed, the listing shows the recorded mechanical, body, electronics and document checks so buyers can make a better-informed decision.' },
        { title: 'Verified Sellers', desc: 'Seller identity and account status are reviewed before a vehicle can be published. Business providers receive a separate verification control.' },
        { title: 'Clear Evidence', desc: 'Listings distinguish recorded checks from unknown information. Buyers should still verify the vehicle and original documents before agreeing a deal.' },
        { title: 'Consent-Based Contact', desc: 'A seller’s phone or WhatsApp number is shared only when that seller enables it and a signed-in buyer acknowledges the direct-deal notice.' },
        { title: 'Controlled Publication', desc: 'Only authorized administrators can publish listings. Identity, inspection and photo requirements are checked again at publication time.' },
      ],
    },
    sawaControls: {
      title: 'What Sawa controls',
      body: 'Account access, seller verification status, publication gates, listing moderation, consent-based contact disclosure, platform messages and audit history.',
    },
    usersControl: {
      title: 'What users control',
      body: 'Viewings, independent checks, negotiation, contract, payment, deposit, ownership transfer, delivery, pickup, return, insurance and any external dispute.',
    },
  },

  contact: {
    meta: {
      title: 'Contact us',
      desc: 'Call or WhatsApp the Sawa Cars team on +250 788 308 611, or email contact@sawacars.com. Opening hours and addresses for our inspection centers in Kigali.',
    },
    header: {
      eyebrow: 'Contact',
      title: 'Talk to a person',
      lede: 'One line, answered by the team that supports inspections, listings and platform questions. Buyers and sellers use their own enabled contact channels for direct deal discussions.',
    },
    hours: 'Mon–Sat · 8:00 – 18:00',
    band: {
      label: 'Calls & WhatsApp',
      whatsapp: 'Message on WhatsApp',
      call: 'Call now',
    },
    channels: {
      whatsapp: {
        label: 'WhatsApp',
        note: 'The fastest way to reach us. Send a listing link and we will tell you whether the car is still on the floor.',
        badge: 'Fastest',
      },
      call: {
        label: 'Call us',
        note: 'Same line, answered in person during center hours — {{hours}}.',
      },
      email: {
        label: 'Email',
        note: 'For anything that needs an attachment: dealer accounts, partnerships, inspection records, or account support.',
      },
    },
    reach: {
      eyebrow: 'Reach us',
      title: 'Three ways, all of them real',
    },
    composer: {
      title: 'Write it here',
      body: 'This website does not run a contact inbox, so nothing is sent from this page. The button opens WhatsApp with what you have written already typed in — you press send.',
      fieldLabel: 'Your message',
      fieldHint: 'Include the listing you are asking about, if there is one — it saves a round trip.',
      placeholder: 'Hello Sawa Cars — I would like to ask about…',
      submit: 'Open WhatsApp',
      emailPrefix: 'Prefer email? ',
      emailSuffix: ' reaches the same team.',
    },
    expect: {
      eyebrow: 'What to expect',
      title: 'After you get in touch',
      items: [
        { title: 'Within 24 hours', body: 'Every marketplace support request gets a response from the team that runs the inspection centers.' },
        { title: 'A person, not a bot', body: 'The line is answered by the people who inspect vehicles and support the marketplace. There is no phone tree.' },
        { title: 'One number, always', body: 'We never ask you to continue on another number or send money to an account given over chat.' },
      ],
    },
    centers: {
      eyebrow: 'Come and see us',
      title: 'Our centers',
      description: 'Platform inspection services happen here. Contact the team before dropping off a vehicle; user transactions are arranged independently.',
    },
  },

  howItWorks: {
    meta: {
      title: 'How Sawa Cars works',
      desc: 'How verified vehicle listings, direct seller contact, inspections and rental availability inquiries work on Sawa Cars.',
    },
    header: {
      eyebrow: 'How it works',
      title: 'Verified information first. Direct agreement second.',
      lede: 'Sawa Cars reviews sellers, inspections and listings. Buyers, sellers and rental providers then communicate, negotiate and transact independently. There is no checkout, escrow, Sawa contract or transaction guarantee.',
      browse: 'Browse cars',
      submit: 'Submit a vehicle',
    },
    buyers: {
      eyebrow: 'For buyers',
      title: 'From listing to direct deal',
      description: 'Contacting a seller starts a conversation. It does not reserve the car or create a transaction with Sawa Cars.',
    },
    buyingSteps: [
      { title: 'Review the listing', desc: 'Read the vehicle details, gallery, inspection information and any limitations before contacting the seller.' },
      { title: 'Contact the seller', desc: 'Use in-app chat, phone or WhatsApp when the verified seller has enabled that channel.' },
      { title: 'Inspect and verify', desc: 'Arrange your own viewing or additional inspection and check the vehicle, VIN, original documents and ownership independently.' },
      { title: 'Agree written terms', desc: 'Buyer and seller decide the price, payment method, delivery, ownership transfer and written contract directly.' },
      { title: 'Complete the deal independently', desc: 'Sawa Cars does not receive or hold the purchase money and is not a party to the resulting contract or dispute.' },
    ],
    checks: {
      eyebrow: 'Stay in control',
      title: 'Four checks before you commit',
      description: 'Platform verification reduces uncertainty; it does not replace your own due diligence or a written agreement.',
      items: [
        { title: 'Before contact', desc: 'Compare the listing, gallery, inspection record and seller verification. Treat unknown information as unknown.' },
        { title: 'Before paying', desc: 'See the vehicle, verify the VIN and original ownership documents, and independently confirm the recipient and payment method.' },
        { title: 'Before signing', desc: 'Put the price, condition, included items, transfer, delivery, deposit and cancellation terms in a written agreement between the parties.' },
        { title: 'After agreement', desc: 'Keep copies of messages, documents and receipts. Sawa Cars cannot reverse or decide a payment or contract made outside the platform.' },
      ],
    },
    sellers: {
      eyebrow: 'For sellers',
      title: 'Controlled publication, direct enquiries',
      description: 'Submit the vehicle and complete verification. An authorized admin publishes only after the configured evidence checks pass.',
      responsibilityLabel: 'Your responsibility after publication:',
      responsibilityBody: ' keep the listing accurate, respond truthfully, disclose changes, and document any independent agreement with the buyer.',
    },
    sellingSteps: [
      { title: 'Submit your car', desc: 'Tell us the make, model, mileage and your asking price. We suggest a range from real comparable sales.' },
      { title: 'Book your inspection', desc: 'Pick a center and a slot. Bring the car and your service records.' },
      { title: 'We inspect and review', desc: 'Our team records the inspection and adds a clear, truthful image gallery. There is no fixed angle count.' },
      { title: 'Complete seller verification', desc: 'Before publication, our team must approve your one-time identity check and activate your seller account.' },
      { title: 'An admin publishes it', desc: 'Publication is gated by seller verification, inspection completion and a valid gallery. You keep control of the price.' },
      { title: 'You manage buyer enquiries', desc: 'Talk, negotiate and agree any sale directly. Sawa Cars is not a party to your contract or payment.' },
    ],
    notParty: {
      title: 'Sawa Cars is not a party to user transactions',
      body: 'The platform does not hold money, confirm a sale or rental, issue the parties’ contract, guarantee a deposit or vehicle, or accept responsibility for an external payment, agreement, delivery, loss or dispute. Nothing here removes rights or responsibilities that applicable law cannot exclude.',
      cta: 'Read the full marketplace terms',
    },
  },

  terms: {
    meta: {
      title: 'Marketplace terms of service',
      desc: 'Terms governing accounts, verified vehicle listings, seller contact, rental inquiries and direct user transactions on Sawa Cars.',
    },
    page: {
      title: 'Marketplace terms of service',
      lede: 'Clear rules for verified listings and direct communication—and a clear boundary around contracts and payments made independently by users.',
    },
    scope: {
      heading: 'Scope and acceptance',
      p1before: 'These terms govern use of the Sawa Cars website, mobile apps and related marketplace services. By creating an account or using an authenticated feature, you agree to these terms and the ',
      p1link: 'privacy policy',
      p1after: '.',
      p2: 'The current marketplace terms version is shown when a user first requests a seller contact channel. Material policy changes may require acceptance again.',
    },
    role: {
      heading: 'Sawa Cars’ limited role',
      p1strong: 'Sawa Cars provides a verified-listing and communication platform.',
      p1rest: ' It is not the buyer, seller, rental provider, payment processor, escrow agent, insurer, lender, transport company or a party to a contract between users.',
      p2: 'Contacting another user is an inquiry only. It does not reserve a vehicle, confirm availability, create a sale or rental, or bind Sawa Cars.',
    },
    accounts: {
      heading: 'Accounts and eligibility',
      items: [
        'Provide accurate, current information and keep your credentials secure.',
        'Use your own identity and contact information.',
        'Notify us promptly of unauthorized access.',
        'Seller publication may require identity verification; rental inventory requires separate business verification.',
        'We may suspend or restrict an account to protect users, investigate abuse, comply with law or enforce these terms.',
      ],
    },
    listings: {
      heading: 'Listings and publication',
      p1: 'Sellers must describe the vehicle truthfully, disclose material defects or changes and have authority to offer it. Submission does not guarantee publication.',
      p2: 'Only an authorized administrator can publish a listing. Publication readiness may require an active verified seller, a completed inspection and a valid image gallery. Sawa Cars may reject, pause, correct or archive content that is inaccurate, unsafe, unlawful or inconsistent with platform standards.',
    },
    inspection: {
      heading: 'Inspection information and badges',
      p1: 'An inspection reflects recorded observations on the inspection date and the items actually checked. It is not a warranty, guarantee of future condition or substitute for a buyer’s independent mechanical and legal review.',
      p2: '“Verified seller” means the platform completed its configured account checks; it does not promise that every statement, vehicle or future action by that person is risk-free.',
    },
    contact: {
      heading: 'Contact sharing and communications',
      p1: 'A seller chooses whether phone or WhatsApp contact can be disclosed. Sawa Cars reveals an enabled channel only to an authenticated user after acknowledgement of the direct-deal notice and records that disclosure for safety and audit purposes.',
      p2: 'Users must not harass, threaten, spam, scrape contact data or use it for an unrelated purpose. In-app messages may be reported and reviewed for moderation as described in the privacy policy.',
    },
    transactions: {
      heading: 'Independent sales and rentals',
      p1: 'Buyer and seller—or renter and provider—are solely responsible for availability, further inspection, documents, price, taxes, payment, deposits, written terms, delivery, pickup, return, ownership transfer, insurance and regulatory compliance.',
      p2: 'Sawa Cars does not collect or hold transaction funds and cannot cancel, refund, reverse, enforce or decide an agreement made by users. Rental rates and deposits shown are provider-supplied information until the provider confirms them.',
    },
    prohibited: {
      heading: 'Prohibited conduct',
      items: [
        'Fraud, impersonation, stolen vehicles or false documents.',
        'Misleading descriptions, concealed material defects or manipulated images.',
        'Malware, automated scraping, interference with security or unauthorized access.',
        'Discrimination, threats, harassment or unlawful content.',
        'Using another person’s contact data outside the purpose for which it was disclosed.',
      ],
    },
    reports: {
      heading: 'Reports, evidence and disputes',
      p1: 'Users can report platform content, messages or accounts. Sawa Cars may moderate the platform, preserve evidence and cooperate with lawful requests.',
      p2: 'Platform moderation is not arbitration of the users’ contract. A payment, ownership, delivery or rental dispute must be handled by the parties and, where appropriate, their bank, payment provider, insurer, lawyer, regulator, court or law-enforcement authority.',
    },
    liability: {
      heading: 'Disclaimers and responsibility',
      p1: 'To the extent permitted by applicable law, marketplace information and communication tools are provided without a promise that a vehicle will remain available, a user will complete a deal, or an external agreement will achieve a particular result.',
      p2: 'Each user is responsible for their own decisions and for losses caused by their own representation, agreement, payment or unlawful conduct. Nothing in these terms excludes fraud, wilful misconduct or any right or liability that applicable law does not permit us to exclude.',
    },
    changes: {
      heading: 'Changes and termination',
      p1: 'We may improve, restrict or retire features and update these terms. Material updates will be communicated through the service where practical. Historical records may be retained when needed for security, audit, legal compliance or legitimate claims.',
      p2: 'You may request account deletion through the app or website, subject to legally required retention and irreversible anonymisation rules described in the privacy policy.',
    },
    lawContact: {
      heading: 'Law and contact',
      p1: 'These terms are intended to operate under the laws applicable in Rwanda. The final governing-law and dispute-resolution clause must be confirmed by qualified Rwandan counsel before production launch.',
      p2before: 'Questions about these terms can be sent to ',
      p2after: '.',
      lastUpdated: 'Last updated: 23 August 2026.',
    },
  },

  privacy: {
    meta: {
      title: 'Privacy policy',
      desc: 'What Sawa Cars collects, why, who can see it, and how identity documents are handled. One account across the app and the website.',
    },
    page: {
      title: 'Privacy policy',
      lede: 'What we collect, why we hold it, who can see it — and the particular care taken with the identity documents that make this marketplace work.',
    },
    scope: {
      heading: 'Scope',
      p1: 'This policy covers {{name}} — this website, the Android and iOS apps, and the records our team keeps at the inspection centers. All three share one account and one database, so information you give in one place is available to you in the others.',
    },
    collect: {
      heading: 'What we collect',
      h1: 'When you create an account',
      list1: [
        'Your name, email address and phone number.',
        'Your password, stored only as a cryptographic hash. Nobody at Sawa Cars can read it, including us.',
      ],
      h2: 'When you verify your identity as a seller',
      list2: [
        'Photographs of the front and back of your national ID, and a selfie.',
      ],
      h3: 'When you use the marketplace',
      list3: [
        'Cars you save, searches you save, and the alerts you switch on.',
        'Seller-contact disclosures and rental availability inquiries.',
        'Messages you exchange with sellers, buyers or our team.',
        'Vehicle details you submit, and the inspection results our mechanics record.',
      ],
      h4: 'Automatically',
      list4: [
        'Basic technical logs needed to run and secure the service.',
        'In the app only: camera access when you choose to take a photograph, and a push notification token if you allow notifications. Neither is used for anything else.',
      ],
    },
    why: {
      heading: 'Why we hold it',
      list: [
        'To verify that a seller is a real, identifiable person — the basis of the whole marketplace.',
        'To publish accurate listings and inspection reports.',
        'To enable direct marketplace communications and provider responses to rental inquiries.',
        'To send the alerts you asked for: price drops, saved-search matches, messages.',
        'To investigate reports about platform content or conduct and prevent fraud.',
        'To maintain security, consent and administrative audit records.',
      ],
      p: 'We do not build advertising profiles, and we do not sell personal information to anyone.',
    },
    identity: {
      heading: 'Identity documents, specifically',
      p: 'ID photographs and selfies are the most sensitive thing we hold, and they are treated accordingly.',
      list: [
        'They are never shown on a listing, and never shared with buyers or other sellers.',
        'Access is restricted to the Sawa team members who review verifications. The documents sit behind an administrator-only route; an ordinary account cannot reach them even with a direct link.',
        'What other users see is the outcome only: a “Verified seller” marker, and the trust score that flows from it.',
        'We keep them while your account is open and for as long afterwards as record-keeping on completed sales requires, then delete them.',
      ],
    },
    whoSees: {
      heading: 'Who sees what',
      items: [
        { lead: 'Buyers see', rest: ' a seller’s display name, verification status, trust score, seller profile information and contact-channel availability. A phone or WhatsApp number is disclosed only after seller consent and buyer acknowledgement.' },
        { lead: 'Sellers and rental providers see', rest: ' the information needed to answer messages or availability inquiries sent to them.' },
        { lead: 'Our team sees', rest: ' what is required to run the pipeline: submissions, inspections, listings, inquiries, contact disclosures and — where platform safety or a report requires it — conversations.' },
        { lead: 'Nobody sees', rest: ' your password, your ID documents or your saved searches except you and the reviewers named above.' },
      ],
    },
    sharing: {
      heading: 'Who else is involved',
      p1: 'We use a small number of service providers to run the platform — hosting, message delivery and image storage. They process data on our instructions only, and they are not permitted to use it for their own purposes.',
      p2: 'We share information with authorities only where the law requires it, and with the Rwanda Revenue Authority to the extent an ownership transfer requires.',
    },
    cookies: {
      heading: 'Cookies',
      p1before: 'This website sets one cookie: a session cookie that keeps you signed in. It is ',
      p1strong: 'httpOnly',
      p1after: ', which means no script running in your browser can read it — including a malicious one. It is removed when you sign out.',
      p2: 'There are no advertising cookies and no third-party trackers on this site.',
    },
    security: {
      heading: 'How it is protected',
      list: [
        'Passwords are hashed, never stored in a readable form.',
        'Sessions on the web are held in an httpOnly cookie rather than in browser storage.',
        'Every request to our API is authorised on the server, and administrator functions are gated by role rather than by hiding a link.',
        'Identity documents are served only to reviewers, never publicly.',
      ],
      pbefore: 'No system is perfect. If you believe an account has been compromised, contact ',
      pafter: ' and we will act the same day.',
    },
    rights: {
      heading: 'Your choices',
      item1: 'You can view and correct your profile at any time from your account.',
      item2: 'You can switch any alert off without losing the saved car or search behind it.',
      item3part1: 'You can close your account yourself, at any time and without anyone’s approval — on this website under ',
      item3link1: 'Profile → Close account',
      item3part2: ', or in the app under Settings → Danger zone. Closing takes effect immediately; your data is erased 30 days later, and until then you can sign back in and reopen the account. Full details are on the ',
      item3link2: 'account deletion page',
      item3part3: '.',
      item4: 'Closing takes your listings off the marketplace and stops your phone number being shown straight away. After 30 days the erasure removes your profile, your contact details, your identity documents and your saved cars and searches. Records of vehicle transfers that already completed are retained where the law requires, with your name and contact details removed from them.',
      item5before: 'You can ask for a copy of what we hold about you by writing to ',
      item5after: '.',
    },
    children: {
      heading: 'Children',
      p: 'Sawa Cars accounts are for adults. We do not knowingly collect information from anyone under 18, and we delete it if we discover we have.',
    },
    contact: {
      heading: 'Changes and contact',
      p1: 'We will update this page whenever the platform changes what it collects, and account holders will be notified of material changes.',
      p2before: 'Questions about privacy go to ',
      p2mid: ', or to ',
      p2after: ' for anything else.',
    },
  },

  guarantee: {
    meta: {
      title: 'Direct-deal marketplace notice',
      desc: 'The role of Sawa Cars and the responsibilities of buyers, sellers and rental providers when they transact directly.',
    },
    page: {
      title: 'Direct-deal marketplace notice',
      lede: 'Sawa Cars improves listing quality and communication, but is not a party to the contract, payment or delivery users arrange with each other.',
    },
    noGuarantee: {
      heading: 'No Sawa transaction guarantee',
      p1: 'Sawa Cars does not provide a seven-day return guarantee, transaction warranty, escrow, refund promise or rental-deposit guarantee for an agreement between users.',
      p2: 'A vehicle inspection record describes observations made at a point in time. It is not a warranty of future condition and does not replace an independent inspection or legal checks.',
    },
    platformRole: {
      heading: 'What the platform does',
      items: [
        'Reviews seller identity and account status.',
        'Controls which vehicle listings become public.',
        'Stores listing, gallery and inspection information.',
        'Provides in-app messaging and consent-based phone or WhatsApp disclosure.',
        'Receives reports about platform content or conduct for moderation.',
      ],
    },
    userRole: {
      heading: 'What users decide and manage',
      items: [
        'Vehicle viewing, additional inspection and document verification.',
        'Price, payment method, deposit and proof of payment.',
        'Contract, representations, delivery, pickup, return and ownership transfer.',
        'Insurance, taxes, licences and other legal or regulatory requirements.',
        'Any cancellation, refund, claim or dispute arising from the independent agreement.',
      ],
    },
    safety: {
      heading: 'Before you transfer money',
      p1: 'Verify the other party, the vehicle, VIN, original ownership documents and payment recipient independently. Put all material terms in writing and keep copies of communications and receipts.',
      p2: 'Do not rely on a badge, listing, message or inspection score as proof that payment is safe. Report suspicious platform content, but contact the appropriate bank, mobile-money provider, police or regulator immediately when a payment or crime may be involved.',
    },
    law: {
      heading: 'Rights the law preserves',
      p: 'Nothing in this notice excludes liability or consumer rights that applicable law does not allow a person to exclude. The buyer, seller or provider remains responsible for the promises and duties they accept in their own agreement.',
    },
    related: {
      heading: 'Related information',
      terms: 'Terms of service',
      how: 'How the marketplace works',
      promise: 'Marketplace safety controls',
    },
  },
} as const

export const marketing: Record<Locale, Record<string, unknown>> = {
  en,
  rw: {},
  fr: {},
  sw: {},
  ko: {},
}
