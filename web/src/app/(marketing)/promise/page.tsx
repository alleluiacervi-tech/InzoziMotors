import type { Metadata } from 'next'
import { Button, Card, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { PROMISES } from '@/lib/site'

export const metadata: Metadata = { title: 'Marketplace safety', description: 'The verification, evidence, consent and publication controls used by Sawa Cars.', alternates: { canonical: '/promise' } }

export default function MarketplaceSafetyPage() {
  return <><PageHeader eyebrow="Marketplace safety" title="Useful controls. Honest limits." lede="Sawa Cars reduces avoidable marketplace risk through verification, evidence and controlled publication. Those controls improve information; they do not make Sawa Cars a party to the deal." actions={<><Button href="/cars">Browse verified listings</Button><Button href="/legal/guarantee" variant="outline">Read the direct-deal notice</Button></>} />
    <Section tone="surface"><Container><SectionHeading eyebrow="Platform controls" title="Five layers before and during contact" description="Each one is specific, auditable and limited to what the platform can actually control." /><ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{PROMISES.map((item) => <li key={item.title}><Card className="h-full p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={item.icon} size={21} /></span><h2 className="mt-5 text-title-sm font-extrabold text-content">{item.title}</h2><p className="mt-2 text-body leading-relaxed text-content-secondary">{item.desc}</p></Card></li>)}</ul></Container></Section>
    <Section tone="alt"><Container><div className="grid gap-8 lg:grid-cols-2"><Card className="p-6 sm:p-8"><h2 className="text-title font-extrabold text-content">What Sawa controls</h2><p className="mt-3 text-body leading-relaxed text-content-secondary">Account access, seller verification status, publication gates, listing moderation, consent-based contact disclosure, platform messages and audit history.</p></Card><Card className="p-6 sm:p-8"><h2 className="text-title font-extrabold text-content">What users control</h2><p className="mt-3 text-body leading-relaxed text-content-secondary">Viewings, independent checks, negotiation, contract, payment, deposit, ownership transfer, delivery, pickup, return, insurance and any external dispute.</p></Card></div></Container></Section>
  </>
}
