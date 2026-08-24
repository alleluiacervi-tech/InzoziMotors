import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage'

export const metadata: Metadata = {
  title: 'Direct-deal marketplace notice',
  description: 'The role of Sawa Cars and the responsibilities of buyers, sellers and rental providers when they transact directly.',
  alternates: { canonical: '/legal/guarantee' },
}

const SECTIONS: LegalSection[] = [
  { id: 'no-guarantee', heading: 'No Sawa transaction guarantee', body: <><p>Sawa Cars does not provide a seven-day return guarantee, transaction warranty, escrow, refund promise or rental-deposit guarantee for an agreement between users.</p><p>A vehicle inspection record describes observations made at a point in time. It is not a warranty of future condition and does not replace an independent inspection or legal checks.</p></> },
  { id: 'platform-role', heading: 'What the platform does', body: <ul><li>Reviews seller identity and account status.</li><li>Controls which vehicle listings become public.</li><li>Stores listing, gallery and inspection information.</li><li>Provides in-app messaging and consent-based phone or WhatsApp disclosure.</li><li>Receives reports about platform content or conduct for moderation.</li></ul> },
  { id: 'user-role', heading: 'What users decide and manage', body: <ul><li>Vehicle viewing, additional inspection and document verification.</li><li>Price, payment method, deposit and proof of payment.</li><li>Contract, representations, delivery, pickup, return and ownership transfer.</li><li>Insurance, taxes, licences and other legal or regulatory requirements.</li><li>Any cancellation, refund, claim or dispute arising from the independent agreement.</li></ul> },
  { id: 'safety', heading: 'Before you transfer money', body: <><p>Verify the other party, the vehicle, VIN, original ownership documents and payment recipient independently. Put all material terms in writing and keep copies of communications and receipts.</p><p>Do not rely on a badge, listing, message or inspection score as proof that payment is safe. Report suspicious platform content, but contact the appropriate bank, mobile-money provider, police or regulator immediately when a payment or crime may be involved.</p></> },
  { id: 'law', heading: 'Rights the law preserves', body: <p>Nothing in this notice excludes liability or consumer rights that applicable law does not allow a person to exclude. The buyer, seller or provider remains responsible for the promises and duties they accept in their own agreement.</p> },
  { id: 'related', heading: 'Related information', body: <ul><li><Link href="/legal/terms">Terms of service</Link></li><li><Link href="/how-it-works">How the marketplace works</Link></li><li><Link href="/promise">Marketplace safety controls</Link></li></ul> },
]

export default function DirectDealNoticePage() {
  return <LegalPage title="Direct-deal marketplace notice" lede="Sawa Cars improves listing quality and communication, but is not a party to the contract, payment or delivery users arrange with each other." sections={SECTIONS} />
}
