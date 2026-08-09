import type { Metadata } from 'next'
import { Button, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CenterList } from '@/components/marketing/CenterList'
import { CENTERS } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About Sawa Cars',
  description:
    'Sawa Cars is the middleman in Rwanda’s used-car market: we inspect every car on a 150-point check, photograph it ourselves and publish the listing under our own name. Three inspection centers in Kigali.',
  alternates: { canonical: '/about' },
}

// The pipeline from the product blueprint, condensed. A car cannot skip a stage:
// the backend will not move a listing to `live` without an inspection record.
const PIPELINE = [
  { title: 'Submitted', desc: 'A verified seller sends us the car’s details and asking price.' },
  { title: 'Reviewed', desc: 'Our team reads the submission and books an inspection slot.' },
  { title: 'Inspected', desc: 'A mechanic runs the 150-point check at the center.' },
  { title: 'Photographed', desc: 'Our photographer shoots the standard 36 angles.' },
  { title: 'Published', desc: 'We create the listing, report attached, and it goes live.' },
]

// The negative space of the product. Saying plainly what Sawa refuses to do is
// more informative than another paragraph about what it does.
const WE_DO_NOT = [
  {
    title: 'We do not take payments',
    desc: 'There is no checkout in the app or on this website, and there never has been. Money changes hands in person at a center, where both parties and our team are present.',
  },
  {
    title: 'We do not let sellers publish',
    desc: 'A seller submits a car. Only the Sawa team can turn a submission into a listing, and only after the car has been at a center.',
  },
  {
    title: 'We do not list what we have not inspected',
    desc: 'Every live listing has a 150-point report behind it. Cars that fall below our threshold are not published.',
  },
  {
    title: 'We do not charge buyers',
    desc: 'Our fees come from the seller: a certification fee for the inspection and photography, and a commission when a handover completes.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="The middleman, on purpose."
        lede="Buying a used car in Kigali usually means trusting a stranger about a vehicle that arrived from another continent with a history nobody can check. Sawa Cars exists to be the party in the middle who has actually seen the car."
        actions={
          <>
            <Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>
              Browse certified cars
            </Button>
            <Button href="/contact" variant="outline">
              Visit a center
            </Button>
          </>
        }
      />

      {/* ─── Why this market ─────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <SectionHeading
              eyebrow="Why it exists"
              title="Provenance is the hard problem here"
              description="Not price. Not choice. Knowing what the car in front of you has actually been through."
            />

            <div className="max-w-prose space-y-5 text-title-sm leading-relaxed text-content-secondary">
              <p>
                A large share of the cars on Rwandan roads arrived as used imports, many of them
                right-hand drive from Japan. They come with a service history written somewhere
                else, an odometer that is difficult to verify, and paperwork that a private buyer
                has no practical way to audit before handing over money.
              </p>
              <p>
                A classifieds site does not solve that. It carries whatever is posted to it: the
                seller writes the description, the seller takes the photographs, and the seller is
                the only person who has ever looked under the bonnet.
              </p>
              <p>
                So Sawa Cars took the opposite position. We take the car in, run a 150-point check
                across its mechanics, body, electronics and documents, photograph it in a fixed
                set of 36 angles, and publish the listing ourselves with the report attached. The
                seller keeps control of the price. We keep control of the truth.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── The pipeline ────────────────────────────────────────────────── */}
      <Section tone="page">
        <Container>
          <SectionHeading
            eyebrow="How a car gets on the site"
            title="Five stages, none of them skippable"
            description="The same pipeline runs behind the seller dashboard, the admin queue and this website — there is no side door."
          />

          <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((stage, i) => (
              <li key={stage.title} className="bg-surface p-6">
                <span className="text-caption font-extrabold tabular-nums tracking-[0.1em] text-content-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-title-sm font-extrabold text-content">{stage.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                  {stage.desc}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ─── What we refuse to do ────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow="Where we draw the line"
            title="Four things Sawa Cars will not do"
            description="Most of what makes this marketplace trustworthy is what it refuses to offer."
          />

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {WE_DO_NOT.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-line-soft bg-surface p-6 shadow-card sm:p-7"
              >
                <div className="flex items-start gap-3">
                  <Icon name="close-circle" size={20} className="mt-0.5 shrink-0 text-content-muted" />
                  <div>
                    <h3 className="text-title-sm font-extrabold text-content">{item.title}</h3>
                    <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ─── Centers ─────────────────────────────────────────────────────── */}
      <Section tone="alt">
        <Container>
          <SectionHeading
            eyebrow="Where we work"
            title={`${CENTERS.length} inspection centers in Kigali`}
            description="Every inspection, every handover and every return happens at one of these. Nothing is done in a car park."
          />
          <CenterList className="mt-12" />

          <div className="mt-10">
            <Button href="/contact" variant="outline" trailingIcon={<Icon name="arrow-right" size={18} />}>
              Directions and opening hours
            </Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
