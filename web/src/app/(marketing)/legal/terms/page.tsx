import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'
import { CONTACT, SITE } from '@/lib/site'
import { RETURN_WINDOW_DAYS } from '@/lib/business'

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The terms covering accounts, buying, selling, fees and liability on Sawa. A plain-language draft describing how the platform actually operates.',
  alternates: { canonical: '/legal/terms' },
}

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    heading: 'Who these terms are with',
    body: (
      <>
        <p>
          {SITE.name} operates a certified used-car marketplace in Kigali, Rwanda, consisting of
          this website, the Sawa mobile applications for Android and iOS, and the
          inspection and handover centers where our team works. “Sawa”, “we” and “us” mean that
          business. “You” means anyone using any of those.
        </p>
        <p>
          These terms apply the same way whether you reach us through the website or the app —
          both run on one account and one system.
        </p>
      </>
    ),
  },
  {
    id: 'what-sawa-is',
    heading: 'What Sawa Cars is, and what it is not',
    body: (
      <>
        <p>
          Sawa Cars is the party in the middle of a private sale. We inspect the vehicle, photograph
          it, publish the listing under our own name and host the handover at one of our centers.
          Sellers cannot publish listings themselves.
        </p>
        <p>
          <strong>Sawa Cars is not a payment provider, an escrow service or a bank.</strong> No money
          moves through this website or the app. The price is settled between buyer and seller in
          person at a center, in our presence.
        </p>
        <p>
          Sawa Cars is not the owner of the vehicle unless a listing says otherwise. The seller
          remains the owner until the transfer completes.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    heading: 'Your account',
    body: (
      <>
        <ul>
          <li>You must be 18 or older to hold an account.</li>
          <li>
            One account covers the app and the website. Keep the password to yourself; anything
            done through your account is treated as done by you.
          </li>
          <li>
            The details you give us must be accurate, and must stay accurate — we use your phone
            number to arrange handovers.
          </li>
          <li>
            Selling requires identity verification. You submit photographs of your national ID and
            a selfie, and a member of our team reviews them before you can submit a car.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'buying',
    heading: 'Buying a car',
    body: (
      <>
        <p>
          Requesting a car is a request, not a purchase. It reserves the vehicle, removes it from
          the marketplace and tells us to contact you. It costs nothing, and you may cancel it at
          any time before the handover at no charge.
        </p>
        <ul>
          <li>Payment happens in person at an Sawa center. Never through the app or this site.</li>
          <li>
            We check both parties’ documents at the handover and process the RRA ownership
            transfer with you. Registration documents typically complete within 2–3 working days.
          </li>
          <li>
            Third-party insurance is required before the vehicle leaves the center. Bring a policy
            or arrange one with our team on the day.
          </li>
          <li>
            Every purchase handed over at a center carries the {RETURN_WINDOW_DAYS}-day guarantee
            set out in the{' '}
            <Link href="/legal/guarantee">guarantee terms</Link>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'selling',
    heading: 'Selling a car',
    body: (
      <>
        <p>
          You submit a vehicle; we decide whether to list it. Submission is not a guarantee of a
          listing, and we may decline a car at our discretion — most often because it does not
          pass the 150-point inspection.
        </p>
        <ul>
          <li>
            The car must be yours to sell, and the documents you present must be genuine and
            current.
          </li>
          <li>
            The inspection result is ours. We publish it in full on the listing, including
            flagged and failed items.
          </li>
          <li>
            The photographs are taken by our team and remain ours. You are welcome to use them
            while the car is listed with us.
          </li>
          <li>
            You set the asking price and you may change it. We will tell you where it sits against
            comparable cars, but the decision is yours.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'fees',
    heading: 'Fees',
    body: (
      <>
        <p>
          <strong>Buyers pay nothing.</strong> No listing fee, no booking fee, no commission.
        </p>
        <p>Sellers pay:</p>
        <ul>
          <li>
            A certification fee, charged up front, covering the 150-point inspection, the
            professional photography and the listing itself.
          </li>
          <li>
            A success commission, charged only when a handover completes — a percentage of the
            agreed sale price.
          </li>
          <li>An optional featured-listing fee, if you choose to boost a car in the feed.</li>
        </ul>
        <p>
          The current amounts are shown to you before you commit, at submission and at any center.
          We do not change a fee after a car has been submitted.
        </p>
      </>
    ),
  },
  {
    id: 'listings-content',
    heading: 'Listings, photographs and reports',
    body: (
      <>
        <p>
          Inspection reports, vehicle photographs, listing copy and the certification marks on
          this site are ours. You may share a listing link freely. You may not copy the
          photographs or reports to publish a vehicle elsewhere, and you may not scrape the
          catalogue in bulk.
        </p>
        <p>
          Messages you send through the platform remain yours, but you grant us permission to
          store and display them to the people in the conversation, and to review them where
          safety or a dispute requires it.
        </p>
      </>
    ),
  },
  {
    id: 'conduct',
    heading: 'What you may not do',
    body: (
      <>
        <ul>
          <li>Misrepresent a vehicle, its history, its mileage or its documents.</li>
          <li>Use another person’s identity documents, or submit altered ones.</li>
          <li>
            Attempt to move a transaction off the platform to avoid the inspection, the center or
            the commission.
          </li>
          <li>Harass, threaten or spam another user through the chat.</li>
          <li>Interfere with the platform’s operation, or access parts of it you are not entitled to.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'suspension',
    heading: 'Suspension and closure',
    body: (
      <>
        <p>
          We may suspend or close an account that breaks these terms, and we may remove any
          listing at any time. Where a reservation or a scheduled handover is affected, we will
          tell the other party.
        </p>
        <p>
          You can close your account at any time by contacting{' '}
          <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>. Records we are
          required to keep — completed handovers, ownership transfers — survive the closure.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    heading: 'Inspection reports and liability',
    body: (
      <>
        <p>
          A 150-point inspection is a thorough assessment of a vehicle on the day it was
          inspected, carried out by a qualified mechanic at one of our centers. It is not a
          warranty, and it cannot predict a fault that develops later. What it guarantees is that
          the report is honest.
        </p>
        <p>
          Our responsibility is that the car matches its published report at handover. That is
          what the {RETURN_WINDOW_DAYS}-day window enforces. Beyond that, and to the extent
          Rwandan law allows, we are not liable for indirect or consequential losses arising from
          a vehicle bought through the platform.
        </p>
        <p>Nothing here limits any right you have under Rwandan consumer law.</p>
      </>
    ),
  },
  {
    id: 'disputes',
    heading: 'Disputes',
    body: (
      <>
        <p>
          Raise a dispute in the app or by contacting{' '}
          <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>. Our team mediates
          between buyer and seller, with the inspection report and the handover record in front of
          us. Most disputes are settled at the center.
        </p>
        <p>
          These terms are governed by the laws of Rwanda, and the courts of Kigali have
          jurisdiction over anything that cannot be settled between us.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to these terms',
    body: (
      <>
        <p>
          We will update this page when the platform changes, and we will notify account holders
          of material changes through the app and by email. Continuing to use Sawa after a
          change means you accept the updated terms. A transaction is governed by the terms in
          force on the day it was agreed.
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      lede="How accounts, buying, selling, fees and liability work on Sawa — written the way the platform actually behaves."
      sections={SECTIONS}
    />
  )
}
