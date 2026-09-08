import Image from 'next/image'
import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'

const TIERS = [
  {
    icon: 'gauge',
    title: 'Powertrain & Transmission',
    desc: 'Engine compression test, turbo boost pressure, fluid viscosity, cold-start telemetry, and smooth automatic gear engagement.',
  },
  {
    icon: 'shield-check',
    title: 'Structural Chassis & Unibody',
    desc: 'Laser-measured frame alignment, zero underside rust or weld repairs, crash crumple zones, and suspension subframe integrity.',
  },
  {
    icon: 'search',
    title: 'OBD-II Computer Diagnostics',
    desc: 'Complete electronic sensor scan across engine ECU, ABS, SRS airbags, electronic steering, and catalytic emissions.',
  },
  {
    icon: 'car',
    title: 'Laser Optical Alignment & Tires',
    desc: 'Hunter computerized four-wheel laser alignment, uniform tire tread depth verification, and alloy wheel balance.',
  },
  {
    icon: 'check',
    title: 'Braking & Hydraulic Dynamics',
    desc: 'Disc rotor runout measurements, caliper hydraulic line pressure, emergency handbrake hold, and ABS pulsing test.',
  },
  {
    icon: 'sparkles',
    title: 'Battery Health & Electrical Systems',
    desc: 'Alternator charging voltage under load, starter motor cranking amps, climate control temperature, and full lighting harness.',
  },
]

export function InspectionShowcase() {
  return (
    <Section tone="surface" className="overflow-hidden">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
          
          {/* Left Column: 100% Real-Camera Workshop Photography */}
          <div className="relative overflow-hidden rounded-3xl border border-line-soft bg-ink-900 shadow-card-lg">
            <div className="relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] w-full">
              <Image
                src="/img/inspection-alignment.jpg"
                alt="Vehicle elevated on a computerized Hunter laser alignment lift inside certified diagnostic workshop"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/25 to-transparent" />
            </div>

            {/* Live Inspection Badge Overlay */}
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-ink-900/80 p-4 text-white backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-caption font-extrabold uppercase tracking-wider text-emerald-300">
                    Kigali Diagnostic Facility
                  </span>
                </div>
                <span className="rounded bg-white/10 px-2 py-0.5 text-micro font-mono text-white/80">
                  Hunter Optical Rack #02
                </span>
              </div>
              <p className="mt-2 text-micro leading-relaxed text-white/80">
                Real physical inspection: Every car is lifted, scanned with computerized diagnostics, and road-tested before publication.
              </p>
            </div>
          </div>

          {/* Right Column: 6 Inspection Tiers */}
          <div>
            <SectionHeading
              eyebrow="The 150-Point Inspection Standard"
              title="A car is 30,000 parts. We inspect every critical one."
              description="Beforward sends foreign auction sheets written in codes; local street dealers let you test drive for 5 minutes around the block. Sawa mechanics perform a comprehensive 2-hour physical diagnostic in Kigali."
            />

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {TIERS.map((tier) => (
                <div
                  key={tier.title}
                  className="rounded-2xl border border-line-soft bg-surface-alt/60 p-4 transition-all hover:bg-surface hover:shadow-card"
                >
                  <div className="flex items-center gap-2.5 text-title-sm font-extrabold text-content">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand">
                      <Icon name={tier.icon as any} size={15} />
                    </span>
                    <h4 className="text-caption font-bold text-content">{tier.title}</h4>
                  </div>
                  <p className="mt-2 text-micro leading-relaxed text-content-secondary">
                    {tier.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/how-it-works"
                className="flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-caption font-bold text-white transition-all hover:bg-ink-800"
              >
                <span>Read Full Inspection Protocol</span>
                <Icon name="arrow-right" size={14} />
              </Link>
              <Link
                href="/cars"
                className="text-caption font-bold text-brand hover:underline"
              >
                Browse 150-Point Certified Inventory →
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
