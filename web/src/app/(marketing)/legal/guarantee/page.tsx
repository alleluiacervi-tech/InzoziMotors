import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, Prose, type LegalSection } from '@/components/marketing/LegalPage'
import { RefundTable } from '@/components/marketing/RefundTable'
import { CONTACT } from '@/lib/site'
import { RETURN_WINDOW_DAYS } from '@/lib/business'

export const metadata: Metadata = {
  title: '7-day guarantee terms',
  description:
    'The full terms of the Sawa 7-day drive-it guarantee: what it covers, the refund conditions, how to start a return, and what falls outside it.',
  alternates: { canonical: '/legal/guarantee' },
}

const SECTIONS: LegalSection[] = [
  {
    id: 'what-it-is',
    heading: `The ${RETURN_WINDOW_DAYS}-day window`,
    body: (
      <>
        <p>
          Every car bought through Sawa and handed over at a Sawa center comes with{' '}
          {RETURN_WINDOW_DAYS} days to change your mind. The window opens on the day of the
          handover and closes {RETURN_WINDOW_DAYS} days later.
        </p>
        <p>
          Inside it, you may return the car to any Sawa center. What you get back depends on
          why you are returning it, which is the subject of the next two sections.
        </p>
      </>
    ),
  },
  {
    id: 'does-not-match',
    heading: 'What “does not match its report” means',
    body: (
      <>
        <p>
          Every listing publishes the 150-point inspection report behind it: seven categories,
          each item graded pass, flag or fail. That report is the standard the car is measured
          against — not a general expectation of condition, and not the seller’s description.
        </p>
        <p>A full refund applies where, for example:</p>
        <ul>
          <li>An item recorded as a pass was in fact faulty at handover.</li>
          <li>A defect material to the vehicle’s condition was not recorded at all.</li>
          <li>The odometer, documents or ownership record differ from what we published.</li>
        </ul>
        <p>
          A fault that is <em>already disclosed</em> on the report — a flagged item you could read
          before committing — is not a mismatch. That is the point of publishing it.
        </p>
      </>
    ),
  },
  {
    id: 'conditions',
    heading: 'Refund conditions',
    // Renders a component, so it manages its own Prose blocks.
    plain: true,
    body: (
      <>
        <Prose>
          <p>
            These are the same conditions shown in the app before you confirm a purchase request.
          </p>
        </Prose>
        <RefundTable className="mt-5" />
        <Prose className="mt-5">
          <p>
            Refunds are made in the same way payment was taken, at the center, once the return
            check is complete.
          </p>
        </Prose>
      </>
    ),
  },
  {
    id: 'how-to-return',
    heading: 'How to start a return',
    body: (
      <>
        <ul>
          <li>
            Tell us inside the window. Message us on{' '}
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            , raise a dispute from the order in the app, or write to{' '}
            <a href={`mailto:${CONTACT.supportEmail}`}>{CONTACT.supportEmail}</a>. The date you
            contact us is the date that counts, not the date you bring the car in.
          </li>
          <li>Say what does not match, and which item on the report it relates to.</li>
          <li>
            Bring the car to any Sawa center with its documents and keys. Our mechanics run a
            return check against the original report.
          </li>
          <li>
            We settle the refund with you and take the transfer back through the RRA. Where the
            fault is ours to carry, we carry it with the seller — not with you.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'not-covered',
    heading: 'What the guarantee does not cover',
    body: (
      <>
        <ul>
          <li>Damage, wear or a fault caused after the handover.</li>
          <li>
            Anything after the {RETURN_WINDOW_DAYS}-day window has closed. The sale is final; a
            warranty claim, if one applies, goes through Support.
          </li>
          <li>
            Vehicles not handed over at a Sawa center. If a buyer and seller arrange something
            privately, we are not in the middle of it and the guarantee does not attach.
          </li>
          <li>Modifications made to the car after you took it.</li>
          <li>
            Rentals, which are covered by the deposit-back guarantee in the next section instead.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'rental-deposits',
    heading: 'Rental deposits',
    body: (
      <>
        <p>
          Rental deposits are returned in full after the return check, the same day, at the
          center. Condition photographs are taken when you collect the car and again when you
          return it, so any deduction has to be shown rather than asserted.
        </p>
      </>
    ),
  },
  {
    id: 'related',
    heading: 'Related pages',
    body: (
      <ul>
        <li>
          <Link href="/promise">The Sawa Promise</Link> — the five guarantees this one belongs
          to.
        </li>
        <li>
          <Link href="/how-it-works">How buying works</Link> — the six steps and what to bring to
          a handover.
        </li>
        <li>
          <Link href="/legal/terms">Terms of service</Link> — accounts, fees and liability.
        </li>
      </ul>
    ),
  },
]

export default function GuaranteePage() {
  return (
    <LegalPage
      title={`${RETURN_WINDOW_DAYS}-day guarantee terms`}
      lede="Drive it for a week. If it does not match the report we published, bring it back to any center for a full refund. Here is exactly how that works."
      sections={SECTIONS}
    />
  )
}
