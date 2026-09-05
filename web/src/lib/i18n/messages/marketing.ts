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

const fr = {
  about: {
    meta: {
      title: 'À propos de Sawa Cars',
      desc: 'Sawa Cars est une place de marché automobile vérifiée au Rwanda : notre équipe contrôle les vendeurs, les inspections et les preuves des annonces avant publication, puis les utilisateurs communiquent directement.',
    },
    header: {
      eyebrow: 'À propos',
      title: 'Une place de marché plus solide, avec des limites claires.',
      lede: 'Acheter une voiture d’occasion à Kigali peut obliger à se fier à des informations difficiles à vérifier. Sawa Cars ajoute des contrôles des vendeurs, des preuves d’inspection et une publication encadrée, tout en laissant la décision finale et la transaction aux utilisateurs.',
      browse: 'Voir les voitures certifiées',
      visit: 'Visiter un centre',
    },
    why: {
      eyebrow: 'Pourquoi elle existe',
      title: 'La provenance est ici le vrai problème',
      description: 'Pas le prix. Pas le choix. Savoir ce que la voiture devant vous a réellement vécu.',
      p1: 'Une grande partie des voitures qui circulent sur les routes rwandaises sont arrivées comme des importations d’occasion, beaucoup à conduite à droite en provenance du Japon. Elles ont un carnet d’entretien rédigé ailleurs, un compteur difficile à vérifier et des documents qu’un particulier n’a aucun moyen concret de contrôler avant de remettre son argent.',
      p2: 'Un site de petites annonces ne résout pas cela. Il ne fait que porter ce qu’on y publie : le vendeur rédige la description, le vendeur prend les photos, et le vendeur est la seule personne à avoir jamais regardé sous le capot.',
      p3: 'Sawa Cars a donc pris la position inverse. Nous prenons la voiture en charge, réalisons un contrôle en 150 points sur sa mécanique, sa carrosserie, son électronique et ses documents, la photographions dans une galerie utile et publions l’annonce uniquement après un examen par un administrateur. Le vendeur garde la maîtrise du prix. Nous gardons la maîtrise de la vérité.',
    },
    pipeline: {
      eyebrow: 'Comment une voiture arrive sur le site',
      title: 'Cinq étapes, aucune ne peut être sautée',
      description: 'Le même processus fonctionne derrière le tableau de bord vendeur, la file d’attente admin et ce site web — il n’y a pas de porte dérobée.',
      stages: [
        { title: 'Soumise', desc: 'Un vendeur vérifié nous envoie les détails de la voiture et le prix demandé.' },
        { title: 'Examinée', desc: 'Notre équipe lit la soumission et réserve un créneau d’inspection.' },
        { title: 'Inspectée', desc: 'Un mécanicien effectue le contrôle en 150 points au centre.' },
        { title: 'Documentée', desc: 'Une galerie claire et fidèle est ajoutée avec autant d’images utiles que le véhicule le nécessite.' },
        { title: 'Publiée', desc: 'Nous créons l’annonce, rapport joint, et elle est mise en ligne.' },
      ],
    },
    weDoNot: {
      eyebrow: 'Là où nous fixons la limite',
      title: 'Quatre choses que Sawa Cars ne fera pas',
      description: 'Ce qui rend cette place de marché digne de confiance tient surtout à ce qu’elle refuse de proposer.',
      items: [
        { title: 'Nous ne percevons pas de paiements', desc: 'Il n’y a ni paiement, ni passerelle de paiement, ni séquestre dans l’application ou le site. Acheteurs, vendeurs et loueurs décident du paiement directement, à leurs propres risques.' },
        { title: 'Nous ne laissons pas les vendeurs publier', desc: 'Un vendeur soumet une voiture. Seule l’équipe Sawa peut transformer une soumission en annonce, et uniquement après que la voiture est passée par un centre.' },
        { title: 'Nous n’affichons pas ce que nous n’avons pas inspecté', desc: 'Chaque annonce en ligne s’appuie sur un rapport en 150 points. Les voitures qui n’atteignent pas notre seuil ne sont pas publiées.' },
        { title: 'Nous ne gérons pas les contrats des utilisateurs', desc: 'Nous ne confirmons pas la vente ou la location, ne détenons pas d’acompte, ne rédigeons pas le contrat des parties, ne traitons pas le transfert de propriété et ne tranchons pas un litige de transaction externe.' },
      ],
    },
    centers: {
      eyebrow: 'Où nous travaillons',
      title: 'Centres d’inspection à Kigali',
      description: 'Ces sites accueillent les services d’inspection de la plateforme. Les utilisateurs décident indépendamment où et comment réaliser toute transaction ultérieure.',
      directions: 'Itinéraire et heures d’ouverture',
    },
  },

  promise: {
    meta: {
      title: 'Sécurité du marché',
      desc: 'Les contrôles de vérification, de preuve, de consentement et de publication utilisés par Sawa Cars.',
    },
    header: {
      eyebrow: 'Sécurité du marché',
      title: 'Des contrôles utiles. Des limites honnêtes.',
      lede: 'Sawa Cars réduit les risques évitables de la place de marché grâce à la vérification, aux preuves et à une publication encadrée. Ces contrôles améliorent l’information ; ils ne font pas de Sawa Cars une partie à l’accord.',
      browse: 'Voir les annonces vérifiées',
      notice: 'Lire l’avis de transaction directe',
    },
    controls: {
      eyebrow: 'Contrôles de la plateforme',
      title: 'Cinq niveaux avant et pendant le contact',
      description: 'Chacun est précis, vérifiable et limité à ce que la plateforme peut réellement contrôler.',
      items: [
        { title: 'Informations d’inspection', desc: 'Lorsqu’une inspection est réalisée, l’annonce affiche les contrôles enregistrés de la mécanique, de la carrosserie, de l’électronique et des documents afin que les acheteurs décident en meilleure connaissance de cause.' },
        { title: 'Vendeurs vérifiés', desc: 'L’identité du vendeur et le statut du compte sont contrôlés avant qu’un véhicule puisse être publié. Les prestataires professionnels reçoivent un contrôle de vérification distinct.' },
        { title: 'Preuves claires', desc: 'Les annonces distinguent les contrôles enregistrés des informations inconnues. Les acheteurs doivent tout de même vérifier le véhicule et les documents originaux avant de conclure un accord.' },
        { title: 'Contact fondé sur le consentement', desc: 'Le numéro de téléphone ou WhatsApp d’un vendeur n’est partagé que lorsque ce vendeur l’active et qu’un acheteur connecté accepte l’avis de transaction directe.' },
        { title: 'Publication encadrée', desc: 'Seuls des administrateurs autorisés peuvent publier des annonces. Les exigences d’identité, d’inspection et de photos sont revérifiées au moment de la publication.' },
      ],
    },
    sawaControls: {
      title: 'Ce que Sawa contrôle',
      body: 'L’accès aux comptes, le statut de vérification des vendeurs, les barrières de publication, la modération des annonces, la divulgation de contact fondée sur le consentement, les messages de la plateforme et l’historique d’audit.',
    },
    usersControl: {
      title: 'Ce que les utilisateurs contrôlent',
      body: 'Les visites, les vérifications indépendantes, la négociation, le contrat, le paiement, l’acompte, le transfert de propriété, la livraison, la prise en charge, la restitution, l’assurance et tout litige externe.',
    },
  },

  contact: {
    meta: {
      title: 'Nous contacter',
      desc: 'Appelez ou écrivez à l’équipe Sawa Cars sur WhatsApp au +250 788 308 611, ou par e-mail à contact@sawacars.com. Heures d’ouverture et adresses de nos centres d’inspection à Kigali.',
    },
    header: {
      eyebrow: 'Contact',
      title: 'Parlez à une personne',
      lede: 'Une seule ligne, gérée par l’équipe qui prend en charge les inspections, les annonces et les questions liées à la plateforme. Acheteurs et vendeurs utilisent leurs propres canaux de contact activés pour les discussions de transaction directe.',
    },
    hours: 'Lun–Sam · 8:00 – 18:00',
    band: {
      label: 'Appels & WhatsApp',
      whatsapp: 'Écrire sur WhatsApp',
      call: 'Appeler maintenant',
    },
    channels: {
      whatsapp: {
        label: 'WhatsApp',
        note: 'Le moyen le plus rapide de nous joindre. Envoyez le lien d’une annonce et nous vous dirons si la voiture est encore disponible.',
        badge: 'Le plus rapide',
      },
      call: {
        label: 'Nous appeler',
        note: 'La même ligne, répondue en personne pendant les heures des centres — {{hours}}.',
      },
      email: {
        label: 'E-mail',
        note: 'Pour tout ce qui nécessite une pièce jointe : comptes concessionnaires, partenariats, rapports d’inspection ou assistance de compte.',
      },
    },
    reach: {
      eyebrow: 'Nous joindre',
      title: 'Trois moyens, tous réels',
    },
    composer: {
      title: 'Écrivez ici',
      body: 'Ce site web ne gère pas de boîte de réception, donc rien n’est envoyé depuis cette page. Le bouton ouvre WhatsApp avec ce que vous avez écrit déjà saisi — c’est vous qui appuyez sur envoyer.',
      fieldLabel: 'Votre message',
      fieldHint: 'Incluez l’annonce dont vous parlez, s’il y en a une — cela évite un aller-retour.',
      placeholder: 'Bonjour Sawa Cars — je souhaite me renseigner sur…',
      submit: 'Ouvrir WhatsApp',
      emailPrefix: 'Vous préférez l’e-mail ? ',
      emailSuffix: ' joint la même équipe.',
    },
    expect: {
      eyebrow: 'À quoi s’attendre',
      title: 'Après nous avoir contactés',
      items: [
        { title: 'Sous 24 heures', body: 'Chaque demande d’assistance de la place de marché reçoit une réponse de l’équipe qui gère les centres d’inspection.' },
        { title: 'Une personne, pas un robot', body: 'La ligne est répondue par les personnes qui inspectent les véhicules et soutiennent la place de marché. Il n’y a pas de serveur vocal.' },
        { title: 'Un seul numéro, toujours', body: 'Nous ne vous demandons jamais de continuer sur un autre numéro ni d’envoyer de l’argent vers un compte communiqué par messagerie.' },
      ],
    },
    centers: {
      eyebrow: 'Venez nous voir',
      title: 'Nos centres',
      description: 'Les services d’inspection de la plateforme ont lieu ici. Contactez l’équipe avant de déposer un véhicule ; les transactions entre utilisateurs s’organisent indépendamment.',
    },
  },

  howItWorks: {
    meta: {
      title: 'Comment fonctionne Sawa Cars',
      desc: 'Comment fonctionnent les annonces de véhicules vérifiées, le contact direct avec le vendeur, les inspections et les demandes de disponibilité de location sur Sawa Cars.',
    },
    header: {
      eyebrow: 'Comment ça marche',
      title: 'D’abord l’information vérifiée. Ensuite l’accord direct.',
      lede: 'Sawa Cars contrôle les vendeurs, les inspections et les annonces. Acheteurs, vendeurs et loueurs communiquent, négocient et effectuent ensuite la transaction de façon indépendante. Il n’y a ni paiement, ni séquestre, ni contrat Sawa, ni garantie de transaction.',
      browse: 'Voir les voitures',
      submit: 'Soumettre un véhicule',
    },
    buyers: {
      eyebrow: 'Pour les acheteurs',
      title: 'De l’annonce à la transaction directe',
      description: 'Contacter un vendeur démarre une conversation. Cela ne réserve pas la voiture et ne crée pas de transaction avec Sawa Cars.',
    },
    buyingSteps: [
      { title: 'Examinez l’annonce', desc: 'Lisez les détails du véhicule, la galerie, les informations d’inspection et toute limitation avant de contacter le vendeur.' },
      { title: 'Contactez le vendeur', desc: 'Utilisez le chat de l’application, le téléphone ou WhatsApp lorsque le vendeur vérifié a activé ce canal.' },
      { title: 'Inspectez et vérifiez', desc: 'Organisez votre propre visite ou une inspection complémentaire et vérifiez le véhicule, le VIN, les documents originaux et la propriété de façon indépendante.' },
      { title: 'Convenez de conditions écrites', desc: 'Acheteur et vendeur décident directement du prix, du mode de paiement, de la livraison, du transfert de propriété et du contrat écrit.' },
      { title: 'Concluez la transaction de façon indépendante', desc: 'Sawa Cars ne reçoit ni ne détient l’argent de l’achat et n’est pas partie au contrat ou au litige qui en résulte.' },
    ],
    checks: {
      eyebrow: 'Gardez le contrôle',
      title: 'Quatre vérifications avant de vous engager',
      description: 'La vérification de la plateforme réduit l’incertitude ; elle ne remplace pas votre propre diligence ni un accord écrit.',
      items: [
        { title: 'Avant le contact', desc: 'Comparez l’annonce, la galerie, le rapport d’inspection et la vérification du vendeur. Traitez toute information inconnue comme inconnue.' },
        { title: 'Avant de payer', desc: 'Voyez le véhicule, vérifiez le VIN et les documents de propriété originaux, et confirmez indépendamment le destinataire et le mode de paiement.' },
        { title: 'Avant de signer', desc: 'Mettez le prix, l’état, les éléments inclus, le transfert, la livraison, l’acompte et les conditions d’annulation dans un accord écrit entre les parties.' },
        { title: 'Après l’accord', desc: 'Conservez des copies des messages, documents et reçus. Sawa Cars ne peut ni annuler ni trancher un paiement ou un contrat conclu en dehors de la plateforme.' },
      ],
    },
    sellers: {
      eyebrow: 'Pour les vendeurs',
      title: 'Publication encadrée, demandes directes',
      description: 'Soumettez le véhicule et effectuez la vérification. Un administrateur autorisé ne publie qu’une fois les contrôles de preuve configurés réussis.',
      responsibilityLabel: 'Votre responsabilité après la publication :',
      responsibilityBody: ' gardez l’annonce exacte, répondez avec honnêteté, signalez les changements et documentez tout accord indépendant avec l’acheteur.',
    },
    sellingSteps: [
      { title: 'Soumettez votre voiture', desc: 'Indiquez-nous la marque, le modèle, le kilométrage et votre prix demandé. Nous suggérons une fourchette à partir de ventes comparables réelles.' },
      { title: 'Réservez votre inspection', desc: 'Choisissez un centre et un créneau. Apportez la voiture et vos carnets d’entretien.' },
      { title: 'Nous inspectons et examinons', desc: 'Notre équipe enregistre l’inspection et ajoute une galerie d’images claire et fidèle. Il n’y a pas de nombre d’angles imposé.' },
      { title: 'Effectuez la vérification vendeur', desc: 'Avant la publication, notre équipe doit approuver votre contrôle d’identité unique et activer votre compte vendeur.' },
      { title: 'Un administrateur la publie', desc: 'La publication est conditionnée par la vérification du vendeur, l’achèvement de l’inspection et une galerie valide. Vous gardez la maîtrise du prix.' },
      { title: 'Vous gérez les demandes des acheteurs', desc: 'Discutez, négociez et concluez toute vente directement. Sawa Cars n’est pas partie à votre contrat ou à votre paiement.' },
    ],
    notParty: {
      title: 'Sawa Cars n’est pas partie aux transactions des utilisateurs',
      body: 'La plateforme ne détient pas d’argent, ne confirme pas une vente ou une location, n’émet pas le contrat des parties, ne garantit pas un acompte ou un véhicule, et n’assume aucune responsabilité pour un paiement, un accord, une livraison, une perte ou un litige externe. Rien ici ne supprime des droits ou des responsabilités que la loi applicable ne permet pas d’exclure.',
      cta: 'Lire l’intégralité des conditions du marché',
    },
  },

  terms: {
    meta: {
      title: 'Conditions d’utilisation du marché',
      desc: 'Conditions régissant les comptes, les annonces de véhicules vérifiées, le contact vendeur, les demandes de location et les transactions directes entre utilisateurs sur Sawa Cars.',
    },
    page: {
      title: 'Conditions d’utilisation du marché',
      lede: 'Des règles claires pour les annonces vérifiées et la communication directe — et une frontière claire autour des contrats et des paiements conclus de façon indépendante par les utilisateurs.',
    },
    scope: {
      heading: 'Champ d’application et acceptation',
      p1before: 'Ces conditions régissent l’utilisation du site web Sawa Cars, des applications mobiles et des services de place de marché associés. En créant un compte ou en utilisant une fonctionnalité authentifiée, vous acceptez ces conditions et la ',
      p1link: 'politique de confidentialité',
      p1after: '.',
      p2: 'La version actuelle des conditions du marché est affichée lorsqu’un utilisateur demande pour la première fois un canal de contact vendeur. Les modifications importantes de politique peuvent exiger une nouvelle acceptation.',
    },
    role: {
      heading: 'Le rôle limité de Sawa Cars',
      p1strong: 'Sawa Cars fournit une plateforme d’annonces vérifiées et de communication.',
      p1rest: ' Elle n’est pas l’acheteur, le vendeur, le loueur, le prestataire de paiement, l’agent de séquestre, l’assureur, le prêteur, le transporteur ni une partie à un contrat entre utilisateurs.',
      p2: 'Contacter un autre utilisateur n’est qu’une demande d’information. Cela ne réserve pas un véhicule, ne confirme pas la disponibilité, ne crée pas de vente ou de location et n’engage pas Sawa Cars.',
    },
    accounts: {
      heading: 'Comptes et admissibilité',
      items: [
        'Fournissez des informations exactes et à jour et gardez vos identifiants sécurisés.',
        'Utilisez votre propre identité et vos propres coordonnées.',
        'Signalez-nous rapidement tout accès non autorisé.',
        'La publication vendeur peut exiger une vérification d’identité ; les stocks de location exigent une vérification professionnelle distincte.',
        'Nous pouvons suspendre ou restreindre un compte pour protéger les utilisateurs, enquêter sur des abus, respecter la loi ou faire appliquer ces conditions.',
      ],
    },
    listings: {
      heading: 'Annonces et publication',
      p1: 'Les vendeurs doivent décrire le véhicule avec exactitude, divulguer les défauts ou changements importants et avoir le droit de le proposer. La soumission ne garantit pas la publication.',
      p2: 'Seul un administrateur autorisé peut publier une annonce. La publication peut exiger un vendeur vérifié actif, une inspection terminée et une galerie d’images valide. Sawa Cars peut rejeter, suspendre, corriger ou archiver un contenu inexact, dangereux, illégal ou non conforme aux normes de la plateforme.',
    },
    inspection: {
      heading: 'Informations d’inspection et badges',
      p1: 'Une inspection reflète les observations enregistrées à la date de l’inspection et les éléments réellement contrôlés. Ce n’est pas une garantie, ni une garantie d’état futur, ni un substitut à l’examen mécanique et juridique indépendant de l’acheteur.',
      p2: '« Vendeur vérifié » signifie que la plateforme a effectué ses contrôles de compte configurés ; cela ne promet pas que chaque déclaration, véhicule ou action future de cette personne est sans risque.',
    },
    contact: {
      heading: 'Partage de contact et communications',
      p1: 'Un vendeur choisit si un contact par téléphone ou WhatsApp peut être divulgué. Sawa Cars ne révèle un canal activé qu’à un utilisateur authentifié après acceptation de l’avis de transaction directe et enregistre cette divulgation à des fins de sécurité et d’audit.',
      p2: 'Les utilisateurs ne doivent pas harceler, menacer, envoyer du spam, extraire des données de contact ni les utiliser à des fins étrangères. Les messages dans l’application peuvent être signalés et examinés pour modération, comme décrit dans la politique de confidentialité.',
    },
    transactions: {
      heading: 'Ventes et locations indépendantes',
      p1: 'L’acheteur et le vendeur — ou le locataire et le prestataire — sont seuls responsables de la disponibilité, de l’inspection complémentaire, des documents, du prix, des taxes, du paiement, des acomptes, des conditions écrites, de la livraison, de la prise en charge, de la restitution, du transfert de propriété, de l’assurance et de la conformité réglementaire.',
      p2: 'Sawa Cars ne perçoit ni ne détient de fonds de transaction et ne peut annuler, rembourser, inverser, faire exécuter ni trancher un accord conclu par les utilisateurs. Les tarifs de location et les acomptes affichés sont des informations fournies par le prestataire jusqu’à ce que celui-ci les confirme.',
    },
    prohibited: {
      heading: 'Conduites interdites',
      items: [
        'Fraude, usurpation d’identité, véhicules volés ou faux documents.',
        'Descriptions trompeuses, défauts importants dissimulés ou images manipulées.',
        'Logiciels malveillants, extraction automatisée, atteinte à la sécurité ou accès non autorisé.',
        'Discrimination, menaces, harcèlement ou contenu illégal.',
        'Utilisation des coordonnées d’une autre personne en dehors de la finalité pour laquelle elles ont été divulguées.',
      ],
    },
    reports: {
      heading: 'Signalements, preuves et litiges',
      p1: 'Les utilisateurs peuvent signaler du contenu, des messages ou des comptes de la plateforme. Sawa Cars peut modérer la plateforme, conserver des preuves et coopérer avec les demandes légales.',
      p2: 'La modération de la plateforme n’est pas un arbitrage du contrat des utilisateurs. Un litige de paiement, de propriété, de livraison ou de location doit être traité par les parties et, le cas échéant, leur banque, prestataire de paiement, assureur, avocat, régulateur, tribunal ou autorité de police.',
    },
    liability: {
      heading: 'Avertissements et responsabilité',
      p1: 'Dans la mesure permise par la loi applicable, les informations de la place de marché et les outils de communication sont fournis sans promesse qu’un véhicule restera disponible, qu’un utilisateur conclura une transaction ou qu’un accord externe aboutira à un résultat particulier.',
      p2: 'Chaque utilisateur est responsable de ses propres décisions et des pertes causées par ses propres déclarations, accords, paiements ou conduites illégales. Rien dans ces conditions n’exclut la fraude, la faute intentionnelle ni un droit ou une responsabilité que la loi applicable ne nous permet pas d’exclure.',
    },
    changes: {
      heading: 'Modifications et résiliation',
      p1: 'Nous pouvons améliorer, restreindre ou retirer des fonctionnalités et mettre à jour ces conditions. Les mises à jour importantes seront communiquées via le service lorsque cela est possible. Des enregistrements historiques peuvent être conservés lorsque cela est nécessaire pour la sécurité, l’audit, la conformité légale ou des réclamations légitimes.',
      p2: 'Vous pouvez demander la suppression de votre compte via l’application ou le site web, sous réserve des règles de conservation légalement requises et d’anonymisation irréversible décrites dans la politique de confidentialité.',
    },
    lawContact: {
      heading: 'Droit applicable et contact',
      p1: 'Ces conditions sont destinées à s’appliquer sous les lois en vigueur au Rwanda. La clause finale de droit applicable et de règlement des litiges doit être confirmée par un conseil rwandais qualifié avant le lancement en production.',
      p2before: 'Les questions relatives à ces conditions peuvent être envoyées à ',
      p2after: '.',
      lastUpdated: 'Dernière mise à jour : 23 août 2026.',
    },
  },

  privacy: {
    meta: {
      title: 'Politique de confidentialité',
      desc: 'Ce que Sawa Cars collecte, pourquoi, qui peut le voir et comment les pièces d’identité sont traitées. Un seul compte pour l’application et le site web.',
    },
    page: {
      title: 'Politique de confidentialité',
      lede: 'Ce que nous collectons, pourquoi nous le conservons, qui peut le voir — et le soin particulier apporté aux pièces d’identité qui font fonctionner cette place de marché.',
    },
    scope: {
      heading: 'Champ d’application',
      p1: 'Cette politique couvre {{name}} — ce site web, les applications Android et iOS, et les dossiers que notre équipe conserve dans les centres d’inspection. Les trois partagent un seul compte et une seule base de données, de sorte que les informations que vous fournissez à un endroit vous sont accessibles ailleurs.',
    },
    collect: {
      heading: 'Ce que nous collectons',
      h1: 'Lorsque vous créez un compte',
      list1: [
        'Votre nom, votre adresse e-mail et votre numéro de téléphone.',
        'Votre mot de passe, stocké uniquement sous forme de hachage cryptographique. Personne chez Sawa Cars ne peut le lire, nous y compris.',
      ],
      h2: 'Lorsque vous vérifiez votre identité en tant que vendeur',
      list2: [
        'Des photographies du recto et du verso de votre carte d’identité nationale, ainsi qu’un selfie.',
      ],
      h3: 'Lorsque vous utilisez la place de marché',
      list3: [
        'Les voitures que vous enregistrez, les recherches que vous enregistrez et les alertes que vous activez.',
        'Les divulgations de contact vendeur et les demandes de disponibilité de location.',
        'Les messages que vous échangez avec les vendeurs, les acheteurs ou notre équipe.',
        'Les détails de véhicule que vous soumettez et les résultats d’inspection que nos mécaniciens enregistrent.',
      ],
      h4: 'Automatiquement',
      list4: [
        'Des journaux techniques de base nécessaires pour exploiter et sécuriser le service.',
        'Dans l’application uniquement : l’accès à la caméra lorsque vous choisissez de prendre une photo, et un jeton de notification push si vous autorisez les notifications. Ni l’un ni l’autre n’est utilisé à d’autres fins.',
      ],
    },
    why: {
      heading: 'Pourquoi nous les conservons',
      list: [
        'Pour vérifier qu’un vendeur est une personne réelle et identifiable — le fondement de toute la place de marché.',
        'Pour publier des annonces et des rapports d’inspection exacts.',
        'Pour permettre les communications directes de la place de marché et les réponses des prestataires aux demandes de location.',
        'Pour envoyer les alertes que vous avez demandées : baisses de prix, correspondances de recherches enregistrées, messages.',
        'Pour enquêter sur les signalements relatifs au contenu ou à la conduite de la plateforme et prévenir la fraude.',
        'Pour tenir des registres de sécurité, de consentement et d’audit administratif.',
      ],
      p: 'Nous ne créons pas de profils publicitaires et nous ne vendons de données personnelles à personne.',
    },
    identity: {
      heading: 'Les pièces d’identité, en particulier',
      p: 'Les photographies d’identité et les selfies sont les données les plus sensibles que nous détenons, et elles sont traitées en conséquence.',
      list: [
        'Elles ne sont jamais affichées sur une annonce et jamais partagées avec des acheteurs ou d’autres vendeurs.',
        'L’accès est restreint aux membres de l’équipe Sawa qui examinent les vérifications. Les documents se trouvent derrière une route réservée aux administrateurs ; un compte ordinaire ne peut y accéder, même avec un lien direct.',
        'Ce que les autres utilisateurs voient n’est que le résultat : une mention « Vendeur vérifié » et le score de confiance qui en découle.',
        'Nous les conservons tant que votre compte est ouvert et aussi longtemps ensuite que la tenue des registres sur les ventes conclues l’exige, puis nous les supprimons.',
      ],
    },
    whoSees: {
      heading: 'Qui voit quoi',
      items: [
        { lead: 'Les acheteurs voient', rest: ' le nom affiché d’un vendeur, son statut de vérification, son score de confiance, les informations de profil vendeur et la disponibilité des canaux de contact. Un numéro de téléphone ou WhatsApp n’est divulgué qu’après le consentement du vendeur et l’acceptation de l’acheteur.' },
        { lead: 'Les vendeurs et les loueurs voient', rest: ' les informations nécessaires pour répondre aux messages ou aux demandes de disponibilité qui leur sont envoyés.' },
        { lead: 'Notre équipe voit', rest: ' ce qui est nécessaire au fonctionnement du processus : soumissions, inspections, annonces, demandes, divulgations de contact et — lorsque la sécurité de la plateforme ou un signalement l’exige — les conversations.' },
        { lead: 'Personne ne voit', rest: ' votre mot de passe, vos pièces d’identité ni vos recherches enregistrées, à part vous et les examinateurs mentionnés ci-dessus.' },
      ],
    },
    sharing: {
      heading: 'Qui d’autre intervient',
      p1: 'Nous faisons appel à un petit nombre de prestataires de services pour exploiter la plateforme — hébergement, distribution des messages et stockage des images. Ils traitent les données uniquement selon nos instructions et ne sont pas autorisés à les utiliser à leurs propres fins.',
      p2: 'Nous partageons des informations avec les autorités uniquement lorsque la loi l’exige, et avec la Rwanda Revenue Authority dans la mesure où un transfert de propriété le requiert.',
    },
    cookies: {
      heading: 'Cookies',
      p1before: 'Ce site web dépose un seul cookie : un cookie de session qui vous maintient connecté. Il est ',
      p1strong: 'httpOnly',
      p1after: ', ce qui signifie qu’aucun script s’exécutant dans votre navigateur ne peut le lire — y compris un script malveillant. Il est supprimé lorsque vous vous déconnectez.',
      p2: 'Il n’y a pas de cookies publicitaires ni de traceurs tiers sur ce site.',
    },
    security: {
      heading: 'Comment elles sont protégées',
      list: [
        'Les mots de passe sont hachés, jamais stockés sous une forme lisible.',
        'Les sessions sur le web sont conservées dans un cookie httpOnly plutôt que dans le stockage du navigateur.',
        'Chaque requête vers notre API est autorisée sur le serveur, et les fonctions d’administration sont protégées par rôle plutôt qu’en masquant un lien.',
        'Les pièces d’identité ne sont servies qu’aux examinateurs, jamais publiquement.',
      ],
      pbefore: 'Aucun système n’est parfait. Si vous pensez qu’un compte a été compromis, contactez ',
      pafter: ' et nous agirons le jour même.',
    },
    rights: {
      heading: 'Vos choix',
      item1: 'Vous pouvez consulter et corriger votre profil à tout moment depuis votre compte.',
      item2: 'Vous pouvez désactiver n’importe quelle alerte sans perdre la voiture ou la recherche enregistrée qui la sous-tend.',
      item3part1: 'Vous pouvez fermer votre compte vous-même, à tout moment et sans l’approbation de quiconque — sur ce site web sous ',
      item3link1: 'Profil → Fermer le compte',
      item3part2: ', ou dans l’application sous Paramètres → Zone de danger. La fermeture prend effet immédiatement ; vos données sont effacées 30 jours plus tard, et jusque-là vous pouvez vous reconnecter et rouvrir le compte. Tous les détails figurent sur la ',
      item3link2: 'page de suppression de compte',
      item3part3: '.',
      item4: 'La fermeture retire vos annonces de la place de marché et cesse immédiatement d’afficher votre numéro de téléphone. Au bout de 30 jours, l’effacement supprime votre profil, vos coordonnées, vos pièces d’identité ainsi que vos voitures et recherches enregistrées. Les enregistrements de transferts de véhicules déjà réalisés sont conservés lorsque la loi l’exige, votre nom et vos coordonnées en étant retirés.',
      item5before: 'Vous pouvez demander une copie de ce que nous détenons à votre sujet en écrivant à ',
      item5after: '.',
    },
    children: {
      heading: 'Enfants',
      p: 'Les comptes Sawa Cars sont réservés aux adultes. Nous ne collectons pas sciemment d’informations sur toute personne de moins de 18 ans, et nous les supprimons si nous découvrons en avoir.',
    },
    contact: {
      heading: 'Modifications et contact',
      p1: 'Nous mettrons cette page à jour chaque fois que la plateforme modifiera ce qu’elle collecte, et les titulaires de compte seront informés des changements importants.',
      p2before: 'Les questions relatives à la confidentialité vont à ',
      p2mid: ', ou à ',
      p2after: ' pour tout le reste.',
    },
  },

  guarantee: {
    meta: {
      title: 'Avis de place de marché en transaction directe',
      desc: 'Le rôle de Sawa Cars et les responsabilités des acheteurs, vendeurs et loueurs lorsqu’ils effectuent une transaction directement.',
    },
    page: {
      title: 'Avis de place de marché en transaction directe',
      lede: 'Sawa Cars améliore la qualité des annonces et la communication, mais n’est pas partie au contrat, au paiement ou à la livraison que les utilisateurs organisent entre eux.',
    },
    noGuarantee: {
      heading: 'Aucune garantie de transaction Sawa',
      p1: 'Sawa Cars ne fournit pas de garantie de retour de sept jours, de garantie de transaction, de séquestre, de promesse de remboursement ni de garantie de caution de location pour un accord entre utilisateurs.',
      p2: 'Un rapport d’inspection de véhicule décrit des observations faites à un instant donné. Ce n’est pas une garantie d’état futur et ne remplace pas une inspection indépendante ou des vérifications juridiques.',
    },
    platformRole: {
      heading: 'Ce que fait la plateforme',
      items: [
        'Contrôle l’identité du vendeur et le statut du compte.',
        'Détermine quelles annonces de véhicules deviennent publiques.',
        'Stocke les informations d’annonce, de galerie et d’inspection.',
        'Fournit la messagerie dans l’application et la divulgation par téléphone ou WhatsApp fondée sur le consentement.',
        'Reçoit les signalements sur le contenu ou la conduite de la plateforme aux fins de modération.',
      ],
    },
    userRole: {
      heading: 'Ce que les utilisateurs décident et gèrent',
      items: [
        'La visite du véhicule, l’inspection complémentaire et la vérification des documents.',
        'Le prix, le mode de paiement, l’acompte et la preuve de paiement.',
        'Le contrat, les déclarations, la livraison, la prise en charge, la restitution et le transfert de propriété.',
        'L’assurance, les taxes, les licences et les autres exigences légales ou réglementaires.',
        'Toute annulation, remboursement, réclamation ou litige découlant de l’accord indépendant.',
      ],
    },
    safety: {
      heading: 'Avant de transférer de l’argent',
      p1: 'Vérifiez l’autre partie, le véhicule, le VIN, les documents de propriété originaux et le destinataire du paiement de façon indépendante. Mettez toutes les conditions importantes par écrit et conservez des copies des communications et des reçus.',
      p2: 'Ne vous fiez pas à un badge, une annonce, un message ou un score d’inspection comme preuve que le paiement est sûr. Signalez le contenu suspect de la plateforme, mais contactez immédiatement la banque, le prestataire de mobile-money, la police ou le régulateur approprié lorsqu’un paiement ou une infraction peut être en cause.',
    },
    law: {
      heading: 'Droits préservés par la loi',
      p: 'Rien dans cet avis n’exclut la responsabilité ou les droits des consommateurs que la loi applicable ne permet pas d’exclure. L’acheteur, le vendeur ou le prestataire reste responsable des promesses et obligations qu’il accepte dans son propre accord.',
    },
    related: {
      heading: 'Informations connexes',
      terms: 'Conditions d’utilisation',
      how: 'Comment fonctionne la place de marché',
      promise: 'Contrôles de sécurité du marché',
    },
  },
}

