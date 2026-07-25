import type { Metadata } from 'next'
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'
import { CONTACT, SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What Inzozi Motors collects, why, who can see it, and how identity documents are handled. One account across the app and the website.',
  alternates: { canonical: '/legal/privacy' },
}

const SECTIONS: LegalSection[] = [
  {
    id: 'scope',
    heading: 'Scope',
    body: (
      <>
        <p>
          This policy covers {SITE.name} — this website, the Android and iOS apps, and the records
          our team keeps at the inspection centers. All three share one account and one database,
          so information you give in one place is available to you in the others.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    heading: 'What we collect',
    body: (
      <>
        <h3>When you create an account</h3>
        <ul>
          <li>Your name, email address and phone number.</li>
          <li>
            Your password, stored only as a cryptographic hash. Nobody at Inzozi can read it,
            including us.
          </li>
        </ul>

        <h3>When you verify your identity as a seller</h3>
        <ul>
          <li>Photographs of the front and back of your national ID, and a selfie.</li>
        </ul>

        <h3>When you use the marketplace</h3>
        <ul>
          <li>Cars you save, searches you save, and the alerts you switch on.</li>
          <li>Purchase requests, handover bookings and their outcomes.</li>
          <li>Messages you exchange with sellers, buyers or our team.</li>
          <li>Vehicle details you submit, and the inspection results our mechanics record.</li>
        </ul>

        <h3>Automatically</h3>
        <ul>
          <li>Basic technical logs needed to run and secure the service.</li>
          <li>
            In the app only: camera access when you choose to take a photograph, and a push
            notification token if you allow notifications. Neither is used for anything else.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'why',
    heading: 'Why we hold it',
    body: (
      <>
        <ul>
          <li>To verify that a seller is a real, identifiable person — the basis of the whole marketplace.</li>
          <li>To publish accurate listings and inspection reports.</li>
          <li>To arrange handovers, and to contact you about a car you requested.</li>
          <li>To send the alerts you asked for: price drops, saved-search matches, messages.</li>
          <li>To investigate disputes and prevent fraud.</li>
          <li>To meet record-keeping obligations on completed vehicle transfers.</li>
        </ul>
        <p>
          We do not build advertising profiles, and we do not sell personal information to anyone.
        </p>
      </>
    ),
  },
  {
    id: 'identity-documents',
    heading: 'Identity documents, specifically',
    body: (
      <>
        <p>
          ID photographs and selfies are the most sensitive thing we hold, and they are treated
          accordingly.
        </p>
        <ul>
          <li>They are never shown on a listing, and never shared with buyers or other sellers.</li>
          <li>
            Access is restricted to the Inzozi team members who review verifications. The
            documents sit behind an administrator-only route; an ordinary account cannot reach
            them even with a direct link.
          </li>
          <li>
            What other users see is the outcome only: a “Verified seller” marker, and the trust
            score that flows from it.
          </li>
          <li>
            We keep them while your account is open and for as long afterwards as record-keeping
            on completed sales requires, then delete them.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'who-sees-what',
    heading: 'Who sees what',
    body: (
      <>
        <ul>
          <li>
            <strong>Buyers see</strong> a seller’s display name, verification status, trust score,
            completed sales and reviews. A phone number is exchanged when a handover is being
            arranged.
          </li>
          <li>
            <strong>Sellers see</strong> the name of a buyer who has requested their car, and the
            contact number needed for the handover.
          </li>
          <li>
            <strong>Our team sees</strong> what is required to run the pipeline: submissions,
            inspections, bookings, and — where safety or a dispute requires it — conversations.
          </li>
          <li>
            <strong>Nobody sees</strong> your password, your ID documents or your saved searches
            except you and the reviewers named above.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'sharing',
    heading: 'Who else is involved',
    body: (
      <>
        <p>
          We use a small number of service providers to run the platform — hosting, message
          delivery and image storage. They process data on our instructions only, and they are
          not permitted to use it for their own purposes.
        </p>
        <p>
          We share information with authorities only where the law requires it, and with the
          Rwanda Revenue Authority to the extent an ownership transfer requires.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    heading: 'Cookies',
    body: (
      <>
        <p>
          This website sets one cookie: a session cookie that keeps you signed in. It is{' '}
          <strong>httpOnly</strong>, which means no script running in your browser can read it —
          including a malicious one. It is removed when you sign out.
        </p>
        <p>
          There are no advertising cookies and no third-party trackers on this site.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    heading: 'How it is protected',
    body: (
      <>
        <ul>
          <li>Passwords are hashed, never stored in a readable form.</li>
          <li>Sessions on the web are held in an httpOnly cookie rather than in browser storage.</li>
          <li>
            Every request to our API is authorised on the server, and administrator functions are
            gated by role rather than by hiding a link.
          </li>
          <li>Identity documents are served only to reviewers, never publicly.</li>
        </ul>
        <p>
          No system is perfect. If you believe an account has been compromised, contact{' '}
          <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a> and we will act
          the same day.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    heading: 'Your choices',
    body: (
      <>
        <ul>
          <li>You can view and correct your profile at any time from your account.</li>
          <li>You can switch any alert off without losing the saved car or search behind it.</li>
          <li>
            You can ask for a copy of what we hold about you, or for your account to be deleted,
            by writing to <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>.
          </li>
          <li>
            Deletion removes your profile, saved items and messages. Records of completed vehicle
            transfers are retained where the law requires.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'children',
    heading: 'Children',
    body: (
      <p>
        Inzozi accounts are for adults. We do not knowingly collect information from anyone under
        18, and we delete it if we discover we have.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Changes and contact',
    body: (
      <>
        <p>
          We will update this page whenever the platform changes what it collects, and account
          holders will be notified of material changes.
        </p>
        <p>
          Questions about privacy go to{' '}
          <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>, or to{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> for anything else.
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lede="What we collect, why we hold it, who can see it — and the particular care taken with the identity documents that make this marketplace work."
      sections={SECTIONS}
    />
  )
}
