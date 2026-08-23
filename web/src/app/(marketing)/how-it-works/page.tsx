import type { Metadata } from 'next'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { StepTimeline } from '@/components/marketing/Steps'
import { BUYING_STEPS, SELLING_STEPS } from '@/lib/site'

export const metadata: Metadata = {
  title: 'How Sawa Cars works',
  description: 'How verified vehicle listings, direct seller contact, inspections and rental availability inquiries work on Sawa Cars.',
  alternates: { canonical: '/how-it-works' },
}

const SAFETY = [
  ['Before contact', 'Compare the listing, gallery, inspection record and seller verification. Treat unknown information as unknown.'],
  ['Before paying', 'See the vehicle, verify the VIN and original ownership documents, and independently confirm the recipient and payment method.'],
  ['Before signing', 'Put the price, condition, included items, transfer, delivery, deposit and cancellation terms in a written agreement between the parties.'],
  ['After agreement', 'Keep copies of messages, documents and receipts. Sawa Cars cannot reverse or decide a payment or contract made outside the platform.'],
]

export default function HowItWorksPage() {
  return <>
    <PageHeader eyebrow="How it works" title="Verified information first. Direct agreement second." lede="Sawa Cars reviews sellers, inspections and listings. Buyers, sellers and rental providers then communicate, negotiate and transact independently. There is no checkout, escrow, Sawa contract or transaction guarantee." actions={<><Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>Browse cars</Button><Button href="/sell" variant="outline">Submit a vehicle</Button></>} />

    <Section tone="surface" id="buying"><Container><div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20"><SectionHeading eyebrow="For buyers" title="From listing to direct deal" description="Contacting a seller starts a conversation. It does not reserve the car or create a transaction with Sawa Cars." /><StepTimeline steps={BUYING_STEPS} /></div></Container></Section>

    <Section tone="page"><Container><SectionHeading eyebrow="Stay in control" title="Four checks before you commit" description="Platform verification reduces uncertainty; it does not replace your own due diligence or a written agreement." /><ul className="mt-10 grid gap-4 sm:grid-cols-2">{SAFETY.map(([title, desc], index) => <li key={title}><Card className="h-full p-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-caption font-extrabold text-brand">{index + 1}</span><h3 className="mt-4 text-title-sm font-extrabold text-content">{title}</h3><p className="mt-2 text-body leading-relaxed text-content-secondary">{desc}</p></Card></li>)}</ul></Container></Section>

    <Section tone="alt" id="selling"><Container><div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20"><div><SectionHeading eyebrow="For sellers" title="Controlled publication, direct enquiries" description="Submit the vehicle and complete verification. An authorized admin publishes only after the configured evidence checks pass." /><div className="mt-6 rounded-2xl border border-line-soft bg-surface p-5 text-caption leading-relaxed text-content-secondary"><strong className="text-content">Your responsibility after publication:</strong> keep the listing accurate, respond truthfully, disclose changes, and document any independent agreement with the buyer.</div></div><StepTimeline steps={SELLING_STEPS} /></div></Container></Section>

    <Section tone="surface"><Container><Card className="border-brand/20 bg-brand-tint p-6 sm:p-8"><h2 className="text-title font-extrabold text-content">Sawa Cars is not a party to user transactions</h2><p className="mt-3 max-w-3xl text-body leading-relaxed text-content-secondary">The platform does not hold money, confirm a sale or rental, issue the parties&apos; contract, guarantee a deposit or vehicle, or accept responsibility for an external payment, agreement, delivery, loss or dispute. Nothing here removes rights or responsibilities that applicable law cannot exclude.</p><Button href="/legal/terms" variant="outline" className="mt-5">Read the full marketplace terms</Button></Card></Container></Section>
  </>
}