const sw = {
  about: {
    meta: {
      title: 'Kuhusu Sawa Cars',
      desc: 'Sawa Cars ni soko la magari lililothibitishwa nchini Rwanda: timu yetu hukagua wauzaji, ukaguzi na ushahidi wa matangazo kabla ya kuchapishwa, kisha watumiaji huwasiliana moja kwa moja.',
    },
    header: {
      eyebrow: 'Kuhusu',
      title: 'Soko imara zaidi, lenye mipaka iliyo wazi.',
      lede: 'Kununua gari lililotumika Kigali kunaweza kumaanisha kuamini taarifa ambazo ni vigumu kuzithibitisha. Sawa Cars huongeza ukaguzi wa wauzaji, ushahidi wa ukaguzi na uchapishaji unaodhibitiwa, huku ikiacha uamuzi wa mwisho na muamala mikononi mwa watumiaji.',
      browse: 'Angalia magari yaliyothibitishwa',
      visit: 'Tembelea kituo',
    },
    why: {
      eyebrow: 'Kwa nini lipo',
      title: 'Chanzo cha gari ndicho tatizo gumu hapa',
      description: 'Si bei. Si uchaguzi. Ni kujua gari lililo mbele yako limepitia nini hasa.',
      p1: 'Sehemu kubwa ya magari yaliyo barabarani nchini Rwanda yaliingia kama magari ya mtumba yaliyoagizwa, mengi yakiwa na usukani wa kulia kutoka Japani. Yanakuja na historia ya matengenezo iliyoandikwa mahali pengine, spidomita ambayo ni vigumu kuithibitisha, na nyaraka ambazo mnunuzi wa kawaida hana njia halisi ya kuzikagua kabla ya kutoa pesa.',
      p2: 'Tovuti ya matangazo haisuluhishi hilo. Hubeba chochote kilichowekwa humo: muuzaji anaandika maelezo, muuzaji anapiga picha, na muuzaji ndiye mtu pekee aliyewahi kuangalia chini ya boneti.',
      p3: 'Kwa hivyo Sawa Cars ilichukua msimamo tofauti. Tunapokea gari, tunafanya ukaguzi wa pointi 150 kwa mekaniki yake, mwili, elektroniki na nyaraka, tunalipiga picha katika ghala la picha muhimu, na tunachapisha tangazo tu baada ya ukaguzi wa msimamizi. Muuzaji anabaki na udhibiti wa bei. Sisi tunabaki na udhibiti wa ukweli.',
    },
    pipeline: {
      eyebrow: 'Jinsi gari linavyofika kwenye tovuti',
      title: 'Hatua tano, hakuna inayoweza kurukwa',
      description: 'Mchakato uleule hufanya kazi nyuma ya dashibodi ya muuzaji, foleni ya msimamizi na tovuti hii — hakuna mlango wa kando.',
      stages: [
        { title: 'Limewasilishwa', desc: 'Muuzaji aliyethibitishwa anatutumia maelezo ya gari na bei anayoomba.' },
        { title: 'Limekaguliwa', desc: 'Timu yetu inasoma wasilisho na kuweka nafasi ya ukaguzi.' },
        { title: 'Limekaguliwa kimekaniki', desc: 'Fundi anafanya ukaguzi wa pointi 150 kituoni.' },
        { title: 'Limerekodiwa', desc: 'Ghala la picha lililo wazi na la kweli linaongezwa likiwa na picha muhimu nyingi kadri gari linavyohitaji.' },
        { title: 'Limechapishwa', desc: 'Tunatengeneza tangazo, ripoti imeambatanishwa, na linaenda hewani.' },
      ],
    },
    weDoNot: {
      eyebrow: 'Mahali tunapoweka mstari',
      title: 'Mambo manne ambayo Sawa Cars haitafanya',
      description: 'Mengi yanayolifanya soko hili kuaminika ni yale linayokataa kuyatoa.',
      items: [
        { title: 'Hatuchukui malipo', desc: 'Hakuna malipo, lango la malipo wala udhamini wa pesa katika programu au tovuti. Wanunuzi, wauzaji na watoa kodi huamua malipo moja kwa moja kwa hatari yao wenyewe.' },
        { title: 'Hatuwaruhusu wauzaji kuchapisha', desc: 'Muuzaji anawasilisha gari. Ni timu ya Sawa pekee inayoweza kugeuza wasilisho kuwa tangazo, na tu baada ya gari kuwa limefika kituoni.' },
        { title: 'Hatutangazi tusichokagua', desc: 'Kila tangazo lililo hewani lina ripoti ya pointi 150 nyuma yake. Magari yasiyofikia kiwango chetu hayachapishwi.' },
        { title: 'Hatusimamii mikataba ya watumiaji', desc: 'Hatuthibitishi mauzo au kodi, hatushiki amana, hatuandiki mkataba wa pande husika, hatushughulikii uhamishaji wa umiliki wala hatuamui mgogoro wa muamala wa nje.' },
      ],
    },
    centers: {
      eyebrow: 'Mahali tunapofanyia kazi',
      title: 'Vituo vya ukaguzi Kigali',
      description: 'Maeneo haya hukaribisha huduma za ukaguzi za jukwaa. Watumiaji huamua wenyewe wapi na jinsi ya kukamilisha muamala wowote wa baadaye.',
      directions: 'Maelekezo na saa za kufunguliwa',
    },
  },

  promise: {
    meta: {
      title: 'Usalama wa soko',
      desc: 'Vidhibiti vya uthibitishaji, ushahidi, ridhaa na uchapishaji vinavyotumiwa na Sawa Cars.',
    },
    header: {
      eyebrow: 'Usalama wa soko',
      title: 'Vidhibiti vyenye manufaa. Mipaka ya ukweli.',
      lede: 'Sawa Cars hupunguza hatari za soko zinazoweza kuepukwa kupitia uthibitishaji, ushahidi na uchapishaji unaodhibitiwa. Vidhibiti hivyo huboresha taarifa; haviifanyi Sawa Cars kuwa sehemu ya muamala.',
      browse: 'Angalia matangazo yaliyothibitishwa',
      notice: 'Soma ilani ya biashara ya moja kwa moja',
    },
    controls: {
      eyebrow: 'Vidhibiti vya jukwaa',
      title: 'Tabaka tano kabla na wakati wa mawasiliano',
      description: 'Kila kimoja ni mahususi, kinachoweza kukaguliwa na kimewekewa mipaka kwa kile jukwaa linaloweza kudhibiti hasa.',
      items: [
        { title: 'Taarifa za ukaguzi', desc: 'Pale ukaguzi umekamilika, tangazo huonyesha ukaguzi uliorekodiwa wa mekaniki, mwili, elektroniki na nyaraka ili wanunuzi wafanye uamuzi wenye taarifa zaidi.' },
        { title: 'Wauzaji waliothibitishwa', desc: 'Utambulisho wa muuzaji na hali ya akaunti hukaguliwa kabla gari haliwezi kuchapishwa. Watoa huduma wa kibiashara hupokea kidhibiti tofauti cha uthibitishaji.' },
        { title: 'Ushahidi ulio wazi', desc: 'Matangazo hutofautisha ukaguzi uliorekodiwa na taarifa zisizojulikana. Wanunuzi bado wanapaswa kuthibitisha gari na nyaraka za asili kabla ya kukubaliana muamala.' },
        { title: 'Mawasiliano yanayotegemea ridhaa', desc: 'Namba ya simu au WhatsApp ya muuzaji hushirikishwa tu pale muuzaji huyo anapowasha na mnunuzi aliyeingia anakubali ilani ya biashara ya moja kwa moja.' },
        { title: 'Uchapishaji unaodhibitiwa', desc: 'Ni wasimamizi walioidhinishwa pekee wanaoweza kuchapisha matangazo. Mahitaji ya utambulisho, ukaguzi na picha hukaguliwa tena wakati wa uchapishaji.' },
      ],
    },
    sawaControls: {
      title: 'Kile Sawa inachodhibiti',
      body: 'Ufikiaji wa akaunti, hali ya uthibitishaji wa muuzaji, vizuizi vya uchapishaji, uangalizi wa matangazo, ufichuaji wa mawasiliano unaotegemea ridhaa, jumbe za jukwaa na historia ya ukaguzi.',
    },
    usersControl: {
      title: 'Kile watumiaji wanachodhibiti',
      body: 'Kutazama, ukaguzi wa kujitegemea, majadiliano, mkataba, malipo, amana, uhamishaji wa umiliki, uwasilishaji, uchukuaji, urejeshaji, bima na mgogoro wowote wa nje.',
    },
  },

  contact: {
    meta: {
      title: 'Wasiliana nasi',
      desc: 'Piga simu au andikia timu ya Sawa Cars kupitia WhatsApp kwa +250 788 308 611, au tuma barua pepe contact@sawacars.com. Saa za kufunguliwa na anwani za vituo vyetu vya ukaguzi Kigali.',
    },
    header: {
      eyebrow: 'Wasiliana',
      title: 'Ongea na mtu',
      lede: 'Laini moja, inayojibiwa na timu inayoshughulikia ukaguzi, matangazo na maswali ya jukwaa. Wanunuzi na wauzaji hutumia njia zao za mawasiliano zilizowashwa kwa mazungumzo ya muamala wa moja kwa moja.',
    },
    hours: 'Jumatatu–Jumamosi · 8:00 – 18:00',
    band: {
      label: 'Simu & WhatsApp',
      whatsapp: 'Andika kupitia WhatsApp',
      call: 'Piga simu sasa',
    },
    channels: {
      whatsapp: {
        label: 'WhatsApp',
        note: 'Njia ya haraka zaidi ya kutufikia. Tuma kiungo cha tangazo nasi tutakuambia kama gari bado lipo.',
        badge: 'Haraka zaidi',
      },
      call: {
        label: 'Tupigie simu',
        note: 'Laini ileile, inayojibiwa na mtu wakati wa saa za vituo — {{hours}}.',
      },
      email: {
        label: 'Barua pepe',
        note: 'Kwa chochote kinachohitaji kiambatisho: akaunti za wafanyabiashara, ushirikiano, ripoti za ukaguzi, au msaada wa akaunti.',
      },
    },
    reach: {
      eyebrow: 'Tufikie',
      title: 'Njia tatu, zote ni za kweli',
    },
    composer: {
      title: 'Andika hapa',
      body: 'Tovuti hii haiendeshi kisanduku cha barua za mawasiliano, kwa hivyo hakuna kinachotumwa kutoka ukurasa huu. Kitufe hufungua WhatsApp na kile ulichokiandika tayari kikiwa kimeandikwa — wewe ndiye unabonyeza tuma.',
      fieldLabel: 'Ujumbe wako',
      fieldHint: 'Jumuisha tangazo unaloliuliza, kama lipo — kunaokoa safari ya kwenda na kurudi.',
      placeholder: 'Habari Sawa Cars — ningependa kuuliza kuhusu…',
      submit: 'Fungua WhatsApp',
      emailPrefix: 'Unapendelea barua pepe? ',
      emailSuffix: ' hufikia timu ileile.',
    },
    expect: {
      eyebrow: 'Cha kutarajia',
      title: 'Baada ya kuwasiliana nasi',
      items: [
        { title: 'Ndani ya saa 24', body: 'Kila ombi la msaada la soko hupata jibu kutoka kwa timu inayoendesha vituo vya ukaguzi.' },
        { title: 'Mtu, si roboti', body: 'Laini hujibiwa na watu wanaokagua magari na kusaidia soko. Hakuna mfumo wa kupiga simu wa kiotomatiki.' },
        { title: 'Namba moja, kila wakati', body: 'Kamwe hatukuombi uendelee kwenye namba nyingine au kutuma pesa kwenye akaunti iliyotolewa kwenye gumzo.' },
      ],
    },
    centers: {
      eyebrow: 'Njoo utuone',
      title: 'Vituo vyetu',
      description: 'Huduma za ukaguzi za jukwaa hufanyika hapa. Wasiliana na timu kabla ya kuacha gari; miamala ya watumiaji hupangwa kwa kujitegemea.',
    },
  },

  howItWorks: {
    meta: {
      title: 'Jinsi Sawa Cars inavyofanya kazi',
      desc: 'Jinsi matangazo ya magari yaliyothibitishwa, mawasiliano ya moja kwa moja na muuzaji, ukaguzi na maombi ya upatikanaji wa kodi yanavyofanya kazi kwenye Sawa Cars.',
    },
    header: {
      eyebrow: 'Jinsi inavyofanya kazi',
      title: 'Taarifa iliyothibitishwa kwanza. Makubaliano ya moja kwa moja baadaye.',
      lede: 'Sawa Cars hukagua wauzaji, ukaguzi na matangazo. Wanunuzi, wauzaji na watoa kodi kisha huwasiliana, kujadiliana na kufanya muamala kwa kujitegemea. Hakuna malipo, udhamini wa pesa, mkataba wa Sawa wala dhamana ya muamala.',
      browse: 'Angalia magari',
      submit: 'Wasilisha gari',
    },
    buyers: {
      eyebrow: 'Kwa wanunuzi',
      title: 'Kutoka tangazo hadi muamala wa moja kwa moja',
      description: 'Kuwasiliana na muuzaji huanzisha mazungumzo. Hakuhifadhi gari wala kutengeneza muamala na Sawa Cars.',
    },
    buyingSteps: [
      { title: 'Kagua tangazo', desc: 'Soma maelezo ya gari, ghala la picha, taarifa za ukaguzi na vikwazo vyovyote kabla ya kuwasiliana na muuzaji.' },
      { title: 'Wasiliana na muuzaji', desc: 'Tumia gumzo la ndani ya programu, simu au WhatsApp pale muuzaji aliyethibitishwa amewasha njia hiyo.' },
      { title: 'Kagua na thibitisha', desc: 'Panga kutazama kwako mwenyewe au ukaguzi wa ziada na kagua gari, VIN, nyaraka za asili na umiliki kwa kujitegemea.' },
      { title: 'Kubaliana masharti yaliyoandikwa', desc: 'Mnunuzi na muuzaji huamua bei, njia ya malipo, uwasilishaji, uhamishaji wa umiliki na mkataba ulioandikwa moja kwa moja.' },
      { title: 'Kamilisha muamala kwa kujitegemea', desc: 'Sawa Cars haipokei wala kushika pesa za ununuzi na si sehemu ya mkataba au mgogoro utokanao.' },
    ],
    checks: {
      eyebrow: 'Baki na udhibiti',
      title: 'Ukaguzi manne kabla ya kujitolea',
      description: 'Uthibitishaji wa jukwaa hupunguza kutokuwa na uhakika; haubadilishi uangalifu wako mwenyewe wala makubaliano yaliyoandikwa.',
      items: [
        { title: 'Kabla ya mawasiliano', desc: 'Linganisha tangazo, ghala la picha, rekodi ya ukaguzi na uthibitishaji wa muuzaji. Chukulia taarifa zisizojulikana kama zisizojulikana.' },
        { title: 'Kabla ya kulipa', desc: 'Ona gari, thibitisha VIN na nyaraka za asili za umiliki, na thibitisha kwa kujitegemea mpokeaji na njia ya malipo.' },
        { title: 'Kabla ya kutia saini', desc: 'Weka bei, hali, vitu vilivyojumuishwa, uhamishaji, uwasilishaji, amana na masharti ya kughairi katika makubaliano yaliyoandikwa kati ya pande husika.' },
        { title: 'Baada ya makubaliano', desc: 'Weka nakala za jumbe, nyaraka na risiti. Sawa Cars haiwezi kubatilisha wala kuamua malipo au mkataba uliofanywa nje ya jukwaa.' },
      ],
    },
    sellers: {
      eyebrow: 'Kwa wauzaji',
      title: 'Uchapishaji unaodhibitiwa, maulizo ya moja kwa moja',
      description: 'Wasilisha gari na kamilisha uthibitishaji. Msimamizi aliyeidhinishwa huchapisha tu baada ya ukaguzi wa ushahidi uliowekwa kupita.',
      responsibilityLabel: 'Wajibu wako baada ya uchapishaji:',
      responsibilityBody: ' weka tangazo likiwa sahihi, jibu kwa ukweli, fichua mabadiliko, na andika makubaliano yoyote ya kujitegemea na mnunuzi.',
    },
    sellingSteps: [
      { title: 'Wasilisha gari lako', desc: 'Tuambie chapa, muundo, umbali uliosafiriwa na bei unayoomba. Tunapendekeza kiwango kutoka mauzo halisi yanayolinganishwa.' },
      { title: 'Weka nafasi ya ukaguzi', desc: 'Chagua kituo na nafasi. Leta gari na rekodi zako za matengenezo.' },
      { title: 'Tunakagua na kupitia', desc: 'Timu yetu hurekodi ukaguzi na kuongeza ghala la picha lililo wazi na la kweli. Hakuna idadi maalumu ya pembe.' },
      { title: 'Kamilisha uthibitishaji wa muuzaji', desc: 'Kabla ya uchapishaji, timu yetu lazima iidhinishe ukaguzi wako wa utambulisho wa mara moja na kuwasha akaunti yako ya muuzaji.' },
      { title: 'Msimamizi analichapisha', desc: 'Uchapishaji hutegemea uthibitishaji wa muuzaji, kukamilika kwa ukaguzi na ghala halali. Unabaki na udhibiti wa bei.' },
      { title: 'Unasimamia maulizo ya wanunuzi', desc: 'Ongea, jadiliana na kubaliana mauzo yoyote moja kwa moja. Sawa Cars si sehemu ya mkataba au malipo yako.' },
    ],
    notParty: {
      title: 'Sawa Cars si sehemu ya miamala ya watumiaji',
      body: 'Jukwaa halishiki pesa, halithibitishi mauzo au kodi, halitoi mkataba wa pande husika, halidhamini amana au gari, wala halikubali wajibu kwa malipo, makubaliano, uwasilishaji, hasara au mgogoro wa nje. Hakuna chochote hapa kinachoondoa haki au wajibu ambao sheria inayotumika haiwezi kuondoa.',
      cta: 'Soma masharti kamili ya soko',
    },
  },

  terms: {
    meta: {
      title: 'Masharti ya huduma ya soko',
      desc: 'Masharti yanayosimamia akaunti, matangazo ya magari yaliyothibitishwa, mawasiliano ya muuzaji, maombi ya kodi na miamala ya moja kwa moja ya watumiaji kwenye Sawa Cars.',
    },
    page: {
      title: 'Masharti ya huduma ya soko',
      lede: 'Kanuni zilizo wazi za matangazo yaliyothibitishwa na mawasiliano ya moja kwa moja—na mpaka ulio wazi kuzunguka mikataba na malipo yanayofanywa kwa kujitegemea na watumiaji.',
    },
    scope: {
      heading: 'Wigo na kukubali',
      p1before: 'Masharti haya husimamia matumizi ya tovuti ya Sawa Cars, programu za simu na huduma za soko zinazohusiana. Kwa kufungua akaunti au kutumia kipengele kinachohitaji kuingia, unakubali masharti haya na ',
      p1link: 'sera ya faragha',
      p1after: '.',
      p2: 'Toleo la sasa la masharti ya soko huonyeshwa pale mtumiaji anapoomba kwa mara ya kwanza njia ya mawasiliano ya muuzaji. Mabadiliko makubwa ya sera yanaweza kuhitaji kukubali tena.',
    },
    role: {
      heading: 'Nafasi ndogo ya Sawa Cars',
      p1strong: 'Sawa Cars hutoa jukwaa la matangazo yaliyothibitishwa na mawasiliano.',
      p1rest: ' Si mnunuzi, muuzaji, mtoa kodi, mchakataji wa malipo, wakala wa udhamini wa pesa, mbima, mkopeshaji, kampuni ya usafirishaji wala sehemu ya mkataba kati ya watumiaji.',
      p2: 'Kuwasiliana na mtumiaji mwingine ni ombi la taarifa tu. Hakuhifadhi gari, hakuthibitishi upatikanaji, hakutengenezi mauzo au kodi, wala hakumfungi Sawa Cars.',
    },
    accounts: {
      heading: 'Akaunti na ustahiki',
      items: [
        'Toa taarifa sahihi na za sasa na weka salama vitambulisho vyako vya kuingia.',
        'Tumia utambulisho wako mwenyewe na taarifa zako za mawasiliano.',
        'Tujulishe mara moja kuhusu ufikiaji usioidhinishwa.',
        'Uchapishaji wa muuzaji unaweza kuhitaji uthibitishaji wa utambulisho; hisa za kodi zinahitaji uthibitishaji wa kibiashara tofauti.',
        'Tunaweza kusimamisha au kuzuia akaunti ili kuwalinda watumiaji, kuchunguza matumizi mabaya, kuzingatia sheria au kutekeleza masharti haya.',
      ],
    },
    listings: {
      heading: 'Matangazo na uchapishaji',
      p1: 'Wauzaji lazima waeleze gari kwa ukweli, wafichue kasoro au mabadiliko makubwa na wawe na mamlaka ya kulitoa. Kuwasilisha hakuhakikishi uchapishaji.',
      p2: 'Ni msimamizi aliyeidhinishwa pekee anayeweza kuchapisha tangazo. Utayari wa uchapishaji unaweza kuhitaji muuzaji aliyethibitishwa aliye hai, ukaguzi uliokamilika na ghala halali la picha. Sawa Cars inaweza kukataa, kusimamisha, kusahihisha au kuweka kwenye kumbukumbu maudhui yasiyo sahihi, yasiyo salama, yasiyo halali au yasiyolingana na viwango vya jukwaa.',
    },
    inspection: {
      heading: 'Taarifa za ukaguzi na beji',
      p1: 'Ukaguzi huonyesha uchunguzi uliorekodiwa katika tarehe ya ukaguzi na vitu vilivyokaguliwa hasa. Si dhamana, si uhakikisho wa hali ya baadaye wala si mbadala wa ukaguzi wa kimekaniki na wa kisheria wa kujitegemea wa mnunuzi.',
      p2: '“Muuzaji aliyethibitishwa” humaanisha kuwa jukwaa lilikamilisha ukaguzi wake wa akaunti uliowekwa; haliahidi kuwa kila taarifa, gari au kitendo cha baadaye cha mtu huyo hakina hatari.',
    },
    contact: {
      heading: 'Kushirikisha mawasiliano na mawasiliano',
      p1: 'Muuzaji huchagua kama mawasiliano ya simu au WhatsApp yanaweza kufichuliwa. Sawa Cars hufichua njia iliyowashwa tu kwa mtumiaji aliyethibitishwa baada ya kukubali ilani ya biashara ya moja kwa moja na hurekodi ufichuaji huo kwa madhumuni ya usalama na ukaguzi.',
      p2: 'Watumiaji hawapaswi kusumbua, kutishia, kutuma spam, kukusanya data za mawasiliano au kuitumia kwa madhumuni yasiyohusiana. Jumbe za ndani ya programu zinaweza kuripotiwa na kukaguliwa kwa uangalizi kama ilivyoelezwa katika sera ya faragha.',
    },
    transactions: {
      heading: 'Mauzo na kodi za kujitegemea',
      p1: 'Mnunuzi na muuzaji—au mkodishaji na mtoa huduma—ndio pekee wanaowajibika kwa upatikanaji, ukaguzi zaidi, nyaraka, bei, kodi za serikali, malipo, amana, masharti yaliyoandikwa, uwasilishaji, uchukuaji, urejeshaji, uhamishaji wa umiliki, bima na kuzingatia kanuni.',
      p2: 'Sawa Cars haikusanyi wala haishiki fedha za muamala na haiwezi kughairi, kurejesha, kubatilisha, kutekeleza wala kuamua makubaliano yaliyofanywa na watumiaji. Viwango vya kodi na amana vinavyoonyeshwa ni taarifa zilizotolewa na mtoa huduma hadi mtoa huduma atakapozithibitisha.',
    },
    prohibited: {
      heading: 'Mwenendo uliokatazwa',
      items: [
        'Udanganyifu, kujifanya mtu mwingine, magari yaliyoibwa au nyaraka za uongo.',
        'Maelezo yanayopotosha, kasoro kubwa zilizofichwa au picha zilizogeuzwa.',
        'Programu hasidi, ukusanyaji wa kiotomatiki, kuingilia usalama au ufikiaji usioidhinishwa.',
        'Ubaguzi, vitisho, unyanyasaji au maudhui yasiyo halali.',
        'Kutumia data za mawasiliano za mtu mwingine nje ya madhumuni yaliyofichuliwa.',
      ],
    },
    reports: {
      heading: 'Ripoti, ushahidi na migogoro',
      p1: 'Watumiaji wanaweza kuripoti maudhui ya jukwaa, jumbe au akaunti. Sawa Cars inaweza kuangalia jukwaa, kuhifadhi ushahidi na kushirikiana na maombi halali.',
      p2: 'Uangalizi wa jukwaa si usuluhishi wa mkataba wa watumiaji. Mgogoro wa malipo, umiliki, uwasilishaji au kodi lazima ushughulikiwe na pande husika na, inapofaa, benki yao, mtoa malipo, mbima, wakili, mdhibiti, mahakama au mamlaka ya kutekeleza sheria.',
    },
    liability: {
      heading: 'Kanusho na wajibu',
      p1: 'Kwa kadiri inayoruhusiwa na sheria inayotumika, taarifa za soko na zana za mawasiliano hutolewa bila ahadi kuwa gari litabaki linapatikana, kuwa mtumiaji atakamilisha muamala, au kuwa makubaliano ya nje yatafikia matokeo fulani.',
      p2: 'Kila mtumiaji anawajibika kwa maamuzi yake mwenyewe na kwa hasara zinazotokana na taarifa, makubaliano, malipo au mwenendo wake usio halali. Hakuna chochote katika masharti haya kinachoondoa udanganyifu, utovu wa nidhamu wa makusudi wala haki au dhima yoyote ambayo sheria inayotumika hairuhusu kuondoa.',
    },
    changes: {
      heading: 'Mabadiliko na kusitisha',
      p1: 'Tunaweza kuboresha, kuzuia au kuondoa vipengele na kusasisha masharti haya. Masasisho makubwa yatawasilishwa kupitia huduma inapowezekana. Kumbukumbu za kihistoria zinaweza kuhifadhiwa zinapohitajika kwa usalama, ukaguzi, kuzingatia sheria au madai halali.',
      p2: 'Unaweza kuomba kufuta akaunti kupitia programu au tovuti, kwa kuzingatia kanuni za kuhifadhi zinazohitajika kisheria na za kuondoa utambulisho zisizoweza kubatilishwa zilizoelezwa katika sera ya faragha.',
    },
    lawContact: {
      heading: 'Sheria na mawasiliano',
      p1: 'Masharti haya yamekusudiwa kufanya kazi chini ya sheria zinazotumika nchini Rwanda. Kifungu cha mwisho cha sheria inayosimamia na utatuzi wa migogoro lazima kithibitishwe na mwanasheria wa Rwanda mwenye sifa kabla ya uzinduzi wa uzalishaji.',
      p2before: 'Maswali kuhusu masharti haya yanaweza kutumwa kwa ',
      p2after: '.',
      lastUpdated: 'Ilisasishwa mwisho: 23 Agosti 2026.',
    },
  },

  privacy: {
    meta: {
      title: 'Sera ya faragha',
      desc: 'Kile Sawa Cars inachokusanya, kwa nini, nani anaweza kukiona, na jinsi nyaraka za utambulisho zinavyoshughulikiwa. Akaunti moja kwa programu na tovuti.',
    },
    page: {
      title: 'Sera ya faragha',
      lede: 'Kile tunachokusanya, kwa nini tunakihifadhi, nani anaweza kukiona — na uangalifu maalum unaotolewa kwa nyaraka za utambulisho zinazolifanya soko hili kufanya kazi.',
    },
    scope: {
      heading: 'Wigo',
      p1: 'Sera hii inashughulikia {{name}} — tovuti hii, programu za Android na iOS, na kumbukumbu ambazo timu yetu huhifadhi katika vituo vya ukaguzi. Zote tatu zinashiriki akaunti moja na hifadhidata moja, kwa hivyo taarifa unazotoa mahali pamoja zinapatikana kwako mahali pengine.',
    },
    collect: {
      heading: 'Kile tunachokusanya',
      h1: 'Unapofungua akaunti',
      list1: [
        'Jina lako, anwani ya barua pepe na namba ya simu.',
        'Nywila yako, iliyohifadhiwa tu kama alama ya kriptografia. Hakuna mtu Sawa Cars anayeweza kuisoma, sisi tukiwemo.',
      ],
      h2: 'Unapothibitisha utambulisho wako kama muuzaji',
      list2: [
        'Picha za mbele na nyuma ya kitambulisho chako cha taifa, na selfie.',
      ],
      h3: 'Unapotumia soko',
      list3: [
        'Magari unayohifadhi, utafutaji unaohifadhi, na arifa unazowasha.',
        'Ufichuaji wa mawasiliano ya muuzaji na maombi ya upatikanaji wa kodi.',
        'Jumbe unazobadilishana na wauzaji, wanunuzi au timu yetu.',
        'Maelezo ya gari unayowasilisha, na matokeo ya ukaguzi ambayo mafundi wetu wanarekodi.',
      ],
      h4: 'Kiotomatiki',
      list4: [
        'Kumbukumbu za kiufundi za msingi zinazohitajika kuendesha na kulinda huduma.',
        'Katika programu pekee: ufikiaji wa kamera unapochagua kupiga picha, na tokeni ya arifa ibukizi ukiruhusu arifa. Hakuna kati ya hizo kinachotumika kwa jambo lingine.',
      ],
    },
    why: {
      heading: 'Kwa nini tunakihifadhi',
      list: [
        'Kuthibitisha kuwa muuzaji ni mtu halisi, anayeweza kutambulika — msingi wa soko lote.',
        'Kuchapisha matangazo sahihi na ripoti za ukaguzi.',
        'Kuwezesha mawasiliano ya moja kwa moja ya soko na majibu ya watoa huduma kwa maombi ya kodi.',
        'Kutuma arifa ulizoziomba: kushuka kwa bei, ulinganifu wa utafutaji uliohifadhiwa, jumbe.',
        'Kuchunguza ripoti kuhusu maudhui au mwenendo wa jukwaa na kuzuia udanganyifu.',
        'Kudumisha kumbukumbu za usalama, ridhaa na ukaguzi wa kiutawala.',
      ],
      p: 'Hatujengi wasifu wa matangazo, na hatuuzi taarifa binafsi kwa mtu yeyote.',
    },
    identity: {
      heading: 'Nyaraka za utambulisho, hasa',
      p: 'Picha za kitambulisho na selfie ndizo kitu nyeti zaidi tunachohifadhi, na zinashughulikiwa ipasavyo.',
      list: [
        'Hazionyeshwi kamwe kwenye tangazo, na hazishirikishwi kamwe na wanunuzi au wauzaji wengine.',
        'Ufikiaji umewekewa mipaka kwa wanachama wa timu ya Sawa wanaokagua uthibitishaji. Nyaraka ziko nyuma ya njia ya msimamizi pekee; akaunti ya kawaida haiwezi kuzifikia hata kwa kiungo cha moja kwa moja.',
        'Kile watumiaji wengine wanachokiona ni matokeo pekee: alama ya “Muuzaji aliyethibitishwa”, na alama ya uaminifu inayotokana nayo.',
        'Tunazihifadhi wakati akaunti yako iko wazi na kwa muda mrefu baadaye kadri utunzaji wa kumbukumbu za mauzo yaliyokamilika unavyohitaji, kisha tunazifuta.',
      ],
    },
    whoSees: {
      heading: 'Nani anaona nini',
      items: [
        { lead: 'Wanunuzi wanaona', rest: ' jina la kuonyesha la muuzaji, hali ya uthibitishaji, alama ya uaminifu, taarifa za wasifu wa muuzaji na upatikanaji wa njia ya mawasiliano. Namba ya simu au WhatsApp hufichuliwa tu baada ya ridhaa ya muuzaji na kukubali kwa mnunuzi.' },
        { lead: 'Wauzaji na watoa kodi wanaona', rest: ' taarifa zinazohitajika kujibu jumbe au maombi ya upatikanaji yaliyotumwa kwao.' },
        { lead: 'Timu yetu inaona', rest: ' kinachohitajika kuendesha mchakato: mawasilisho, ukaguzi, matangazo, maombi, ufichuaji wa mawasiliano na — pale usalama wa jukwaa au ripoti inavyohitaji — mazungumzo.' },
        { lead: 'Hakuna mtu anayeona', rest: ' nywila yako, nyaraka zako za utambulisho au utafutaji wako uliohifadhiwa isipokuwa wewe na wakaguzi waliotajwa hapo juu.' },
      ],
    },
    sharing: {
      heading: 'Nani mwingine anahusika',
      p1: 'Tunatumia idadi ndogo ya watoa huduma kuendesha jukwaa — kuhifadhi, kufikisha jumbe na kuhifadhi picha. Wanachakata data kwa maagizo yetu pekee, na hawaruhusiwi kuzitumia kwa madhumuni yao wenyewe.',
      p2: 'Tunashiriki taarifa na mamlaka pale tu sheria inapohitaji, na na Rwanda Revenue Authority kwa kadiri uhamishaji wa umiliki unavyohitaji.',
    },
    cookies: {
      heading: 'Vidakuzi',
      p1before: 'Tovuti hii huweka kidakuzi kimoja: kidakuzi cha kipindi kinachokuweka umeingia. Ni ',
      p1strong: 'httpOnly',
      p1after: ', ambayo ina maana hakuna hati inayoendeshwa kwenye kivinjari chako inayoweza kukisoma — ikiwemo hasidi. Kinaondolewa unapotoka.',
      p2: 'Hakuna vidakuzi vya matangazo wala vifuatiliaji vya wahusika wengine kwenye tovuti hii.',
    },
    security: {
      heading: 'Jinsi zinavyolindwa',
      list: [
        'Nywila hufanywa alama za siri, hazihifadhiwi kamwe katika hali inayosomeka.',
        'Vipindi kwenye wavuti huhifadhiwa katika kidakuzi cha httpOnly badala ya kwenye hifadhi ya kivinjari.',
        'Kila ombi kwa API yetu huidhinishwa kwenye seva, na kazi za msimamizi hulindwa kwa jukumu badala ya kuficha kiungo.',
        'Nyaraka za utambulisho hutolewa kwa wakaguzi pekee, kamwe si hadharani.',
      ],
      pbefore: 'Hakuna mfumo ulio kamili. Ikiwa unaamini akaunti imevunjwa, wasiliana na ',
      pafter: ' nasi tutachukua hatua siku hiyohiyo.',
    },
    rights: {
      heading: 'Chaguo zako',
      item1: 'Unaweza kutazama na kusahihisha wasifu wako wakati wowote kutoka kwa akaunti yako.',
      item2: 'Unaweza kuzima arifa yoyote bila kupoteza gari au utafutaji uliohifadhiwa nyuma yake.',
      item3part1: 'Unaweza kufunga akaunti yako mwenyewe, wakati wowote na bila idhini ya mtu yeyote — kwenye tovuti hii chini ya ',
      item3link1: 'Wasifu → Funga akaunti',
      item3part2: ', au katika programu chini ya Mipangilio → Eneo la hatari. Kufunga huanza kutumika mara moja; data yako inafutwa siku 30 baadaye, na hadi wakati huo unaweza kuingia tena na kufungua upya akaunti. Maelezo kamili yako kwenye ',
      item3link2: 'ukurasa wa kufuta akaunti',
      item3part3: '.',
      item4: 'Kufunga huondoa matangazo yako kutoka sokoni na husimamisha mara moja kuonyeshwa kwa namba yako ya simu. Baada ya siku 30, ufutaji huondoa wasifu wako, taarifa zako za mawasiliano, nyaraka zako za utambulisho na magari na utafutaji uliohifadhi. Kumbukumbu za uhamishaji wa magari zilizokamilika tayari zinahifadhiwa pale sheria inapohitaji, jina lako na taarifa zako za mawasiliano zikiondolewa humo.',
      item5before: 'Unaweza kuomba nakala ya kile tunachokishika kukuhusu kwa kuandikia ',
      item5after: '.',
    },
    children: {
      heading: 'Watoto',
      p: 'Akaunti za Sawa Cars ni kwa ajili ya watu wazima. Hatukusanyi kwa makusudi taarifa kutoka kwa mtu yeyote aliye chini ya miaka 18, na tunazifuta tukigundua kuwa tumezikusanya.',
    },
    contact: {
      heading: 'Mabadiliko na mawasiliano',
      p1: 'Tutasasisha ukurasa huu kila jukwaa linapobadilisha kile linachokusanya, na wamiliki wa akaunti watajulishwa kuhusu mabadiliko makubwa.',
      p2before: 'Maswali kuhusu faragha huenda kwa ',
      p2mid: ', au kwa ',
      p2after: ' kwa jambo lingine lolote.',
    },
  },

  guarantee: {
    meta: {
      title: 'Ilani ya soko la biashara ya moja kwa moja',
      desc: 'Nafasi ya Sawa Cars na wajibu wa wanunuzi, wauzaji na watoa kodi wanapofanya muamala moja kwa moja.',
    },
    page: {
      title: 'Ilani ya soko la biashara ya moja kwa moja',
      lede: 'Sawa Cars huboresha ubora wa matangazo na mawasiliano, lakini si sehemu ya mkataba, malipo au uwasilishaji ambao watumiaji hupanga kati yao.',
    },
    noGuarantee: {
      heading: 'Hakuna dhamana ya muamala ya Sawa',
      p1: 'Sawa Cars haitoi dhamana ya kurejesha ya siku saba, dhamana ya muamala, udhamini wa pesa, ahadi ya kurejesha pesa wala dhamana ya amana ya kodi kwa makubaliano kati ya watumiaji.',
      p2: 'Rekodi ya ukaguzi wa gari huelezea uchunguzi uliofanywa kwa wakati fulani. Si dhamana ya hali ya baadaye na haibadilishi ukaguzi wa kujitegemea au ukaguzi wa kisheria.',
    },
    platformRole: {
      heading: 'Kile jukwaa hufanya',
      items: [
        'Hukagua utambulisho wa muuzaji na hali ya akaunti.',
        'Hudhibiti ni matangazo yapi ya magari yanayokuwa ya umma.',
        'Huhifadhi taarifa za tangazo, ghala la picha na ukaguzi.',
        'Hutoa ujumbe wa ndani ya programu na ufichuaji wa simu au WhatsApp unaotegemea ridhaa.',
        'Hupokea ripoti kuhusu maudhui au mwenendo wa jukwaa kwa ajili ya uangalizi.',
      ],
    },
    userRole: {
      heading: 'Kile watumiaji huamua na kusimamia',
      items: [
        'Kutazama gari, ukaguzi wa ziada na uthibitishaji wa nyaraka.',
        'Bei, njia ya malipo, amana na uthibitisho wa malipo.',
        'Mkataba, uwakilishaji, uwasilishaji, uchukuaji, urejeshaji na uhamishaji wa umiliki.',
        'Bima, kodi za serikali, leseni na mahitaji mengine ya kisheria au ya kikanuni.',
        'Kughairi, kurejesha pesa, madai au mgogoro wowote unaotokana na makubaliano ya kujitegemea.',
      ],
    },
    safety: {
      heading: 'Kabla ya kuhamisha pesa',
      p1: 'Thibitisha mhusika mwingine, gari, VIN, nyaraka za asili za umiliki na mpokeaji wa malipo kwa kujitegemea. Weka masharti yote makubwa kwa maandishi na weka nakala za mawasiliano na risiti.',
      p2: 'Usitegemee beji, tangazo, ujumbe au alama ya ukaguzi kama uthibitisho kuwa malipo ni salama. Ripoti maudhui ya jukwaa yenye shaka, lakini wasiliana na benki, mtoa huduma wa pesa za simu, polisi au mdhibiti anayefaa mara moja pale malipo au uhalifu unaweza kuhusika.',
    },
    law: {
      heading: 'Haki ambazo sheria huhifadhi',
      p: 'Hakuna chochote katika ilani hii kinachoondoa dhima au haki za watumiaji ambazo sheria inayotumika hairuhusu mtu kuziondoa. Mnunuzi, muuzaji au mtoa huduma anabaki kuwajibika kwa ahadi na wajibu anaokubali katika makubaliano yake mwenyewe.',
    },
    related: {
      heading: 'Taarifa zinazohusiana',
      terms: 'Masharti ya huduma',
      how: 'Jinsi soko linavyofanya kazi',
      promise: 'Vidhibiti vya usalama wa soko',
    },
  },
}

