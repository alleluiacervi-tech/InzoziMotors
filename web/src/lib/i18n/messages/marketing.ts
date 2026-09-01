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

const rw = {
  about: {
    meta: {
      title: 'Ibyerekeye Sawa Cars',
      desc: 'Sawa Cars ni isoko ry’imodoka ryemewe mu Rwanda: ikipe yacu isuzuma abagurisha, isuzuma ry’imodoka n’ibimenyetso by’amatangazo mbere yo gutangaza, hanyuma abakoresha bakavugana ubwabo.',
    },
    header: {
      eyebrow: 'Ibyerekeye',
      title: 'Isoko rikomeye, rifite imbibi zisobanutse.',
      lede: 'Kugura imodoka yakoreshejwe i Kigali bishobora gusaba kwiringira amakuru agoye kugenzura. Sawa Cars yongeraho isuzuma ry’abagurisha, ibimenyetso by’isuzuma no gutangaza kugenzuwe, mu gihe icyemezo cya nyuma n’igicuruzwa bisigara mu maboko y’abakoresha.',
      browse: 'Reba imodoka zemewe',
      visit: 'Sura ikigo',
    },
    why: {
      eyebrow: 'Impamvu iriho',
      title: 'Inkomoko ni yo kibazo gikomeye hano',
      description: 'Si igiciro. Si amahitamo. Ni ukumenya ibyo imodoka iri imbere yawe yanyuzemo koko.',
      p1: 'Igice kinini cy’imodoka zigenda ku mihanda y’u Rwanda zaje ari izatumijwe zakoreshejwe, nyinshi zifite volan iburyo ziturutse mu Buyapani. Ziza zifite amateka y’isana yanditse ahandi, kompite y’intera igoye kugenzura, n’impapuro umuguzi wigenga adafite uburyo bwo gusuzuma mbere yo gutanga amafaranga.',
      p2: 'Urubuga rw’amatangazo ntirukemura ibyo. Rwikorera icyashyizwemo cyose: umugurisha yandika ibisobanuro, umugurisha afata amafoto, kandi umugurisha ni we wenyine wigeze areba munsi y’umutwe w’imodoka.',
      p3: 'Ku bw’ibyo Sawa Cars yafashe umwanya unyuranye. Twakira imodoka, tugakora isuzuma ry’ingingo 150 ku bikoresho byayo, umubiri, ibikoresho by’amashanyarazi n’impapuro, tukayifotora mu maka y’amafoto ya ngombwa, tugatangaza itangazo gusa nyuma y’isuzuma ry’umuyobozi. Umugurisha agumana ubugenzuzi bw’igiciro. Twe tugumana ubugenzuzi bw’ukuri.',
    },
    pipeline: {
      eyebrow: 'Uko imodoka igera ku rubuga',
      title: 'Intambwe eshanu, nta n’imwe isimburwa',
      description: 'Uruhererekane rumwe rukorera inyuma y’imbonerahamwe y’umugurisha, umurongo w’umuyobozi n’uru rubuga — nta nzira y’iruhande ihari.',
      stages: [
        { title: 'Byatanzwe', desc: 'Umugurisha wemewe adushyikiriza amakuru y’imodoka n’igiciro asaba.' },
        { title: 'Byasuzumwe', desc: 'Ikipe yacu isoma icyatanzwe kandi igategura umwanya w’isuzuma.' },
        { title: 'Byasuzumwe mu buryo bw’ikoranabuhanga', desc: 'Umukanishi akora isuzuma ry’ingingo 150 mu kigo.' },
        { title: 'Byanditswe', desc: 'Hongerwaho amafoto asobanutse kandi y’ukuri afite amashusho ya ngombwa yose imodoka ikeneye.' },
        { title: 'Byatangajwe', desc: 'Dukora itangazo, ririho raporo, hanyuma rikajya ku mugaragaro.' },
      ],
    },
    weDoNot: {
      eyebrow: 'Aho dushyira umurongo',
      title: 'Ibintu bine Sawa Cars itazakora',
      description: 'Ibyinshi bituma iri soko ryizerwa ni ibyo ryanga gutanga.',
      items: [
        { title: 'Ntitwakira amafaranga', desc: 'Nta kwishyura, uburyo bwo kwishyura cyangwa kubika amafaranga muri porogaramu cyangwa urubuga. Abaguzi, abagurisha n’abakodesha bafata icyemezo cy’ubwishyu ubwabo ku bwishingire bwabo.' },
        { title: 'Ntitwemerera abagurisha gutangaza', desc: 'Umugurisha atanga imodoka. Ni ikipe ya Sawa gusa ishobora guhindura icyatanzwe itangazo, kandi gusa nyuma y’uko imodoka yaba yaramaze kuza mu kigo.' },
        { title: 'Ntitwatangaza icyo tutasuzumye', desc: 'Buri tangazo riri ku mugaragaro rifite raporo y’ingingo 150 inyuma yaryo. Imodoka zidashyikira ku rugero rwacu ntizitangazwa.' },
        { title: 'Ntitucunga amasezerano y’abakoresha', desc: 'Ntitwemeza igurisha cyangwa ikodeshwa, ntitwakira ingwate, ntitwandika amasezerano y’impande, ntitunyuza ihererekanya ry’umutungo cyangwa ngo dutange icyemezo ku mpaka z’igicuruzwa cyo hanze.' },
      ],
    },
    centers: {
      eyebrow: 'Aho dukorera',
      title: 'Ibigo by’isuzuma i Kigali',
      description: 'Ahantu hano hashyigikira serivisi z’isuzuma za platifomu. Abakoresha bafata icyemezo bigenga ku birebana n’aho n’uburyo bo kuzuza igicuruzwa cyose kizakurikiraho.',
      directions: 'Aho biherereye n’amasaha y’akazi',
    },
  },

  promise: {
    meta: {
      title: 'Umutekano w’isoko',
      desc: 'Ubugenzuzi, ibimenyetso, uburenganzira no gutangaza bikoreshwa na Sawa Cars.',
    },
    header: {
      eyebrow: 'Umutekano w’isoko',
      title: 'Ubugenzuzi bufite akamaro. Imbibi z’ukuri.',
      lede: 'Sawa Cars igabanya ibyago by’isoko byashoboraga kwirindwa binyuze mu bugenzuzi, ibimenyetso no gutangaza kugenzuwe. Ubwo bugenzuzi butunganya amakuru; ntibuhindura Sawa Cars uruhande mu masezerano.',
      browse: 'Reba amatangazo yemewe',
      notice: 'Soma itangazo ry’ubucuruzi butaziguye',
    },
    controls: {
      eyebrow: 'Ubugenzuzi bwa platifomu',
      title: 'Inzego eshanu mbere no mu gihe cy’itumanaho',
      description: 'Buri rwego ruragaragara, rushobora kugenzurwa kandi rugarukira ku byo platifomu ishobora kugenzura koko.',
      items: [
        { title: 'Amakuru y’isuzuma', desc: 'Aho isuzuma ryarangiye, itangazo ryerekana isuzuma ryanditse ry’ibikoresho, umubiri, amashanyarazi n’impapuro kugira ngo abaguzi bafate icyemezo cy’ibimenyetso.' },
        { title: 'Abagurisha bemewe', desc: 'Umwirondoro w’umugurisha n’imiterere ya konti bisuzumwa mbere y’uko imodoka itangazwa. Abatanga serivisi z’ubucuruzi bahabwa ubugenzuzi bwihariye.' },
        { title: 'Ibimenyetso bisobanutse', desc: 'Amatangazo atandukanya isuzuma ryanditse n’amakuru atazwi. Abaguzi bagomba kandi kugenzura imodoka n’impapuro z’umwimerere mbere yo kwemera amasezerano.' },
        { title: 'Itumanaho rishingiye ku burenganzira', desc: 'Numero ya telefone cyangwa WhatsApp y’umugurisha isangizwa gusa iyo uwo mugurisha abyemeye kandi umuguzi winjiye yemeye itangazo ry’ubucuruzi butaziguye.' },
        { title: 'Gutangaza kugenzuwe', desc: 'Ni abayobozi bemewe gusa bashobora gutangaza amatangazo. Ibisabwa by’umwirondoro, isuzuma n’amafoto bigenzurwa nanone mu gihe cyo gutangaza.' },
      ],
    },
    sawaControls: {
      title: 'Icyo Sawa igenzura',
      body: 'Uburenganzira bwo kwinjira kuri konti, imiterere y’ubwemezi bw’umugurisha, imiryango yo gutangaza, ugenzura amatangazo, gutangaza itumanaho rishingiye ku burenganzira, ubutumwa bwa platifomu n’amateka y’igenzura.',
    },
    usersControl: {
      title: 'Icyo abakoresha bagenzura',
      body: 'Kureba imodoka, isuzuma ryigenga, imishyikirano, amasezerano, ubwishyu, ingwate, ihererekanya ry’umutungo, gutanga, gufata, gusubiza, ubwishingizi n’impaka izo ari zo zose zo hanze.',
    },
  },

  contact: {
    meta: {
      title: 'Twandikire',
      desc: 'Hamagara cyangwa wandikire ikipe ya Sawa Cars kuri WhatsApp kuri +250 788 308 611, cyangwa wandike kuri contact@sawacars.com. Amasaha y’akazi n’aderesi z’ibigo byacu by’isuzuma i Kigali.',
    },
    header: {
      eyebrow: 'Twandikire',
      title: 'Vugana n’umuntu',
      lede: 'Umurongo umwe, usubizwa n’ikipe ishyigikira isuzuma, amatangazo n’ibibazo bya platifomu. Abaguzi n’abagurisha bakoresha imiyoboro yabo bemeye mu biganiro by’ubucuruzi butaziguye.',
    },
    hours: 'Kuwa mbere–Kuwa gatandatu · 8:00 – 18:00',
    band: {
      label: 'Guhamagara & WhatsApp',
      whatsapp: 'Twandikire kuri WhatsApp',
      call: 'Hamagara nonaha',
    },
    channels: {
      whatsapp: {
        label: 'WhatsApp',
        note: 'Uburyo bwihuse bwo kutugeraho. Ohereza umuhora w’itangazo tuzakubwira niba imodoka igihari.',
        badge: 'Bwihuse',
      },
      call: {
        label: 'Duhamagare',
        note: 'Umurongo umwe, usubizwa n’umuntu mu masaha y’ibigo — {{hours}}.',
      },
      email: {
        label: 'Imeyili',
        note: 'Ku kintu cyose gisaba umugereka: konti z’abacuruzi, ubufatanye, raporo z’isuzuma, cyangwa gushyigikira konti.',
      },
    },
    reach: {
      eyebrow: 'Utugereho',
      title: 'Uburyo butatu, bwose ni ukuri',
    },
    composer: {
      title: 'Andika hano',
      body: 'Uru rubuga ntirucunga agasanduku k’itumanaho, bityo nta kintu kohererezwa kuva kuri iyi paji. Buto ifungura WhatsApp hamwe n’ibyo waditse bimaze kwandikwa — wowe ukanda kohereza.',
      fieldLabel: 'Ubutumwa bwawe',
      fieldHint: 'Shyiramo itangazo ubaza, niba rihari — bibika urugendo.',
      placeholder: 'Muraho Sawa Cars — nifuza kubaza ku…',
      submit: 'Fungura WhatsApp',
      emailPrefix: 'Uhitamo imeyili? ',
      emailSuffix: ' igera kuri iyo kipe imwe.',
    },
    expect: {
      eyebrow: 'Icyo witega',
      title: 'Nyuma yo kutugeraho',
      items: [
        { title: 'Mu masaha 24', body: 'Buri gusaba ubufasha ku isoko bihabwa igisubizo n’ikipe icunga ibigo by’isuzuma.' },
        { title: 'Umuntu, si robot', body: 'Umurongo usubizwa n’abantu basuzuma imodoka bakanashyigikira isoko. Nta murongo w’imashini w’amajwi uhari.' },
        { title: 'Numero imwe, buri gihe', body: 'Ntabwo tugusaba gukomereza ku yindi numero cyangwa kohereza amafaranga kuri konti yatanzwe mu kiganiro.' },
      ],
    },
    centers: {
      eyebrow: 'Ngwino uturebe',
      title: 'Ibigo byacu',
      description: 'Serivisi z’isuzuma za platifomu zibera hano. Vugana n’ikipe mbere yo gushyira imodoka; ibicuruzwa by’abakoresha bycategurwa bigenga.',
    },
  },

  howItWorks: {
    meta: {
      title: 'Uko Sawa Cars ikora',
      desc: 'Uko amatangazo y’imodoka yemewe, itumanaho ritaziguye n’umugurisha, isuzuma n’ibibazo by’ikodeshwa bikora kuri Sawa Cars.',
    },
    header: {
      eyebrow: 'Uko bikorwa',
      title: 'Amakuru yemewe mbere. Amasezerano ataziguye nyuma.',
      lede: 'Sawa Cars isuzuma abagurisha, isuzuma n’amatangazo. Abaguzi, abagurisha n’abakodesha hanyuma bakavugana, bakaganira bakanacuruza bigenga. Nta kwishyura, kubika amafaranga, amasezerano ya Sawa cyangwa ubwishingire bw’igicuruzwa bihari.',
      browse: 'Reba imodoka',
      submit: 'Tanga imodoka',
    },
    buyers: {
      eyebrow: 'Ku baguzi',
      title: 'Kuva ku itangazo kugeza ku bucuruzi butaziguye',
      description: 'Kuvugana n’umugurisha bitangira ikiganiro. Ntibibika imodoka cyangwa ngo bishyireho igicuruzwa na Sawa Cars.',
    },
    buyingSteps: [
      { title: 'Suzuma itangazo', desc: 'Soma amakuru y’imodoka, amafoto, amakuru y’isuzuma n’imbibi izo ari zo zose mbere yo kuvugana n’umugurisha.' },
      { title: 'Vugana n’umugurisha', desc: 'Koresha ikiganiro cyo muri porogaramu, telefone cyangwa WhatsApp igihe umugurisha wemewe yashoboje uwo muyoboro.' },
      { title: 'Suzuma kandi ugenzure', desc: 'Tegura ukwikorera cyangwa isuzuma ry’inyongera kandi ugenzure imodoka, VIN, impapuro z’umwimerere n’uburenganzira bwigenga.' },
      { title: 'Mwumvikane ku masezerano yanditse', desc: 'Umuguzi n’umugurisha bafata icyemezo ku giciro, uburyo bw’ubwishyu, gutanga, ihererekanya ry’umutungo n’amasezerano yanditse ubwabo.' },
      { title: 'Zuza ubucuruzi bigenga', desc: 'Sawa Cars ntiyakira cyangwa ngo ibike amafaranga y’igurisha kandi ntabwo ari uruhande mu masezerano cyangwa impaka bikomokaho.' },
    ],
    checks: {
      eyebrow: 'Gumana ubugenzuzi',
      title: 'Ibigenzurwa bine mbere yo kwiyemeza',
      description: 'Ubugenzuzi bwa platifomu bugabanya ubushidikanyi; ntibusimbura isuzuma ryawe bwite cyangwa amasezerano yanditse.',
      items: [
        { title: 'Mbere y’itumanaho', desc: 'Gereranya itangazo, amafoto, inyandiko y’isuzuma n’ubwemezi bw’umugurisha. Fata amakuru atazwi nk’atazwi.' },
        { title: 'Mbere yo kwishyura', desc: 'Reba imodoka, genzura VIN n’impapuro z’umwimerere z’uburenganzira, kandi wemeze wigenga uwakira n’uburyo bw’ubwishyu.' },
        { title: 'Mbere yo gushyira umukono', desc: 'Shyira igiciro, imiterere, ibintu byashyizwemo, ihererekanya, gutanga, ingwate n’amabwiriza yo guhagarika mu masezerano yanditse hagati y’impande.' },
        { title: 'Nyuma y’amasezerano', desc: 'Bika kopi z’ubutumwa, impapuro n’inyemezabuguzi. Sawa Cars ntishobora gusubiza inyuma cyangwa gutanga icyemezo ku bwishyu cyangwa amasezerano yakorewe hanze ya platifomu.' },
      ],
    },
    sellers: {
      eyebrow: 'Ku bagurisha',
      title: 'Gutangaza kugenzuwe, ibibazo bitaziguye',
      description: 'Tanga imodoka kandi uzuze ubwemezi. Umuyobozi wemewe atangaza gusa nyuma y’uko ibigenzurwa by’ibimenyetso byashyizweho binyuze.',
      responsibilityLabel: 'Inshingano yawe nyuma yo gutangaza:',
      responsibilityBody: ' gumana itangazo ryukuri, subiza wubaha ukuri, tangaza impinduka, kandi wandike amasezerano ayo ari yo yose y’ubwigenge n’umuguzi.',
    },
    sellingSteps: [
      { title: 'Tanga imodoka yawe', desc: 'Tubwire ubwoko, moderi, intera n’igiciro usaba. Twerekana urutonde rushingiye ku bigurishwa nyabyo bigereranywa.' },
      { title: 'Tegura isuzuma ryawe', desc: 'Hitamo ikigo n’umwanya. Zana imodoka n’inyandiko z’isana ryawe.' },
      { title: 'Dusuzuma kandi tugasuzuma', desc: 'Ikipe yacu yandika isuzuma kandi yongeraho amafoto asobanutse kandi y’ukuri. Nta mubare uhoraho w’impande uhari.' },
      { title: 'Zuza ubwemezi bw’umugurisha', desc: 'Mbere yo gutangaza, ikipe yacu igomba kwemeza isuzuma ryawe ry’umwirondoro rikorwa rimwe kandi igakora konti yawe y’umugurisha.' },
      { title: 'Umuyobozi arayitangaza', desc: 'Gutangaza bigengwa n’ubwemezi bw’umugurisha, kurangira kw’isuzuma n’amafoto yemewe. Ugumana ubugenzuzi bw’igiciro.' },
      { title: 'Ucunga ibibazo by’abaguzi', desc: 'Vugana, ganira kandi wumvikane ku igurisha iryo ari ryo ryose bitaziguye. Sawa Cars ntabwo ari uruhande mu masezerano cyangwa ubwishyu bwawe.' },
    ],
    notParty: {
      title: 'Sawa Cars ntabwo ari uruhande mu bicuruzwa by’abakoresha',
      body: 'Platifomu ntibika amafaranga, ntiyemeza igurisha cyangwa ikodeshwa, ntitanga amasezerano y’impande, ntitanga ubwishingire bw’ingwate cyangwa imodoka, cyangwa ngo yemere inshingano ku bwishyu bwo hanze, amasezerano, gutanga, igihombo cyangwa impaka. Nta kintu hano gikuraho uburenganzira cyangwa inshingano itegeko rikurikizwa ridashobora gukuraho.',
      cta: 'Soma amabwiriza yuzuye y’isoko',
    },
  },

  terms: {
    meta: {
      title: 'Amabwiriza y’imikoreshereze y’isoko',
      desc: 'Amabwiriza agenga konti, amatangazo y’imodoka yemewe, itumanaho n’umugurisha, ibibazo by’ikodeshwa n’ibicuruzwa bitaziguye by’abakoresha kuri Sawa Cars.',
    },
    page: {
      title: 'Amabwiriza y’imikoreshereze y’isoko',
      lede: 'Amabwiriza asobanutse ku matangazo yemewe n’itumanaho ritaziguye—n’umupaka usobanutse ku masezerano n’ubwishyu bikorwa bigenga n’abakoresha.',
    },
    scope: {
      heading: 'Aho bikurikizwa no kwemera',
      p1before: 'Aya mabwiriza agenga imikoreshereze y’urubuga rwa Sawa Cars, porogaramu za mobile na serivisi z’isoko zijyanye. Mu gufungura konti cyangwa gukoresha igikorwa gisaba kwinjira, wemera aya mabwiriza na ',
      p1link: 'politiki y’ibanga',
      p1after: '.',
      p2: 'Verisiyo igezweho y’amabwiriza y’isoko yerekanwa igihe umukoresha abanje gusaba umuyoboro w’itumanaho n’umugurisha. Impinduka z’ingenzi za politiki zishobora gusaba kwemera nanone.',
    },
    role: {
      heading: 'Uruhande rugarukira rwa Sawa Cars',
      p1strong: 'Sawa Cars itanga platifomu y’amatangazo yemewe n’itumanaho.',
      p1rest: ' Ntabwo ari umuguzi, umugurisha, utanga ikodeshwa, unyuza ubwishyu, ubika amafaranga, umwishingizi, uguriza, isosiyete y’ubwikorezi cyangwa uruhande mu masezerano hagati y’abakoresha.',
      p2: 'Kuvugana n’undi mukoresha ni ikibazo gusa. Ntibibika imodoka, ntibyemeza ko iboneka, ntibishyiraho igurisha cyangwa ikodeshwa, cyangwa ngo bihambire Sawa Cars.',
    },
    accounts: {
      heading: 'Konti no kujyanwa',
      items: [
        'Tanga amakuru nyayo, agezweho kandi ubike ibimenyetso byawe by’umutekano.',
        'Koresha umwirondoro wawe n’amakuru yawe y’itumanaho.',
        'Tumenyeshe vuba iyo hinjiwe konti mu buryo butemewe.',
        'Gutangaza kw’umugurisha bishobora gusaba ubwemezi bw’umwirondoro; imodoka z’ikodeshwa zisaba ubwemezi bw’ubucuruzi butandukanye.',
        'Dushobora guhagarika cyangwa kubuza konti kugira ngo turinde abakoresha, dukore iperereza ku ikoreshwa nabi, dukurikize amategeko cyangwa dushyire mu bikorwa aya mabwiriza.',
      ],
    },
    listings: {
      heading: 'Amatangazo no gutangaza',
      p1: 'Abagurisha bagomba gusobanura imodoka mu ukuri, batangaze inenge cyangwa impinduka z’ingenzi kandi babe bafite ububasha bwo kuyitanga. Gutanga ntibituma gutangaza kwemezwa.',
      p2: 'Ni umuyobozi wemewe gusa ushobora gutangaza itangazo. Kuba witeguye gutangazwa bishobora gusaba umugurisha wemewe ukora, isuzuma ryarangiye n’amafoto yemewe. Sawa Cars ishobora kwanga, guhagarika, gukosora cyangwa kubika mu bubiko ibirimo bitari byo, bidafite umutekano, binyuranyije n’amategeko cyangwa bitajyanye n’ubuziranenge bwa platifomu.',
    },
    inspection: {
      heading: 'Amakuru y’isuzuma n’ibimenyetso',
      p1: 'Isuzuma rigaragaza ibyagaragaye byanditswe ku itariki y’isuzuma n’ibintu byasuzumwe koko. Ntabwo ari ubwishingire, ubwishingire bw’imiterere izaza cyangwa ikisimbura isuzuma ryigenga rya mekanike n’amategeko ry’umuguzi.',
      p2: '“Umugurisha wemewe” bisobanura ko platifomu yarangije isuzuma rya konti ryashyizweho; ntibisezeranya ko buri nteruro, imodoka cyangwa igikorwa kizaza cy’uwo muntu nta kaga bifite.',
    },
    contact: {
      heading: 'Gusangiza amakuru y’itumanaho n’itumanaho',
      p1: 'Umugurisha ahitamo niba itumanaho rya telefone cyangwa WhatsApp rishobora gutangazwa. Sawa Cars igaragaza umuyoboro washobojwe gusa ku mukoresha winjiye nyuma yo kwemera itangazo ry’ubucuruzi butaziguye kandi yandika iryo tangazwa ku mpamvu z’umutekano n’igenzura.',
      p2: 'Abakoresha ntibagomba guhutaza, gukangisha, kohereza spam, gukusanya amakuru y’itumanaho cyangwa kuyakoresha ku ntego itajyanye. Ubutumwa bwo muri porogaramu bushobora gutangwa raporo bukanasuzumwa mu igenzura nk’uko bisobanuwe muri politiki y’ibanga.',
    },
    transactions: {
      heading: 'Igurisha n’ikodeshwa byigenga',
      p1: 'Umuguzi n’umugurisha—cyangwa ukodesha n’utanga—ni bo bonyine bashinzwe kuboneka, isuzuma ry’inyongera, impapuro, igiciro, imisoro, ubwishyu, ingwate, amasezerano yanditse, gutanga, gufata, gusubiza, ihererekanya ry’umutungo, ubwishingizi no kubahiriza amategeko.',
      p2: 'Sawa Cars ntabwo yakira cyangwa ngo ibike amafaranga y’igicuruzwa kandi ntishobora guhagarika, gusubiza, gukuraho, gushyira mu bikorwa cyangwa gutanga icyemezo ku masezerano yakozwe n’abakoresha. Ibiciro by’ikodeshwa n’ingwate byerekanwa ni amakuru yatanzwe n’utanga kugeza igihe utanga abyemeje.',
    },
    prohibited: {
      heading: 'Imyitwarire ibujijwe',
      items: [
        'Uburiganya, kwigana, imodoka zibwe cyangwa impapuro z’ibinyoma.',
        'Ibisobanuro bishukana, inenge z’ingenzi zihishwe cyangwa amafoto yahinduwe.',
        'Malware, gukusanya amakuru mu buryo bw’ikoranabuhanga, kubangamira umutekano cyangwa kwinjira mu buryo butemewe.',
        'Ivangura, iterabwoba, guhutaza cyangwa ibirimo binyuranyije n’amategeko.',
        'Gukoresha amakuru y’itumanaho y’undi muntu hanze y’intego yatangajwe.',
      ],
    },
    reports: {
      heading: 'Raporo, ibimenyetso n’impaka',
      p1: 'Abakoresha bashobora gutanga raporo ku birimo bya platifomu, ubutumwa cyangwa konti. Sawa Cars ishobora kugenzura platifomu, kubika ibimenyetso no gufatanya n’ibisabwa n’amategeko.',
      p2: 'Kugenzura platifomu ntabwo ari ubukemurampaka bw’amasezerano y’abakoresha. Impaka z’ubwishyu, umutungo, gutanga cyangwa ikodeshwa zigomba gucungwa n’impande kandi, aho bikwiye, banki yabo, utanga ubwishyu, umwishingizi, umunyamategeko, umugenzuzi, urukiko cyangwa inzego zishinzwe umutekano.',
    },
    liability: {
      heading: 'Ibisobanuro n’inshingano',
      p1: 'Mu rugero rwemewe n’amategeko akurikizwa, amakuru y’isoko n’ibikoresho by’itumanaho bitangwa nta sezerano ko imodoka izakomeza kuboneka, ko umukoresha azarangiza igicuruzwa, cyangwa ko amasezerano yo hanze azagera ku gisubizo runaka.',
      p2: 'Buri mukoresha ashinzwe ibyemezo bye n’ibihombo biterwa n’ibivugwa, amasezerano, ubwishyu cyangwa imyitwarire ye itemewe n’amategeko. Nta kintu muri aya mabwiriza gikuraho uburiganya, ubugome bw’ubushake cyangwa uburenganzira cyangwa inshingano itegeko rikurikizwa ridatwemerera gukuraho.',
    },
    changes: {
      heading: 'Impinduka no kurangiza',
      p1: 'Dushobora gutunganya, kubuza cyangwa gukuraho ibikorwa no kuvugurura aya mabwiriza. Impinduka z’ingenzi zizamenyeshwa binyuze muri serivisi aho bishoboka. Inyandiko z’amateka zishobora kubikwa igihe bikenewe ku mutekano, igenzura, kubahiriza amategeko cyangwa ibirego byemewe.',
      p2: 'Ushobora gusaba gusiba konti binyuze muri porogaramu cyangwa urubuga, bitewe n’amategeko asaba kubika no gukuraho umwirondoro mu buryo budasubirwaho nk’uko bisobanuwe muri politiki y’ibanga.',
    },
    lawContact: {
      heading: 'Amategeko n’itumanaho',
      p1: 'Aya mabwiriza agamije gukorera munsi y’amategeko akurikizwa mu Rwanda. Ingingo ya nyuma y’itegeko rigenga no gukemura impaka igomba kwemezwa n’abavoka b’u Rwanda babifitiye ububasha mbere yo kohereza ku isoko.',
      p2before: 'Ibibazo ku aya mabwiriza bishobora koherezwa kuri ',
      p2after: '.',
      lastUpdated: 'Iheruka kuvugururwa: 23 Kanama 2026.',
    },
  },

  privacy: {
    meta: {
      title: 'Politiki y’ibanga',
      desc: 'Icyo Sawa Cars ikusanya, impamvu, uwabibona, n’uko impapuro z’umwirondoro zicungwa. Konti imwe muri porogaramu no ku rubuga.',
    },
    page: {
      title: 'Politiki y’ibanga',
      lede: 'Icyo dukusanya, impamvu tubibika, uwabibona — n’ubwitonzi bwihariye bufatwa ku mpapuro z’umwirondoro zituma iri soko rikora.',
    },
    scope: {
      heading: 'Aho bikurikizwa',
      p1: 'Iyi politiki ikubiyemo {{name}} — uru rubuga, porogaramu za Android na iOS, n’inyandiko ikipe yacu ibika mu bigo by’isuzuma. Byose uko ari bitatu bisangira konti imwe n’ububiko bumwe, bityo amakuru utanga ahantu hamwe ariboneka kuri wowe ahandi.',
    },
    collect: {
      heading: 'Icyo dukusanya',
      h1: 'Iyo ufunguye konti',
      list1: [
        'Izina ryawe, aderesi imeyili na numero ya telefone.',
        'Ijambobanga ryawe, ribitswe gusa nk’umubare w’ibanga. Nta muntu kuri Sawa Cars ushobora kurisoma, natwe ubwacu.',
      ],
      h2: 'Iyo wemeza umwirondoro wawe nk’umugurisha',
      list2: [
        'Amafoto y’imbere n’inyuma y’indangamuntu yawe, na selfie.',
      ],
      h3: 'Iyo ukoresha isoko',
      list3: [
        'Imodoka ubika, ubushakashatsi ubika, n’imenyesha ushyiraho.',
        'Gutangaza itumanaho n’umugurisha n’ibibazo by’ikodeshwa.',
        'Ubutumwa uhana n’abagurisha, abaguzi cyangwa ikipe yacu.',
        'Amakuru y’imodoka utanga, n’ibisubizo by’isuzuma abakanishi bacu banditse.',
      ],
      h4: 'Mu buryo bwikora',
      list4: [
        'Inyandiko z’ikoranabuhanga z’ibanze zikenerwa mu gukoresha no kurinda serivisi.',
        'Muri porogaramu gusa: kwinjira muri kamera iyo uhisemo gufata ifoto, na token y’imenyesha iyo wemeye imenyesha. Nta na kimwe kikoreshwa ikindi.',
      ],
    },
    why: {
      heading: 'Impamvu tubibika',
      list: [
        'Kugenzura ko umugurisha ari umuntu nyawe, umenyekana — ishingiro ry’isoko ryose.',
        'Gutangaza amatangazo nyayo na raporo z’isuzuma.',
        'Gushoboza itumanaho ritaziguye ku isoko n’ibisubizo by’abatanga ku bibazo by’ikodeshwa.',
        'Kohereza imenyesha wasabye: kugabanuka kw’ibiciro, ibihuye n’ubushakashatsi wabitse, ubutumwa.',
        'Gukora iperereza kuri raporo z’ibirimo bya platifomu cyangwa imyitwarire no kurinda uburiganya.',
        'Kubungabunga umutekano, uburenganzira n’inyandiko z’igenzura z’ubuyobozi.',
      ],
      p: 'Ntabwo dukora imyirondoro y’ubwamamaza, kandi ntitugurisha amakuru bwite kuri umuntu.',
    },
    identity: {
      heading: 'Impapuro z’umwirondoro, by’umwihariko',
      p: 'Amafoto y’indangamuntu na selfie ni byo bintu byoroshye kwibasirwa tubika, kandi bifatwa bijyanye n’ibyo.',
      list: [
        'Ntibigaragazwa ku itangazo, kandi ntibisangizwa abaguzi cyangwa abandi bagurisha.',
        'Kubibona bigarukira ku bagize ikipe ya Sawa basuzuma ubwemezi. Impapuro ziri inyuma y’inzira y’umuyobozi gusa; konti isanzwe ntishobora kuzigeraho ndetse n’umuhora utaziguye.',
        'Icyo abandi bakoresha babona ni igisubizo gusa: ikimenyetso cya “Umugurisha wemewe”, n’amanota y’icyizere ava kuri byo.',
        'Tubibika igihe konti yawe ikiri ifunguye no mu gihe cyose nyuma yaho kubika inyandiko ku bicuruzwa byarangiye bisaba, hanyuma tukabisiba.',
      ],
    },
    whoSees: {
      heading: 'Uwabona iki',
      items: [
        { lead: 'Abaguzi babona', rest: ' izina rigaragara ry’umugurisha, imiterere y’ubwemezi, amanota y’icyizere, amakuru y’umwirondoro w’umugurisha no kuboneka kw’umuyoboro w’itumanaho. Numero ya telefone cyangwa WhatsApp itangazwa gusa nyuma y’uburenganzira bw’umugurisha no kwemera kw’umuguzi.' },
        { lead: 'Abagurisha n’abatanga ikodeshwa babona', rest: ' amakuru akenewe mu gusubiza ubutumwa cyangwa ibibazo by’ikoboneka byaboherejwe.' },
        { lead: 'Ikipe yacu ibona', rest: ' ibisabwa mu gukoresha uruhererekane: ibyatanzwe, isuzuma, amatangazo, ibibazo, gutangaza itumanaho na — aho umutekano wa platifomu cyangwa raporo bibisaba — ibiganiro.' },
        { lead: 'Nta muntu ubona', rest: ' ijambobanga ryawe, impapuro zawe z’umwirondoro cyangwa ubushakashatsi wabitse uretse wowe n’abasuzuma bavuzwe haruguru.' },
      ],
    },
    sharing: {
      heading: 'Abandi barebwa',
      p1: 'Dukoresha umubare muto w’abatanga serivisi mu gukoresha platifomu — kubika, kohereza ubutumwa no kubika amafoto. Batunganya amakuru ku mabwiriza yacu gusa, kandi ntibemerewe kuyakoresha ku ntego zabo bwite.',
      p2: 'Dusangiza amakuru n’inzego z’ubuyobozi gusa aho amategeko abisaba, no n’Ikigo cy’Imisoro n’Amahoro cy’u Rwanda mu rugero ihererekanya ry’umutungo risaba.',
    },
    cookies: {
      heading: 'Cookies',
      p1before: 'Uru rubuga rushyiraho cookie imwe: cookie y’ikiciro ikomeza kukwinjiza. Ni ',
      p1strong: 'httpOnly',
      p1after: ', bivuze ko nta script ikorera muri mushakisha yawe ishobora kuyisoma — harimo n’iyangiza. Ikurwaho iyo usohotse.',
      p2: 'Nta cookies z’ubwamamaza kandi nta bakurikiranyi ba gatatu kuri uru rubuga.',
    },
    security: {
      heading: 'Uko birindwa',
      list: [
        'Amagambobanga ahindurwa umubare w’ibanga, ntabikwa mu buryo busomeka.',
        'Ibiciro ku rubuga bibikwa muri cookie ya httpOnly aho kubika mu bubiko bwa mushakisha.',
        'Buri gusaba kuri API yacu byemezwa kuri seriveri, kandi imirimo y’ubuyobozi igengwa n’uruhare aho guhisha umuhora.',
        'Impapuro z’umwirondoro zitangwa gusa ku basuzuma, ntabwo ku mugaragaro.',
      ],
      pbefore: 'Nta sisitemu itunganye. Niba wibwira ko konti yinjiwemo mu buryo butemewe, vugana na ',
      pafter: ' kandi tuzabikoraho uwo munsi.',
    },
    rights: {
      heading: 'Amahitamo yawe',
      item1: 'Ushobora kureba no gukosora umwirondoro wawe igihe icyo ari cyo cyose uhereye kuri konti yawe.',
      item2: 'Ushobora guhagarika imenyesha iryo ari ryo ryose utabuze imodoka cyangwa ubushakashatsi wabitse inyuma yaryo.',
      item3part1: 'Ushobora gufunga konti yawe ubwawe, igihe icyo ari cyo cyose kandi nta ruhushya rw’umuntu — kuri uru rubuga munsi ya ',
      item3link1: 'Umwirondoro → Funga konti',
      item3part2: ', cyangwa muri porogaramu munsi ya Igenamiterere → Ahantu h’akaga. Gufunga bitangira gukora ako kanya; amakuru yawe asibwa nyuma y’iminsi 30, kandi kugeza icyo gihe ushobora kongera kwinjira ukongera gufungura konti. Amakuru yuzuye ari kuri ',
      item3link2: 'paji yo gusiba konti',
      item3part3: '.',
      item4: 'Gufunga bikura amatangazo yawe ku isoko kandi bihagarika ako kanya kwerekana numero yawe ya telefone. Nyuma y’iminsi 30 gusiba bikura umwirondoro wawe, amakuru yawe y’itumanaho, impapuro zawe z’umwirondoro n’imodoka n’ubushakashatsi wabitse. Inyandiko z’ihererekanya ry’imodoka ryamaze kurangira zibikwa aho amategeko abisaba, izina ryawe n’amakuru y’itumanaho bivanwaho.',
      item5before: 'Ushobora gusaba kopi y’ibyo tubika kuri wowe wandikira ',
      item5after: '.',
    },
    children: {
      heading: 'Abana',
      p: 'Konti za Sawa Cars ni iz’abakuze. Ntitukusanya n’ubwenge amakuru y’umuntu uri munsi y’imyaka 18, kandi tuyasiba iyo tumenye ko dufite.',
    },
    contact: {
      heading: 'Impinduka n’itumanaho',
      p1: 'Tuzavugurura iyi paji igihe cyose platifomu ihinduye ibyo ikusanya, kandi ba nyir’konti bazamenyeshwa impinduka z’ingenzi.',
      p2before: 'Ibibazo ku ibanga bijya kuri ',
      p2mid: ', cyangwa kuri ',
      p2after: ' ku kindi kintu cyose.',
    },
  },

  guarantee: {
    meta: {
      title: 'Itangazo ry’isoko ry’ubucuruzi butaziguye',
      desc: 'Uruhare rwa Sawa Cars n’inshingano z’abaguzi, abagurisha n’abatanga ikodeshwa iyo bacuruza bitaziguye.',
    },
    page: {
      title: 'Itangazo ry’isoko ry’ubucuruzi butaziguye',
      lede: 'Sawa Cars itunganya ubwiza bw’amatangazo n’itumanaho, ariko ntabwo ari uruhande mu masezerano, ubwishyu cyangwa gutanga abakoresha bategura hagati yabo.',
    },
    noGuarantee: {
      heading: 'Nta bwishingire bw’igicuruzwa bwa Sawa',
      p1: 'Sawa Cars ntitanga ubwishingire bwo gusubiza mu minsi irindwi, ubwishingire bw’igicuruzwa, kubika amafaranga, isezerano ryo gusubiza cyangwa ubwishingire bw’ingwate y’ikodeshwa ku masezerano hagati y’abakoresha.',
      p2: 'Inyandiko y’isuzuma ry’imodoka isobanura ibyagaragaye ku gihe runaka. Ntabwo ari ubwishingire bw’imiterere izaza kandi ntisimbura isuzuma ryigenga cyangwa igenzura ry’amategeko.',
    },
    platformRole: {
      heading: 'Icyo platifomu ikora',
      items: [
        'Isuzuma umwirondoro w’umugurisha n’imiterere ya konti.',
        'Igenzura amatangazo y’imodoka ajya ku mugaragaro.',
        'Ibika amakuru y’itangazo, amafoto n’isuzuma.',
        'Itanga itumanaho ryo muri porogaramu no gutangaza telefone cyangwa WhatsApp bishingiye ku burenganzira.',
        'Yakira raporo ku birimo bya platifomu cyangwa imyitwarire kugira ngo bigenzurwe.',
      ],
    },
    userRole: {
      heading: 'Icyo abakoresha bafata icyemezo bakanacunga',
      items: [
        'Kureba imodoka, isuzuma ry’inyongera no kugenzura impapuro.',
        'Igiciro, uburyo bw’ubwishyu, ingwate n’ikimenyetso cy’ubwishyu.',
        'Amasezerano, ibivugwa, gutanga, gufata, gusubiza n’ihererekanya ry’umutungo.',
        'Ubwishingizi, imisoro, impushya n’ibindi bisabwa n’amategeko cyangwa amabwiriza.',
        'Guhagarika, gusubiza, ikirego cyangwa impaka izo ari zo zose zikomoka ku masezerano yigenga.',
      ],
    },
    safety: {
      heading: 'Mbere yo kohereza amafaranga',
      p1: 'Genzura undi muntu, imodoka, VIN, impapuro z’umwimerere z’uburenganzira n’uwakira ubwishyu wigenga. Shyira amasezerano y’ingenzi yose mu nyandiko kandi ubike kopi z’itumanaho n’inyemezabuguzi.',
      p2: 'Ntiwiringire ikimenyetso, itangazo, ubutumwa cyangwa amanota y’isuzuma nk’ikimenyetso ko ubwishyu bufite umutekano. Tanga raporo ku birimo bya platifomu bitera amakenga, ariko vugana na banki ikwiye, utanga mobile-money, polisi cyangwa umugenzuzi ako kanya iyo ubwishyu cyangwa icyaha bishobora kuba birimo.',
    },
    law: {
      heading: 'Uburenganzira amategeko abungabunga',
      p: 'Nta kintu muri iri tangazo gikuraho inshingano cyangwa uburenganzira bw’abaguzi itegeko rikurikizwa ridatwemerera umuntu gukuraho. Umuguzi, umugurisha cyangwa utanga akomeza gushinzwa amasezerano n’inshingano yemera mu masezerano ye bwite.',
    },
    related: {
      heading: 'Amakuru ajyanye',
      terms: 'Amabwiriza y’imikoreshereze',
      how: 'Uko isoko rikora',
      promise: 'Ubugenzuzi bw’umutekano w’isoko',
    },
  },
}

export const marketing: Record<Locale, Record<string, unknown>> = {
  en,
  rw,
  fr: {},
  sw: {},
  ko: {},
}
