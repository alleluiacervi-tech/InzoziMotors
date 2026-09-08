import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { Reveal } from '@/components/ui/Reveal'

const GUARANTEES = [
  {
    icon: 'shield-check',
    title: '150-Point Laser Inspection',
    badge: 'Certified Diagnostic',
    desc: 'Computerized OBD-II diagnostics, Hunter laser alignment, and mechanical road testing before listing.',
  },
  {
    icon: 'lock',
    title: 'Guaranteed Escrow Protection',
    badge: 'Zero Payment Risk',
    desc: 'Your funds are held securely in bank escrow and released only after vehicle handover and title transfer.',
  },
  {
    icon: 'document',
    title: '48-Hour RRA Yellow Card',
    badge: 'Customs & Title Cleared',
    desc: '100% duty-cleared guarantee. Official RRA digital yellow-card ownership transfer completed in Kigali.',
  },
  {
    icon: 'gauge',
    title: 'Cryptographic Odometer Audit',
    badge: 'Zero Rollbacks',
    desc: 'Algorithmic mileage regression analysis and Modulo 11 check digit verification on every vehicle.',
  },
] as const

export function TrustGuarantees() {
  return (
    <Section tone="alt">
      <Container>
        <div className="text-center max-w-2xl mx-auto">
          <SectionHeading
            eyebrow="The Sawa Standard"
            title="Engineered for complete peace of mind"
            description="Every car inspected in Kigali, backed by bank escrow and verified documentation."
          />
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((item, idx) => (
            <Reveal key={item.title} delay={idx * 80}>
              <div className="flex h-full flex-col rounded-3xl border border-line-soft bg-surface p-6 shadow-card transition-all hover:border-line hover:shadow-card-lg">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                    <Icon name={item.icon} size={22} />
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-micro font-bold text-emerald-800">
                    {item.badge}
                  </span>
                </div>

                <h3 className="mt-5 text-title-sm font-extrabold text-content">
                  {item.title}
                </h3>

                <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                  {item.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export default TrustGuarantees