const ko = {
  about: {
    meta: {
      title: 'Sawa Cars 소개',
      desc: 'Sawa Cars는 르완다의 인증 차량 마켓플레이스입니다. 저희 팀이 게시 전에 판매자, 검사, 매물 근거를 검토한 뒤 이용자가 직접 소통합니다.',
    },
    header: {
      eyebrow: '소개',
      title: '명확한 경계를 갖춘, 더 튼튼한 마켓플레이스.',
      lede: 'Kigali에서 중고차를 사는 일은 검증하기 어려운 정보를 믿어야 하는 상황이 되곤 합니다. Sawa Cars는 판매자 확인, 검사 근거, 통제된 게시를 더하면서도 최종 결정과 거래는 이용자에게 맡깁니다.',
      browse: '인증 차량 둘러보기',
      visit: '센터 방문하기',
    },
    why: {
      eyebrow: '존재하는 이유',
      title: '여기서 어려운 문제는 이력입니다',
      description: '가격이 아닙니다. 선택지도 아닙니다. 눈앞의 차가 실제로 무엇을 겪었는지 아는 것입니다.',
      p1: '르완다 도로를 달리는 차량의 상당수는 중고 수입차로 들어왔으며, 그중 다수는 일본에서 온 우핸들 차량입니다. 이 차들은 다른 곳에서 작성된 정비 이력, 검증하기 어려운 주행거리계, 그리고 개인 구매자가 돈을 건네기 전에 실질적으로 확인할 방법이 없는 서류를 가지고 있습니다.',
      p2: '광고 게시판 사이트는 그 문제를 해결하지 못합니다. 올라온 것을 그대로 실어 나를 뿐입니다. 설명도 판매자가 쓰고, 사진도 판매자가 찍으며, 보닛 아래를 들여다본 사람은 판매자뿐입니다.',
      p3: '그래서 Sawa Cars는 정반대의 입장을 택했습니다. 저희는 차량을 인수해 기계, 차체, 전자장치, 서류에 걸친 150개 항목 점검을 실시하고, 유용한 사진 갤러리로 촬영하며, 관리자 검토를 거친 뒤에야 매물을 게시합니다. 판매자는 가격의 통제권을 갖습니다. 저희는 진실의 통제권을 갖습니다.',
    },
    pipeline: {
      eyebrow: '차량이 사이트에 올라오는 과정',
      title: '다섯 단계, 어느 것도 건너뛸 수 없습니다',
      description: '판매자 대시보드, 관리자 대기열, 그리고 이 웹사이트 뒤에서 동일한 절차가 작동합니다 — 옆문은 없습니다.',
      stages: [
        { title: '제출', desc: '인증 판매자가 차량 정보와 희망 가격을 보내옵니다.' },
        { title: '검토', desc: '저희 팀이 제출 내용을 읽고 검사 시간을 예약합니다.' },
        { title: '검사', desc: '정비사가 센터에서 150개 항목 점검을 실시합니다.' },
        { title: '문서화', desc: '차량에 필요한 만큼의 유용한 이미지로 명확하고 진실한 갤러리를 추가합니다.' },
        { title: '게시', desc: '보고서를 첨부해 매물을 만들고, 공개됩니다.' },
      ],
    },
    weDoNot: {
      eyebrow: '경계를 긋는 지점',
      title: 'Sawa Cars가 하지 않는 네 가지',
      description: '이 마켓플레이스를 신뢰할 수 있게 만드는 것의 대부분은 제공하기를 거부하는 것들입니다.',
      items: [
        { title: '결제를 받지 않습니다', desc: '앱이나 웹사이트에 결제, 결제 게이트웨이, 에스크로가 없습니다. 구매자, 판매자, 렌트 제공자가 자신의 책임 아래 직접 결제를 결정합니다.' },
        { title: '판매자가 직접 게시하도록 두지 않습니다', desc: '판매자는 차량을 제출합니다. 제출을 매물로 바꿀 수 있는 것은 Sawa 팀뿐이며, 차량이 센터를 거친 뒤에만 가능합니다.' },
        { title: '검사하지 않은 것은 게시하지 않습니다', desc: '공개된 모든 매물 뒤에는 150개 항목 보고서가 있습니다. 기준에 미달하는 차량은 게시되지 않습니다.' },
        { title: '이용자 계약을 관리하지 않습니다', desc: '저희는 판매나 렌트를 확정하지 않고, 보증금을 보관하지 않으며, 당사자 간 계약서를 작성하지 않고, 소유권 이전을 처리하지 않으며, 외부 거래 분쟁을 판정하지 않습니다.' },
      ],
    },
    centers: {
      eyebrow: '저희가 일하는 곳',
      title: 'Kigali의 검사 센터',
      description: '이 장소들은 플랫폼 검사 서비스를 지원합니다. 이후의 거래를 어디서 어떻게 완료할지는 이용자가 독립적으로 결정합니다.',
      directions: '오시는 길과 운영 시간',
    },
  },

  promise: {
    meta: {
      title: '마켓플레이스 안전',
      desc: 'Sawa Cars가 사용하는 검증, 근거, 동의, 게시 통제 장치.',
    },
    header: {
      eyebrow: '마켓플레이스 안전',
      title: '유용한 통제 장치. 정직한 한계.',
      lede: 'Sawa Cars는 검증, 근거, 통제된 게시를 통해 피할 수 있는 마켓플레이스 위험을 줄입니다. 이러한 통제 장치는 정보를 개선하지만, Sawa Cars를 거래의 당사자로 만들지는 않습니다.',
      browse: '인증 매물 둘러보기',
      notice: '직접 거래 안내 읽기',
    },
    controls: {
      eyebrow: '플랫폼 통제 장치',
      title: '연락 전과 연락 중의 다섯 겹',
      description: '각각은 구체적이고 감사 가능하며, 플랫폼이 실제로 통제할 수 있는 것에 한정됩니다.',
      items: [
        { title: '검사 정보', desc: '검사가 완료된 경우, 매물에는 기록된 기계, 차체, 전자장치, 서류 점검이 표시되어 구매자가 더 잘 알고 결정할 수 있습니다.' },
        { title: '인증 판매자', desc: '차량이 게시되기 전에 판매자 신원과 계정 상태가 검토됩니다. 사업자 제공자는 별도의 검증 통제를 받습니다.' },
        { title: '명확한 근거', desc: '매물은 기록된 점검과 알 수 없는 정보를 구분합니다. 그래도 구매자는 거래에 합의하기 전에 차량과 원본 서류를 확인해야 합니다.' },
        { title: '동의 기반 연락', desc: '판매자의 전화 또는 WhatsApp 번호는 그 판매자가 활성화하고 로그인한 구매자가 직접 거래 안내에 동의한 경우에만 공유됩니다.' },
        { title: '통제된 게시', desc: '매물을 게시할 수 있는 것은 승인된 관리자뿐입니다. 신원, 검사, 사진 요건은 게시 시점에 다시 확인됩니다.' },
      ],
    },
    sawaControls: {
      title: 'Sawa가 통제하는 것',
      body: '계정 접근, 판매자 검증 상태, 게시 관문, 매물 조정, 동의 기반 연락처 공개, 플랫폼 메시지, 감사 이력.',
    },
    usersControl: {
      title: '이용자가 통제하는 것',
      body: '시승, 독립적인 확인, 협상, 계약, 결제, 보증금, 소유권 이전, 인도, 인수, 반납, 보험, 그리고 모든 외부 분쟁.',
    },
  },

  contact: {
    meta: {
      title: '문의하기',
      desc: 'Sawa Cars 팀에 +250 788 308 611로 전화 또는 WhatsApp으로 연락하거나 contact@sawacars.com으로 이메일을 보내세요. Kigali에 있는 검사 센터의 운영 시간과 주소.',
    },
    header: {
      eyebrow: '문의',
      title: '사람과 이야기하세요',
      lede: '검사, 매물, 플랫폼 관련 질문을 지원하는 팀이 응대하는 단일 회선입니다. 구매자와 판매자는 직접 거래 논의를 위해 각자 활성화한 연락 수단을 사용합니다.',
    },
    hours: '월–토 · 8:00 – 18:00',
    band: {
      label: '전화 & WhatsApp',
      whatsapp: 'WhatsApp으로 메시지 보내기',
      call: '지금 전화하기',
    },
    channels: {
      whatsapp: {
        label: 'WhatsApp',
        note: '가장 빠르게 연락하는 방법입니다. 매물 링크를 보내주시면 차량이 아직 있는지 알려드립니다.',
        badge: '가장 빠름',
      },
      call: {
        label: '전화하기',
        note: '같은 회선이며, 센터 운영 시간 동안 사람이 직접 응대합니다 — {{hours}}.',
      },
      email: {
        label: '이메일',
        note: '첨부 파일이 필요한 모든 경우: 딜러 계정, 제휴, 검사 기록, 계정 지원.',
      },
    },
    reach: {
      eyebrow: '연락 방법',
      title: '세 가지 방법, 모두 실제입니다',
    },
    composer: {
      title: '여기에 작성하세요',
      body: '이 웹사이트는 연락용 수신함을 운영하지 않으므로 이 페이지에서는 아무것도 전송되지 않습니다. 버튼을 누르면 작성한 내용이 이미 입력된 상태로 WhatsApp이 열리며 — 보내기는 직접 누르시면 됩니다.',
      fieldLabel: '메시지',
      fieldHint: '문의하시는 매물이 있다면 함께 적어주세요 — 왕복을 줄여줍니다.',
      placeholder: '안녕하세요 Sawa Cars — 다음에 대해 문의하고 싶습니다…',
      submit: 'WhatsApp 열기',
      emailPrefix: '이메일이 더 편하신가요? ',
      emailSuffix: ' 로도 같은 팀에 닿습니다.',
    },
    expect: {
      eyebrow: '예상할 수 있는 것',
      title: '연락하신 후에는',
      items: [
        { title: '24시간 이내', body: '모든 마켓플레이스 지원 요청은 검사 센터를 운영하는 팀으로부터 답변을 받습니다.' },
        { title: '봇이 아닌 사람', body: '회선은 차량을 검사하고 마켓플레이스를 지원하는 사람들이 응대합니다. 자동 전화 안내는 없습니다.' },
        { title: '언제나 하나의 번호', body: '저희는 결코 다른 번호로 이어서 연락하라거나 채팅으로 알려준 계좌로 송금하라고 요청하지 않습니다.' },
      ],
    },
    centers: {
      eyebrow: '방문해 주세요',
      title: '저희 센터',
      description: '플랫폼 검사 서비스는 이곳에서 진행됩니다. 차량을 맡기기 전에 팀에 연락하세요. 이용자 간 거래는 독립적으로 마련됩니다.',
    },
  },

  howItWorks: {
    meta: {
      title: 'Sawa Cars 이용 방법',
      desc: 'Sawa Cars에서 인증 차량 매물, 직접 판매자 연락, 검사, 렌트 가능 여부 문의가 어떻게 작동하는지.',
    },
    header: {
      eyebrow: '이용 방법',
      title: '검증된 정보가 먼저. 직접 합의가 그다음.',
      lede: 'Sawa Cars는 판매자, 검사, 매물을 검토합니다. 그다음 구매자, 판매자, 렌트 제공자가 독립적으로 소통하고 협상하며 거래합니다. 결제, 에스크로, Sawa 계약, 거래 보증은 없습니다.',
      browse: '차량 둘러보기',
      submit: '차량 제출하기',
    },
    buyers: {
      eyebrow: '구매자를 위해',
      title: '매물에서 직접 거래까지',
      description: '판매자에게 연락하면 대화가 시작됩니다. 차량이 예약되거나 Sawa Cars와의 거래가 성립되는 것은 아닙니다.',
    },
    buyingSteps: [
      { title: '매물 검토', desc: '판매자에게 연락하기 전에 차량 정보, 갤러리, 검사 정보, 모든 제한 사항을 읽어보세요.' },
      { title: '판매자에게 연락', desc: '인증 판매자가 해당 수단을 활성화한 경우 앱 내 채팅, 전화 또는 WhatsApp을 사용하세요.' },
      { title: '검사 및 확인', desc: '직접 시승이나 추가 검사를 마련하고 차량, VIN, 원본 서류, 소유권을 독립적으로 확인하세요.' },
      { title: '서면 조건 합의', desc: '구매자와 판매자가 가격, 결제 방법, 인도, 소유권 이전, 서면 계약을 직접 결정합니다.' },
      { title: '거래를 독립적으로 완료', desc: 'Sawa Cars는 구매 대금을 받거나 보관하지 않으며 그로 인한 계약이나 분쟁의 당사자가 아닙니다.' },
    ],
    checks: {
      eyebrow: '주도권을 유지하세요',
      title: '약속하기 전 네 가지 확인',
      description: '플랫폼 검증은 불확실성을 줄여주지만, 당신 자신의 실사나 서면 합의를 대신하지는 않습니다.',
      items: [
        { title: '연락 전', desc: '매물, 갤러리, 검사 기록, 판매자 검증을 비교하세요. 알 수 없는 정보는 알 수 없는 것으로 간주하세요.' },
        { title: '결제 전', desc: '차량을 직접 보고, VIN과 원본 소유권 서류를 확인하며, 수령인과 결제 방법을 독립적으로 확인하세요.' },
        { title: '서명 전', desc: '가격, 상태, 포함 품목, 이전, 인도, 보증금, 취소 조건을 당사자 간 서면 합의에 담으세요.' },
        { title: '합의 후', desc: '메시지, 서류, 영수증 사본을 보관하세요. Sawa Cars는 플랫폼 밖에서 이루어진 결제나 계약을 되돌리거나 판정할 수 없습니다.' },
      ],
    },
    sellers: {
      eyebrow: '판매자를 위해',
      title: '통제된 게시, 직접 문의',
      description: '차량을 제출하고 검증을 완료하세요. 승인된 관리자는 설정된 근거 확인을 통과한 후에만 게시합니다.',
      responsibilityLabel: '게시 후 당신의 책임:',
      responsibilityBody: ' 매물을 정확하게 유지하고, 진실하게 응답하며, 변경 사항을 공개하고, 구매자와의 모든 독립적 합의를 문서화하세요.',
    },
    sellingSteps: [
      { title: '차량 제출', desc: '제조사, 모델, 주행거리, 희망 가격을 알려주세요. 실제 비교 판매를 바탕으로 범위를 제안합니다.' },
      { title: '검사 예약', desc: '센터와 시간을 선택하세요. 차량과 정비 기록을 가져오세요.' },
      { title: '검사 및 검토', desc: '저희 팀이 검사를 기록하고 명확하고 진실한 이미지 갤러리를 추가합니다. 정해진 촬영 각도 수는 없습니다.' },
      { title: '판매자 검증 완료', desc: '게시 전에 저희 팀이 일회성 신원 확인을 승인하고 판매자 계정을 활성화해야 합니다.' },
      { title: '관리자가 게시', desc: '게시는 판매자 검증, 검사 완료, 유효한 갤러리를 조건으로 합니다. 가격의 통제권은 당신에게 있습니다.' },
      { title: '구매자 문의 관리', desc: '직접 대화하고 협상하며 모든 판매에 합의하세요. Sawa Cars는 당신의 계약이나 결제의 당사자가 아닙니다.' },
    ],
    notParty: {
      title: 'Sawa Cars는 이용자 거래의 당사자가 아닙니다',
      body: '플랫폼은 돈을 보관하지 않고, 판매나 렌트를 확정하지 않으며, 당사자 계약서를 발행하지 않고, 보증금이나 차량을 보증하지 않으며, 외부의 결제, 합의, 인도, 손실, 분쟁에 대한 책임을 지지 않습니다. 여기의 어떤 내용도 관련 법률이 배제할 수 없는 권리나 책임을 없애지 않습니다.',
      cta: '마켓플레이스 약관 전문 읽기',
    },
  },

  terms: {
    meta: {
      title: '마켓플레이스 서비스 약관',
      desc: 'Sawa Cars의 계정, 인증 차량 매물, 판매자 연락, 렌트 문의, 이용자 간 직접 거래를 규율하는 약관.',
    },
    page: {
      title: '마켓플레이스 서비스 약관',
      lede: '인증 매물과 직접 소통을 위한 명확한 규칙 — 그리고 이용자가 독립적으로 맺는 계약과 결제를 둘러싼 명확한 경계.',
    },
    scope: {
      heading: '적용 범위 및 동의',
      p1before: '본 약관은 Sawa Cars 웹사이트, 모바일 앱 및 관련 마켓플레이스 서비스의 이용을 규율합니다. 계정을 만들거나 인증이 필요한 기능을 사용하면 본 약관과 ',
      p1link: '개인정보 보호정책',
      p1after: '에 동의하는 것입니다.',
      p2: '현행 마켓플레이스 약관 버전은 이용자가 판매자 연락 수단을 처음 요청할 때 표시됩니다. 중대한 정책 변경 시 다시 동의가 필요할 수 있습니다.',
    },
    role: {
      heading: 'Sawa Cars의 제한된 역할',
      p1strong: 'Sawa Cars는 인증 매물 및 소통 플랫폼을 제공합니다.',
      p1rest: ' 구매자, 판매자, 렌트 제공자, 결제 처리자, 에스크로 대리인, 보험사, 대출기관, 운송회사가 아니며, 이용자 간 계약의 당사자도 아닙니다.',
      p2: '다른 이용자에게 연락하는 것은 문의일 뿐입니다. 차량을 예약하거나, 가용성을 확정하거나, 판매나 렌트를 성립시키거나, Sawa Cars를 구속하지 않습니다.',
    },
    accounts: {
      heading: '계정 및 자격',
      items: [
        '정확하고 최신의 정보를 제공하고 로그인 자격 증명을 안전하게 유지하세요.',
        '본인의 신원과 연락처 정보를 사용하세요.',
        '무단 접근이 있을 경우 즉시 저희에게 알려주세요.',
        '판매자 게시에는 신원 확인이 필요할 수 있으며, 렌트 재고에는 별도의 사업자 검증이 필요합니다.',
        '저희는 이용자를 보호하고, 남용을 조사하고, 법을 준수하거나 본 약관을 집행하기 위해 계정을 정지하거나 제한할 수 있습니다.',
      ],
    },
    listings: {
      heading: '매물 및 게시',
      p1: '판매자는 차량을 진실하게 설명하고, 중대한 결함이나 변경 사항을 공개하며, 이를 제공할 권한을 가져야 합니다. 제출이 게시를 보장하지는 않습니다.',
      p2: '매물을 게시할 수 있는 것은 승인된 관리자뿐입니다. 게시 준비에는 활성 상태의 인증 판매자, 완료된 검사, 유효한 이미지 갤러리가 필요할 수 있습니다. Sawa Cars는 부정확하거나, 안전하지 않거나, 불법적이거나, 플랫폼 기준에 부합하지 않는 콘텐츠를 거부, 중지, 수정 또는 보관할 수 있습니다.',
    },
    inspection: {
      heading: '검사 정보 및 배지',
      p1: '검사는 검사일에 기록된 관찰 내용과 실제로 점검한 항목을 반영합니다. 이는 보증이나 미래 상태에 대한 보장이 아니며, 구매자의 독립적인 기계적·법적 검토를 대체하지 않습니다.',
      p2: '“인증 판매자”는 플랫폼이 설정된 계정 확인을 완료했음을 의미하며, 그 사람의 모든 진술, 차량, 향후 행위에 위험이 없음을 약속하지 않습니다.',
    },
    contact: {
      heading: '연락처 공유 및 커뮤니케이션',
      p1: '판매자는 전화 또는 WhatsApp 연락을 공개할지 여부를 선택합니다. Sawa Cars는 직접 거래 안내에 동의한 인증 이용자에게만 활성화된 수단을 공개하며, 안전과 감사 목적을 위해 해당 공개를 기록합니다.',
      p2: '이용자는 연락처 데이터를 이용해 괴롭히거나, 위협하거나, 스팸을 보내거나, 수집하거나, 무관한 목적으로 사용해서는 안 됩니다. 앱 내 메시지는 개인정보 보호정책에 설명된 대로 신고되어 조정을 위해 검토될 수 있습니다.',
    },
    transactions: {
      heading: '독립적인 판매 및 렌트',
      p1: '구매자와 판매자 — 또는 임차인과 제공자 — 는 가용성, 추가 검사, 서류, 가격, 세금, 결제, 보증금, 서면 조건, 인도, 인수, 반납, 소유권 이전, 보험, 규제 준수에 대해 전적으로 책임을 집니다.',
      p2: 'Sawa Cars는 거래 자금을 수취하거나 보관하지 않으며, 이용자가 맺은 합의를 취소, 환불, 되돌리기, 집행, 판정할 수 없습니다. 표시된 렌트 요금과 보증금은 제공자가 확정하기 전까지는 제공자가 제출한 정보입니다.',
    },
    prohibited: {
      heading: '금지된 행위',
      items: [
        '사기, 사칭, 도난 차량 또는 허위 서류.',
        '오해를 일으키는 설명, 숨겨진 중대한 결함, 조작된 이미지.',
        '악성코드, 자동 수집, 보안 방해 또는 무단 접근.',
        '차별, 위협, 괴롭힘 또는 불법 콘텐츠.',
        '타인의 연락처 데이터를 공개된 목적 외로 사용하는 행위.',
      ],
    },
    reports: {
      heading: '신고, 증거 및 분쟁',
      p1: '이용자는 플랫폼 콘텐츠, 메시지 또는 계정을 신고할 수 있습니다. Sawa Cars는 플랫폼을 조정하고, 증거를 보존하며, 적법한 요청에 협조할 수 있습니다.',
      p2: '플랫폼 조정은 이용자 계약의 중재가 아닙니다. 결제, 소유권, 인도 또는 렌트 분쟁은 당사자가, 그리고 적절한 경우 각자의 은행, 결제 제공자, 보험사, 변호사, 규제기관, 법원 또는 법 집행 기관이 처리해야 합니다.',
    },
    liability: {
      heading: '면책 및 책임',
      p1: '관련 법률이 허용하는 범위 내에서, 마켓플레이스 정보와 소통 도구는 차량이 계속 판매 가능하다거나, 이용자가 거래를 완료한다거나, 외부 합의가 특정한 결과를 달성한다는 약속 없이 제공됩니다.',
      p2: '각 이용자는 자신의 결정과, 자신의 진술, 합의, 결제 또는 불법 행위로 인한 손실에 대해 책임을 집니다. 본 약관의 어떤 내용도 사기, 고의적 위법행위, 또는 관련 법률이 배제를 허용하지 않는 권리나 책임을 배제하지 않습니다.',
    },
    changes: {
      heading: '변경 및 해지',
      p1: '저희는 기능을 개선, 제한 또는 폐지하고 본 약관을 업데이트할 수 있습니다. 중대한 업데이트는 가능한 경우 서비스를 통해 전달됩니다. 보안, 감사, 법적 준수 또는 정당한 청구를 위해 필요한 경우 과거 기록이 보관될 수 있습니다.',
      p2: '개인정보 보호정책에 설명된 법적으로 요구되는 보관 및 되돌릴 수 없는 익명화 규칙을 조건으로, 앱이나 웹사이트를 통해 계정 삭제를 요청할 수 있습니다.',
    },
    lawContact: {
      heading: '준거법 및 연락처',
      p1: '본 약관은 르완다에서 적용되는 법률에 따라 운영되도록 의도되었습니다. 최종 준거법 및 분쟁 해결 조항은 프로덕션 출시 전에 자격을 갖춘 르완다 법률 자문에 의해 확인되어야 합니다.',
      p2before: '본 약관에 관한 문의는 다음으로 보낼 수 있습니다: ',
      p2after: '.',
      lastUpdated: '최종 업데이트: 2026년 8월 23일.',
    },
  },

  privacy: {
    meta: {
      title: '개인정보 보호정책',
      desc: 'Sawa Cars가 무엇을, 왜 수집하는지, 누가 볼 수 있는지, 신원 서류가 어떻게 처리되는지. 앱과 웹사이트에 걸친 하나의 계정.',
    },
    page: {
      title: '개인정보 보호정책',
      lede: '무엇을 수집하고, 왜 보관하며, 누가 볼 수 있는지 — 그리고 이 마켓플레이스를 작동하게 하는 신원 서류에 기울이는 각별한 주의.',
    },
    scope: {
      heading: '적용 범위',
      p1: '본 정책은 {{name}} — 이 웹사이트, Android 및 iOS 앱, 그리고 저희 팀이 검사 센터에서 보관하는 기록을 다룹니다. 세 곳은 하나의 계정과 하나의 데이터베이스를 공유하므로, 한 곳에서 제공한 정보는 다른 곳에서도 이용하실 수 있습니다.',
    },
    collect: {
      heading: '수집하는 정보',
      h1: '계정을 만들 때',
      list1: [
        '이름, 이메일 주소, 전화번호.',
        '비밀번호는 암호화 해시로만 저장됩니다. 저희를 포함해 Sawa Cars의 누구도 읽을 수 없습니다.',
      ],
      h2: '판매자로서 신원을 확인할 때',
      list2: [
        '국가 신분증 앞뒤 사진과 셀피.',
      ],
      h3: '마켓플레이스를 이용할 때',
      list3: [
        '저장한 차량, 저장한 검색, 켜둔 알림.',
        '판매자 연락처 공개 및 렌트 가용성 문의.',
        '판매자, 구매자 또는 저희 팀과 주고받는 메시지.',
        '제출한 차량 정보와 저희 정비사가 기록한 검사 결과.',
      ],
      h4: '자동으로',
      list4: [
        '서비스를 운영하고 보호하는 데 필요한 기본 기술 로그.',
        '앱에서만: 사진을 찍기로 선택할 때의 카메라 접근, 그리고 알림을 허용할 경우의 푸시 알림 토큰. 둘 다 다른 용도로는 사용되지 않습니다.',
      ],
    },
    why: {
      heading: '보관하는 이유',
      list: [
        '판매자가 실재하고 식별 가능한 사람인지 확인하기 위해 — 마켓플레이스 전체의 기반입니다.',
        '정확한 매물과 검사 보고서를 게시하기 위해.',
        '직접적인 마켓플레이스 소통과 렌트 문의에 대한 제공자의 응답을 가능하게 하기 위해.',
        '요청하신 알림을 보내기 위해: 가격 인하, 저장한 검색 일치, 메시지.',
        '플랫폼 콘텐츠나 행위에 관한 신고를 조사하고 사기를 방지하기 위해.',
        '보안, 동의, 관리 감사 기록을 유지하기 위해.',
      ],
      p: '저희는 광고 프로필을 만들지 않으며, 개인정보를 누구에게도 판매하지 않습니다.',
    },
    identity: {
      heading: '신원 서류, 특히',
      p: '신분증 사진과 셀피는 저희가 보관하는 가장 민감한 것이며, 그에 맞게 취급됩니다.',
      list: [
        '매물에 표시되지 않으며, 구매자나 다른 판매자와 공유되지 않습니다.',
        '접근은 검증을 검토하는 Sawa 팀원으로 제한됩니다. 서류는 관리자 전용 경로 뒤에 있으며, 일반 계정은 직접 링크가 있어도 접근할 수 없습니다.',
        '다른 이용자가 보는 것은 결과뿐입니다: “인증 판매자” 표시와 그로부터 산출되는 신뢰 점수.',
        '계정이 열려 있는 동안, 그리고 완료된 판매에 대한 기록 보관이 요구하는 기간만큼 이후에도 보관한 뒤 삭제합니다.',
      ],
    },
    whoSees: {
      heading: '누가 무엇을 보는가',
      items: [
        { lead: '구매자가 보는 것', rest: ': 판매자의 표시 이름, 검증 상태, 신뢰 점수, 판매자 프로필 정보, 연락 수단 가용 여부. 전화 또는 WhatsApp 번호는 판매자 동의와 구매자 확인 후에만 공개됩니다.' },
        { lead: '판매자와 렌트 제공자가 보는 것', rest: ': 자신에게 보내진 메시지나 가용성 문의에 답하는 데 필요한 정보.' },
        { lead: '저희 팀이 보는 것', rest: ': 절차를 운영하는 데 필요한 것 — 제출, 검사, 매물, 문의, 연락처 공개, 그리고 플랫폼 안전이나 신고가 요구하는 경우 대화.' },
        { lead: '아무도 보지 못하는 것', rest: ': 당신의 비밀번호, 신원 서류, 저장한 검색 — 당신과 위에 언급된 검토자를 제외하고는.' },
      ],
    },
    sharing: {
      heading: '그 밖에 관여하는 곳',
      p1: '저희는 플랫폼을 운영하기 위해 소수의 서비스 제공업체 — 호스팅, 메시지 전달, 이미지 저장 — 를 이용합니다. 이들은 저희 지시에 따라서만 데이터를 처리하며, 자신의 목적으로 사용하는 것은 허용되지 않습니다.',
      p2: '저희는 법이 요구하는 경우에만 당국과 정보를 공유하며, 소유권 이전에 필요한 범위에서 Rwanda Revenue Authority와 공유합니다.',
    },
    cookies: {
      heading: '쿠키',
      p1before: '이 웹사이트는 쿠키 하나를 설정합니다: 로그인 상태를 유지하는 세션 쿠키. 이는 ',
      p1strong: 'httpOnly',
      p1after: '이며, 이는 악성 스크립트를 포함해 브라우저에서 실행되는 어떤 스크립트도 읽을 수 없음을 의미합니다. 로그아웃하면 제거됩니다.',
      p2: '이 사이트에는 광고 쿠키나 제3자 추적기가 없습니다.',
    },
    security: {
      heading: '어떻게 보호되는가',
      list: [
        '비밀번호는 해시 처리되며, 읽을 수 있는 형태로는 결코 저장되지 않습니다.',
        '웹의 세션은 브라우저 저장소가 아니라 httpOnly 쿠키에 보관됩니다.',
        '저희 API에 대한 모든 요청은 서버에서 인증되며, 관리자 기능은 링크를 숨기는 것이 아니라 역할로 통제됩니다.',
        '신원 서류는 검토자에게만 제공되며 결코 공개적으로 제공되지 않습니다.',
      ],
      pbefore: '완벽한 시스템은 없습니다. 계정이 침해되었다고 생각되면 ',
      pafter: '로 연락하세요. 당일에 조치하겠습니다.',
    },
    rights: {
      heading: '당신의 선택',
      item1: '언제든지 계정에서 프로필을 확인하고 수정할 수 있습니다.',
      item2: '저장된 차량이나 검색을 잃지 않고 어떤 알림이든 끌 수 있습니다.',
      item3part1: '언제든지 누구의 승인도 없이 직접 계정을 닫을 수 있습니다 — 이 웹사이트에서는 ',
      item3link1: '프로필 → 계정 닫기',
      item3part2: '에서, 또는 앱에서는 설정 → 위험 구역에서. 닫기는 즉시 적용됩니다. 데이터는 30일 후에 삭제되며, 그때까지는 다시 로그인해 계정을 재개할 수 있습니다. 자세한 내용은 ',
      item3link2: '계정 삭제 페이지',
      item3part3: '에 있습니다.',
      item4: '닫으면 매물이 마켓플레이스에서 내려가고 전화번호 표시가 즉시 중단됩니다. 30일 후 삭제는 프로필, 연락처 정보, 신원 서류, 저장한 차량과 검색을 제거합니다. 이미 완료된 차량 이전 기록은 법이 요구하는 경우 보관되며, 이름과 연락처 정보는 거기서 제거됩니다.',
      item5before: '저희가 당신에 대해 보관하는 정보의 사본을 다음으로 서면 요청할 수 있습니다: ',
      item5after: '.',
    },
    children: {
      heading: '아동',
      p: 'Sawa Cars 계정은 성인을 위한 것입니다. 저희는 18세 미만의 누구로부터도 고의로 정보를 수집하지 않으며, 수집한 사실을 발견하면 삭제합니다.',
    },
    contact: {
      heading: '변경 및 연락처',
      p1: '플랫폼이 수집하는 내용을 변경할 때마다 이 페이지를 업데이트하며, 중대한 변경 사항은 계정 보유자에게 통지됩니다.',
      p2before: '개인정보에 관한 문의는 ',
      p2mid: '로, 그 밖의 사항은 ',
      p2after: '로 보내주세요.',
    },
  },

  guarantee: {
    meta: {
      title: '직접 거래 마켓플레이스 안내',
      desc: '구매자, 판매자, 렌트 제공자가 직접 거래할 때의 Sawa Cars의 역할과 그들의 책임.',
    },
    page: {
      title: '직접 거래 마켓플레이스 안내',
      lede: 'Sawa Cars는 매물 품질과 소통을 개선하지만, 이용자가 서로 마련하는 계약, 결제, 인도의 당사자가 아닙니다.',
    },
    noGuarantee: {
      heading: 'Sawa 거래 보증은 없습니다',
      p1: 'Sawa Cars는 이용자 간 합의에 대해 7일 반품 보증, 거래 보증, 에스크로, 환불 약속, 렌트 보증금 보증을 제공하지 않습니다.',
      p2: '차량 검사 기록은 특정 시점에 이루어진 관찰을 설명합니다. 이는 미래 상태에 대한 보증이 아니며 독립적인 검사나 법적 확인을 대체하지 않습니다.',
    },
    platformRole: {
      heading: '플랫폼이 하는 일',
      items: [
        '판매자 신원과 계정 상태를 검토합니다.',
        '어떤 차량 매물이 공개될지 통제합니다.',
        '매물, 갤러리, 검사 정보를 저장합니다.',
        '앱 내 메시지와 동의 기반 전화 또는 WhatsApp 공개를 제공합니다.',
        '조정을 위해 플랫폼 콘텐츠나 행위에 관한 신고를 접수합니다.',
      ],
    },
    userRole: {
      heading: '이용자가 결정하고 관리하는 것',
      items: [
        '차량 시승, 추가 검사, 서류 확인.',
        '가격, 결제 방법, 보증금, 결제 증빙.',
        '계약, 진술, 인도, 인수, 반납, 소유권 이전.',
        '보험, 세금, 면허 및 기타 법적·규제적 요건.',
        '독립적 합의에서 발생하는 모든 취소, 환불, 청구 또는 분쟁.',
      ],
    },
    safety: {
      heading: '송금하기 전에',
      p1: '상대방, 차량, VIN, 원본 소유권 서류, 결제 수령인을 독립적으로 확인하세요. 모든 중요한 조건을 서면으로 남기고 소통 내용과 영수증 사본을 보관하세요.',
      p2: '배지, 매물, 메시지, 검사 점수를 결제가 안전하다는 증거로 의존하지 마세요. 의심스러운 플랫폼 콘텐츠는 신고하되, 결제나 범죄가 관련될 수 있는 경우 즉시 해당 은행, 모바일 머니 제공자, 경찰 또는 규제기관에 연락하세요.',
    },
    law: {
      heading: '법이 보전하는 권리',
      p: '본 안내의 어떤 내용도 관련 법률이 배제를 허용하지 않는 책임이나 소비자 권리를 배제하지 않습니다. 구매자, 판매자 또는 제공자는 자신의 합의에서 수락한 약속과 의무에 대해 계속 책임을 집니다.',
    },
    related: {
      heading: '관련 정보',
      terms: '서비스 약관',
      how: '마켓플레이스 작동 방식',
      promise: '마켓플레이스 안전 통제 장치',
    },
  },
}

