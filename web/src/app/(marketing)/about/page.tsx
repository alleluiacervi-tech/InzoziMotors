import type { Metadata } from 'next'
import { Button, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CenterList } from '@/components/marketing/CenterList'

export const metadata: Metadata = {
  title: 'About Sawa Cars',
  description:
    'Sawa Cars is a verified vehicle marketplace in Rwanda: our team reviews sellers, inspections and listing evidence before publication, then users communicate directly.',
  alternates: { canonical: '/about' },
}

// The pipeline from the product blueprint, condensed. A car cannot skip a stage:
// the backend will not move a listing to `live` without an inspection record.
const PIPELINE = [
  { title: 'Submitted', desc: 'A verified seller sends us the car’s details and asking price.' },
  { title: 'Reviewed', desc: 'Our team reads the submission and books an inspection slot.' },
  { title: 'Inspected', desc: 'A mechanic runs the 150-point check at the center.' },
  { title: 'Documented', desc: 'A clear, truthful gallery is added with as many useful images as the vehicle needs.' },
  { title: 'Published', desc: 'We create the listing, report attached, and it goes live.' },
]

// The negative space of the product. Saying plainly what Sawa refuses to do is
// more informative than another paragraph about what it does.
const WE_DO_NOT = [
  {
    title: 'We do not take payments',
    desc: 'There is no checkout, payment gateway or escrow in the app or website. Buyers, sellers and rental providers decide payment directly at their own risk.',
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
    title: 'We do not manage user contracts',
    desc: 'We do not confirm the sale or rental, take custody of a deposit, write the parties’ contract, process ownership transfer or decide an external transaction dispute.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="A stronger marketplace, with clear boundaries."
        lede="Buying a used car in Kigali can mean trusting information that is difficult to verify. Sawa Cars adds seller checks, inspection evidence and controlled publication while leaving the final decision and transaction with the users."
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
                useful photo gallery, and publish the listing only after an admin review. The
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
            title="Inspection centers in Kigali"
            description="These locations support platform inspection services. Users independently decide where and how to complete any later transaction."
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