const zh = {
  about: {
    meta: {
      title: '关于 Sawa Cars',
      desc: 'Sawa Cars 是卢旺达的认证车辆市场。我们的团队在车辆发布前审核卖家身份、检测结果及信息依据，随后由用户直接沟通。',
    },
    header: {
      eyebrow: '关于我们',
      title: '边界清晰，市场才更稳固。',
      lede: '在基加利买二手车,常常需要相信那些难以核实的信息。Sawa Cars 增加了卖家核验、检测依据和受控发布,但最终的决定和交易仍留给用户自己完成。',
      browse: '浏览已认证车辆',
      visit: '前往检测中心',
    },
    why: {
      eyebrow: '我们存在的原因',
      title: '这里真正的难题是车辆履历',
      description: '不是价格,也不是选择范围,而是你眼前这辆车究竟经历过什么。',
      p1: '行驶在卢旺达道路上的大量车辆都是二手进口车,其中许多是来自日本的右舵车。这些车带着在别处写就的保养记录、难以核实的里程表读数,以及个人买家在付款前几乎无法真正核实的证件。',
      p2: '广告分类网站解决不了这个问题——它们只是原样转载信息。描述由卖家撰写,照片由卖家拍摄,唯一看过引擎盖下情况的人也只有卖家。',
      p3: '因此 Sawa Cars 选择了相反的立场。我们接收车辆,对机械、车身、电子设备及证件进行150项检测,拍摄一套有实际帮助的照片集,并在通过管理员审核后才发布信息。卖家掌控价格,我们掌控真实性。',
    },
    pipeline: {
      eyebrow: '一辆车如何上线',
      title: '五个步骤，任何一步都不能跳过',
      description: '卖家控制台、管理员审核队列以及这个网站背后运行的是同一套流程——没有捷径。',
      stages: [
        { title: '提交', desc: '已认证卖家提交车辆信息和期望价格。' },
        { title: '审核', desc: '我们的团队审阅提交内容并预约检测时间。' },
        { title: '检测', desc: '技师在检测中心进行150项检查。' },
        { title: '拍摄记录', desc: '按车辆需要拍摄足量真实照片，形成清晰真实的图集。' },
        { title: '发布', desc: '附上报告生成信息，随后公开上线。' },
      ],
    },
    weDoNot: {
      eyebrow: '我们划定边界之处',
      title: 'Sawa Cars 不做的四件事',
      description: '让这个市场值得信赖的,很大程度上正是我们拒绝提供的那些东西。',
      items: [
        { title: '我们不经手付款', desc: '应用和网站中没有结算、支付网关或资金托管。买家、卖家和租车提供方自行决定并直接完成付款，风险自负。' },
        { title: '我们不让卖家自行发布', desc: '卖家提交车辆信息。只有 Sawa 团队才能将提交内容转化为正式信息,而且只在车辆通过检测中心后才可以。' },
        { title: '我们不发布未经检测的车辆', desc: '每一条公开信息背后都有一份150项检测报告。达不到标准的车辆不会被发布。' },
        { title: '我们不管理用户之间的合同', desc: '我们不确认买卖或租赁,不代管押金,不起草双方合同,不办理所有权过户,也不裁决外部交易纠纷。' },
      ],
    },
    centers: {
      eyebrow: '我们工作的地方',
      title: '基加利的检测中心',
      description: '这些地点提供平台的检测服务。之后交易在何处、如何完成,由用户自行独立决定。',
      directions: '路线与营业时间',
    },
  },

  promise: {
    meta: {
      title: '市场安全',
      desc: 'Sawa Cars 所采用的核验、依据、同意和发布控制机制。',
    },
    header: {
      eyebrow: '市场安全',
      title: '实用的把控机制。诚实的边界说明。',
      lede: 'Sawa Cars 通过核验、依据和受控发布来降低可避免的市场风险。这些机制能改善信息质量,但并不会使 Sawa Cars 成为交易的一方。',
      browse: '浏览已认证信息',
      notice: '阅读直接交易须知',
    },
    controls: {
      eyebrow: '平台把控机制',
      title: '联系前和联系过程中的五重保障',
      description: '每一项都是具体、可审计的,且仅限于平台确实能够把控的范围。',
      items: [
        { title: '检测依据', desc: '完成检测后,信息会显示已记录的机械、车身、电子设备和证件检查情况,帮助买家做出更明智的决定。' },
        { title: '已认证卖家', desc: '车辆发布前会审核卖家身份及账户状态。企业类经营者需接受单独的核验流程。' },
        { title: '清晰的依据说明', desc: '信息会区分已记录的检测结果与未知信息。即便如此,买家仍应在同意交易前亲自核实车辆及原始证件。' },
        { title: '基于同意的联系方式', desc: '只有当卖家启用了电话或 WhatsApp 号码,且已登录的买家确认了直接交易须知后,联系方式才会公开。' },
        { title: '受控发布', desc: '只有经授权的管理员才能发布信息。身份、检测及照片要求会在发布时再次核实。' },
      ],
    },
    sawaControls: {
      title: 'Sawa 把控的部分',
      body: '账户访问权限、卖家验证状态、发布关口、信息审核、基于同意的联系方式公开、平台内消息、审计记录。',
    },
    usersControl: {
      title: '用户把控的部分',
      body: '试车、独立核实、议价、合同、付款、押金、所有权过户、交付、提车、归还、保险,以及所有外部纠纷。',
    },
  },

  contact: {
    meta: {
      title: '联系我们',
      desc: '通过电话或 WhatsApp 联系 Sawa Cars 团队：+250 788 308 611，或发邮件至 contact@sawacars.com。基加利检测中心的营业时间和地址。',
    },
    header: {
      eyebrow: '联系我们',
      title: '与真人沟通',
      lede: '这是一条统一线路,由支持团队处理检测、信息发布及平台相关的问题。买家和卖家使用各自已启用的联系方式进行直接交易沟通。',
    },
    hours: '周一至周六 · 8:00 – 18:00',
    band: {
      label: '电话与 WhatsApp',
      whatsapp: '通过 WhatsApp 发消息',
      call: '立即致电',
    },
    channels: {
      whatsapp: {
        label: 'WhatsApp',
        note: '这是联系我们最快的方式。发给我们信息链接,我们会告诉您车辆是否仍在售。',
        badge: '最快',
      },
      call: {
        label: '致电',
        note: '同一条线路,在检测中心营业时间内由真人接听——{{hours}}。',
      },
      email: {
        label: '邮箱',
        note: '适用于所有需要附件的情况:经销商账户、合作事宜、检测记录、账户支持。',
      },
    },
    reach: {
      eyebrow: '联系方式',
      title: '三种方式，都是真实可用的',
    },
    composer: {
      title: '在此撰写您的消息',
      body: '本网站不运营联系收件箱,因此本页面不会发送任何内容。点击按钮会打开 WhatsApp,并预先填入您撰写的内容——发送需要您自己点击确认。',
      fieldLabel: '消息内容',
      fieldHint: '如果您咨询的是某条具体信息,请一并写明——这样可以减少来回沟通的次数。',
      placeholder: '您好 Sawa Cars——我想咨询…',
      submit: '打开 WhatsApp',
      emailPrefix: '更习惯用邮件联系？',
      emailSuffix: '同样可以联系到同一团队。',
    },
    expect: {
      eyebrow: '您可以期待什么',
      title: '联系我们之后',
      items: [
        { title: '24小时内', body: '所有市场支持请求都会由运营检测中心的团队回复。' },
        { title: '真人回复,而非机器人', body: '接听线路的是检测车辆和支持市场运营的团队成员,没有自动语音应答。' },
        { title: '始终只有一个号码', body: '我们绝不会要求您改用其他号码联系,也不会要求您将款项汇入聊天中提供的账户。' },
      ],
    },
    centers: {
      eyebrow: '欢迎前来',
      title: '我们的检测中心',
      description: '平台的检测服务在这些地点进行。在带车前来之前,请先联系我们的团队。用户之间的交易由双方自行独立安排。',
    },
  },

  howItWorks: {
    meta: {
      title: 'Sawa Cars 使用说明',
      desc: 'Sawa Cars 上认证车辆信息、卖家直接联系、检测及租车咨询的运作方式。',
    },
    header: {
      eyebrow: '使用说明',
      title: '核实的信息在前，直接协商在后。',
      lede: 'Sawa Cars 审核卖家、检测结果和车辆信息。此后由买家、卖家和租车提供方自行沟通、协商并完成交易。没有结算、没有资金托管、没有 Sawa 合同、没有交易担保。',
      browse: '浏览车辆',
      submit: '提交您的车辆',
    },
    buyers: {
      eyebrow: '面向买家',
      title: '从信息发布到直接交易',
      description: '联系卖家只是开启一段对话,并不代表车辆被预订,也不构成与 Sawa Cars 的任何交易。',
    },
    buyingSteps: [
      { title: '查看信息', desc: '在联系卖家之前,请阅读车辆资料、照片集、检测依据以及任何限制说明。' },
      { title: '联系卖家', desc: '如果已认证卖家启用了相应渠道,可使用应用内聊天、电话或 WhatsApp 联系。' },
      { title: '检查并核实', desc: '自行安排试车或进一步检测,独立核实车辆、车架号（VIN）、原始证件及所有权。' },
      { title: '约定书面条款', desc: '买卖双方直接决定价格、付款方式、交付、所有权过户及书面合同。' },
      { title: '独立完成交易', desc: 'Sawa Cars 不接收或持有购车款项,也不是由此产生的合同或纠纷的一方。' },
    ],
    checks: {
      eyebrow: '掌握主动权',
      title: '做出承诺前的四项核实',
      description: '平台核验能降低不确定性,但无法替代您自己的尽职调查或书面协议。',
      items: [
        { title: '联系之前', desc: '对比信息、照片集、检测记录和卖家验证情况。将未知的信息视为未知。' },
        { title: '付款之前', desc: '亲自查看车辆,核对车架号（VIN）及原始所有权证件,独立确认收款人和付款方式。' },
        { title: '签字之前', desc: '将价格、车况、包含项目、过户、交付、押金及取消条件写入双方的书面协议。' },
        { title: '达成协议之后', desc: '保留消息记录、证件及收据副本。Sawa Cars 无法撤销或裁决在平台之外发生的付款或协议。' },
      ],
    },
    sellers: {
      eyebrow: '面向卖家',
      title: '受控发布，直接沟通',
      description: '提交车辆并完成验证。只有经授权的管理员在通过既定的依据核实后才会发布信息。',
      responsibilityLabel: '发布之后您需要负责:',
      responsibilityBody: '保持信息准确、如实回复、公开任何变动情况,并记录与买家达成的所有独立协议。',
    },
    sellingSteps: [
      { title: '提交车辆', desc: '告诉我们品牌、车型、里程和期望价格。我们会根据真实的可比成交案例提供参考区间。' },
      { title: '预约检测', desc: '选择检测中心和时间。请带上车辆和保养记录前来。' },
      { title: '检测与审核', desc: '我们的团队记录检测结果,并拍摄一套清晰真实的图集。没有固定的拍摄角度数量要求。' },
      { title: '完成卖家验证', desc: '发布前,我们的团队必须完成一次性身份核验并激活卖家账户。' },
      { title: '管理员发布', desc: '发布须满足卖家已验证、检测已完成、图集有效等条件。价格的决定权在您手中。' },
      { title: '管理买家咨询', desc: '直接沟通、协商并自行约定所有销售条款。Sawa Cars 不是您合同或付款的一方。' },
    ],
    notParty: {
      title: 'Sawa Cars 不是用户交易的一方',
      body: '平台不持有资金,不确认买卖或租赁,不出具双方合同,不为押金或车辆提供担保,也不对平台外的付款、协议、交付、损失或纠纷承担责任。本文的任何内容均不排除相关法律不允许排除的权利或责任。',
      cta: '阅读完整的市场服务条款',
    },
  },

  terms: {
    meta: {
      title: '市场服务条款',
      desc: '规范 Sawa Cars 账户、认证车辆信息、卖家联系、租车咨询以及用户之间直接交易的条款。',
    },
    page: {
      title: '市场服务条款',
      lede: '为认证信息和直接沟通制定清晰规则——并为用户自行订立的合同和付款划定清晰边界。',
    },
    scope: {
      heading: '适用范围与同意',
      p1before: '本条款适用于 Sawa Cars 网站、移动应用及相关市场服务的使用。创建账户或使用需要身份验证的功能,即表示您同意本条款及',
      p1link: '隐私政策',
      p1after: '。',
      p2: '现行版本的市场服务条款会在用户首次请求卖家联系方式时显示。重大政策变更可能需要重新征得同意。',
    },
    role: {
      heading: 'Sawa Cars 的有限角色',
      p1strong: 'Sawa Cars 提供一个认证信息与沟通平台。',
      p1rest: '我们不是买家、卖家、租车提供方、支付处理方、资金托管代理、保险公司、贷款机构或运输公司,也不是用户之间合同的一方。',
      p2: '联系另一位用户仅是一次咨询,不会预订车辆、确认可租性、达成买卖或租赁,也不会对 Sawa Cars 产生约束力。',
    },
    accounts: {
      heading: '账户与资格',
      items: [
        '提供准确、最新的信息,并妥善保管您的登录凭证。',
        '使用您本人真实的身份和联系方式。',
        '如发现未经授权的访问,请立即告知我们。',
        '卖家发布信息可能需要身份核验,租车库存则需要单独的企业核验。',
        '为保护用户、调查滥用行为、遵守法律或执行本条款,我们可以暂停或限制账户。',
      ],
    },
    listings: {
      heading: '信息与发布',
      p1: '卖家必须如实描述车辆,公开任何重大缺陷或改动,并拥有提供该车辆的合法权利。提交信息不保证一定会被发布。',
      p2: '只有经授权的管理员才能发布信息。发布准备可能需要卖家处于已激活的认证状态、检测已完成,以及有效的图集。对于不准确、不安全、不合法或不符合平台标准的内容,Sawa Cars 可以拒绝、暂停、修改或存档。',
    },
    inspection: {
      heading: '检测依据与徽章',
      p1: '检测反映的是检测当天所记录的观察结果和实际检查过的项目。这不是保证,也不是对未来车况的承诺,更不能替代买家自行进行的独立机械或法律核查。',
      p2: '"已认证卖家"仅表示该平台已完成既定的账户核验,并不承诺该人所作的一切陈述、车辆或未来行为都不存在风险。',
    },
    contact: {
      heading: '联系方式共享与沟通',
      p1: '卖家可自行选择是否公开电话或 WhatsApp 联系方式。Sawa Cars 只会向已确认直接交易须知的认证用户公开已启用的联系方式,并出于安全和审计目的记录该次公开。',
      p2: '用户不得利用联系方式数据进行骚扰、威胁、发送垃圾信息、抓取数据或用于无关目的。应用内消息可能会按隐私政策所述被举报并接受审查以进行调解。',
    },
    transactions: {
      heading: '独立的销售与租赁',
      p1: '买家与卖家——或承租人与提供方——需自行全权负责可租性、进一步检测、证件、价格、税费、付款、押金、书面条款、交付、提车、归还、所有权过户、保险及合规事宜。',
      p2: 'Sawa Cars 不接收或持有交易资金,也无法取消、退款、撤销、强制执行或裁决用户之间达成的协议。所显示的租金及押金,在提供方最终确认之前,均为提供方提交的信息。',
    },
    prohibited: {
      heading: '禁止行为',
      items: [
        '欺诈、冒充身份、盗窃车辆或虚假证件。',
        '误导性描述、隐瞒重大缺陷或篡改图像。',
        '恶意软件、自动化抓取、破坏安全机制或未经授权的访问。',
        '歧视、威胁、骚扰或违法内容。',
        '将他人的联系方式数据用于公开用途以外的目的。',
      ],
    },
    reports: {
      heading: '举报、证据与纠纷',
      p1: '用户可以举报平台内容、消息或账户。Sawa Cars 可以对平台进行调解、保存证据,并配合合法的合规要求。',
      p2: '平台调解不属于用户合同的仲裁。付款、所有权或租赁纠纷应由各方自行处理,必要时可寻求各自的银行、支付服务商、保险公司、律师、监管机构、法院或执法部门协助。',
    },
    liability: {
      heading: '免责声明与责任',
      p1: '在相关法律允许的最大范围内,市场信息及沟通工具的提供不承诺车辆持续可售、用户能够完成交易,或外部协议能达成特定结果。',
      p2: '每位用户须对自己的决定,以及因自身陈述、协议、付款或违法行为造成的损失负责。本条款的任何内容均不排除欺诈、故意不当行为,或相关法律不允许排除的权利或责任。',
    },
    changes: {
      heading: '变更与终止',
      p1: '我们可能会改进、限制或下线功能,并更新本条款。重大更新会尽可能通过服务内通知传达。出于安全、审计、法律合规或合法追索的需要,历史记录可能会被保留。',
      p2: '在隐私政策所述的法定保留及不可逆匿名化规则的前提下,您可以通过应用或网站申请删除账户。',
    },
    lawContact: {
      heading: '适用法律与联系方式',
      p1: '本条款旨在依据卢旺达适用的法律运行。最终的准据法及争议解决条款,应在正式上线前由合格的卢旺达法律顾问确认。',
      p2before: '有关本条款的问题可发送至:',
      p2after: '。',
      lastUpdated: '最后更新日期：2026年8月23日。',
    },
  },

  privacy: {
    meta: {
      title: '隐私政策',
      desc: 'Sawa Cars 收集哪些信息、为何收集、谁可以查看,以及身份证件如何被处理。应用与网站共享同一个账户。',
    },
    page: {
      title: '隐私政策',
      lede: '我们收集什么、为何保留、谁可以查看——以及我们对支撑这个市场运转的身份证件所给予的特别谨慎处理。',
    },
    scope: {
      heading: '适用范围',
      p1: '本政策涵盖 {{name}}——本网站、Android 及 iOS 应用,以及我们团队在检测中心保存的记录。这三处共享同一个账户和同一个数据库,因此您在其中一处提供的信息在其他各处同样可用。',
    },
    collect: {
      heading: '我们收集的信息',
      h1: '创建账户时',
      list1: [
        '姓名、邮箱地址和电话号码。',
        '密码仅以加密哈希形式存储。包括我们在内,Sawa Cars 的任何人都无法读取。',
      ],
      h2: '作为卖家验证身份时',
      list2: [
        '国民身份证正反面照片及自拍照。',
      ],
      h3: '使用市场功能时',
      list3: [
        '收藏的车辆、保存的搜索、开启的提醒。',
        '卖家联系方式的公开记录及租车可用性咨询。',
        '与卖家、买家或我们团队之间往来的消息。',
        '提交的车辆信息及我们技师记录的检测结果。',
      ],
      h4: '自动收集的信息',
      list4: [
        '运营和保护服务所需的基本技术日志。',
        '仅限应用内:选择拍照时的摄像头访问权限,以及在您允许的情况下用于接收提醒的推送通知令牌。两者均不用于其他任何目的。',
      ],
    },
    why: {
      heading: '我们保留信息的原因',
      list: [
        '确认卖家是真实、可识别的人——这是整个市场的基础。',
        '发布准确的车辆信息和检测报告。',
        '支持直接的市场沟通及提供方对租车咨询的回复。',
        '发送您所要求的提醒:降价、保存的搜索匹配、消息通知。',
        '调查有关平台内容或行为的举报,并防止欺诈。',
        '维护安全、同意及管理审计记录。',
      ],
      p: '我们不会建立广告用户画像,也不会将个人信息出售给任何人。',
    },
    identity: {
      heading: '身份证件，尤其需要说明',
      p: '身份证照片和自拍照是我们保存的最敏感的信息,处理方式也相应更为审慎。',
      list: [
        '不会显示在信息页面中,也不会与买家或其他卖家共享。',
        '访问权限仅限于负责审核验证的 Sawa 团队成员。这些证件位于仅限管理员访问的通道之后,普通账户即便持有直接链接也无法访问。',
        '其他用户只能看到结果:"已认证卖家"标识及由此得出的信任分数。',
        '在账户处于开启状态期间保留,此后按照已完成销售所要求的记录保留期限继续保留,期满后删除。',
      ],
    },
    whoSees: {
      heading: '谁能看到什么',
      items: [
        { lead: '买家能看到的', rest: '：卖家的展示名称、验证状态、信任分数、卖家资料信息,以及联系方式是否可用。电话或 WhatsApp 号码只有在卖家同意且买家已确认后才会公开。' },
        { lead: '卖家和租车提供方能看到的', rest: '：回复发给他们的消息或可用性咨询所需的信息。' },
        { lead: '我们团队能看到的', rest: '：运营流程所需的内容——提交信息、检测记录、发布信息、咨询、联系方式公开记录,以及在平台安全或举报需要时的对话内容。' },
        { lead: '任何人都看不到的', rest: '：您的密码、身份证件、保存的搜索——除了您本人和上述审核人员之外。' },
      ],
    },
    sharing: {
      heading: '还有哪些其他方参与',
      p1: '我们使用少数几家服务提供商——托管、消息传递、图片存储——来运营平台。它们只按照我们的指示处理数据,不得将数据用于自身目的。',
      p2: '我们只在法律要求时与主管部门共享信息,并在所有权过户所需的范围内与卢旺达税务局共享信息。',
    },
    cookies: {
      heading: 'Cookie',
      p1before: '本网站只设置一个 Cookie:用于保持登录状态的会话 Cookie。它是',
      p1strong: 'httpOnly',
      p1after: '，这意味着浏览器中运行的任何脚本(包括恶意脚本)都无法读取它。登出后会被移除。',
      p2: '本网站没有广告 Cookie,也没有第三方追踪器。',
    },
    security: {
      heading: '我们如何保护数据',
      list: [
        '密码经过哈希处理,绝不会以可读形式存储。',
        '网页端的会话保存在 httpOnly Cookie 中,而非浏览器存储中。',
        '对我们 API 的所有请求都在服务器端进行身份验证,管理员功能通过角色权限管控,而非仅靠隐藏链接。',
        '身份证件仅提供给审核人员查看,绝不会公开提供。',
      ],
      pbefore: '没有任何系统是完美的。如果您认为账户被盗用,请联系',
      pafter: '，我们会当天处理。',
    },
    rights: {
      heading: '您可以选择的事项',
      item1: '您可以随时在账户中查看和修改个人资料。',
      item2: '您可以关闭任何提醒,而不会丢失已收藏的车辆或搜索。',
      item3part1: '您可以随时自行关闭账户,无需任何人批准——在本网站上前往',
      item3link1: '个人资料 → 关闭账户',
      item3part2: '，或在应用中前往设置 → 危险区域。关闭立即生效。数据将在30天后删除,在此之前您仍可重新登录以恢复账户。详情见',
      item3link2: '账户删除页面',
      item3part3: '。',
      item4: '关闭账户后,信息会立即从市场下架,电话号码显示也会立即停止。30天后的删除会移除个人资料、联系方式、身份证件、收藏的车辆和搜索记录。已完成的车辆过户记录会按法律要求保留,其中的姓名和联系方式会被移除。',
      item5before: '您可以书面申请获取我们所保存的关于您的信息副本,发送至:',
      item5after: '。',
    },
    children: {
      heading: '儿童',
      p: 'Sawa Cars 账户面向成年人。我们不会故意收集任何18岁以下人士的信息,一旦发现已收集此类信息,会立即删除。',
    },
    contact: {
      heading: '变更与联系方式',
      p1: '每当平台收集内容发生变化时,我们都会更新本页面,重大变更会通知账户持有人。',
      p2before: '有关隐私的问题请发送至',
      p2mid: '，其他事项请发送至',
      p2after: '。',
    },
  },

  guarantee: {
    meta: {
      title: '直接交易市场须知',
      desc: '当买家、卖家和租车提供方直接交易时,Sawa Cars 的角色及各方的责任。',
    },
    page: {
      title: '直接交易市场须知',
      lede: 'Sawa Cars 致力于提升信息质量和沟通体验,但不是用户之间自行安排的合同、付款及交付的一方。',
    },
    noGuarantee: {
      heading: '没有 Sawa 交易担保',
      p1: 'Sawa Cars 不为用户之间的协议提供7天退货保证、交易担保、资金托管、退款承诺或租车押金担保。',
      p2: '车辆检测记录描述的是某一特定时间点所做的观察。这不是对未来车况的保证,也不能替代独立检测或法律核实。',
    },
    platformRole: {
      heading: '平台承担的工作',
      items: [
        '审核卖家身份及账户状态。',
        '把控哪些车辆信息可以公开。',
        '存储信息、图集及检测依据。',
        '提供应用内消息以及基于同意的电话或 WhatsApp 联系方式公开。',
        '接收有关平台内容或行为的举报以进行调解。',
      ],
    },
    userRole: {
      heading: '由用户自行决定和管理的事项',
      items: [
        '车辆试驾、进一步检测、证件核实。',
        '价格、付款方式、押金、付款凭证。',
        '合同、陈述、交付、提车、归还、所有权过户。',
        '保险、税费、牌照及其他法律或监管要求。',
        '独立协议中产生的所有取消、退款、索赔或纠纷。',
      ],
    },
    safety: {
      heading: '转账前请注意',
      p1: '请独立核实交易对方、车辆、车架号（VIN）、原始所有权证件以及收款人。将所有重要条款以书面形式记录,并保留沟通记录和收据副本。',
      p2: '不要把徽章、信息、消息或检测分数当作付款安全的证明。对可疑的平台内容应予以举报,但如涉及付款或犯罪问题,请立即联系相关银行、移动支付服务商、警方或监管机构。',
    },
    law: {
      heading: '法律保留的权利',
      p: '本须知的任何内容均不排除相关法律不允许排除的责任或消费者权利。买家、卖家或提供方仍需对其在各自协议中所接受的承诺和义务承担责任。',
    },
    related: {
      heading: '相关信息',
      terms: '服务条款',
      how: '市场运作方式',
      promise: '市场安全把控机制',
    },
  },
}

export const marketing: Record<Locale, Record<string, unknown>> = {
  en,
  rw,
  fr,
  sw,
  ko,
  zh,
}
