import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { Reveal } from '@/components/ui/Reveal'

interface ComparisonRow {
  feature: string
  sawa: { title: string; desc: string }
  beforward: { title: string; desc: string }
  auto24: { title: string; desc: string }
}

const COMPARISONS: ComparisonRow[] = [
  {
    feature: 'Physical Mechanical Inspection',
    sawa: {
      title: '150-Point Physical Diagnostic in Kigali',
      desc: 'Performed on optical alignment lifts with OBD-II computer scans. Full report published before you inquire.',
    },
    beforward: {
      title: 'Unverified Foreign Auction Sheet',
      desc: 'Japanese grading symbols that omit mechanical failures, underside rust, and transmission slip.',
    },
    auto24: {
      title: 'Basic Visual Walkaround',
      desc: 'Generic dealer checklist without computer diagnostic telemetry or unibody structural checks.',
    },
  },
  {
    feature: 'Odometer & Identity Verification',
    sawa: {
      title: 'Cryptographic VIN & Rollback Audit',
      desc: 'Algorithmic mileage regression analysis. Modulo 11 check digit and WMI manufacturer origin verified.',
    },
    beforward: {
      title: 'Export Odometer Risk',
      desc: 'Cluster meter tampering common between auction house, holding yard, and container port.',
    },
    auto24: {
      title: 'Self-Reported Mileage',
      desc: 'Mileage numbers claimed by independent sellers with no historical service progression proof.',
    },
  },
  {
    feature: 'Payment & Escrow Protection',
    sawa: {
      title: 'Local Test Drive & Secure Escrow',
      desc: 'Drive the car in Kigali before committing. Funds held securely until title transfer completes.',
    },
    beforward: {
      title: '100% Advance International Wire',
      desc: 'Full capital sent overseas 60 days before seeing the vehicle. Non-refundable if vehicle arrives defective.',
    },
    auto24: {
      title: 'Direct Peer-to-Peer Cash',
      desc: 'Buyer negotiates and transacts directly with unknown private sellers with no deposit guarantee.',
    },
  },
  {
    feature: 'RRA Title & Customs Clearance',
    sawa: {
      title: '48-Hour Digital RRA Registration',
      desc: '100% duty-paid guarantee. Official digital yellow card transfer handled directly at our Kigali centers.',
    },
    beforward: {
      title: '45–75 Days Port & Customs Hassle',
      desc: 'Buyer manages Dar es Salaam / Mombasa clearing agents, transit bonds, and unexpected tax reassessments.',
    },
    auto24: {
      title: 'Manual Paperwork Burden',
      desc: 'Buyer must verify unpaid traffic fines, outstanding bank liens, and navigate RRA tax offices alone.',
    },
  },
]

export function CompetitorComparison() {
  return (
    <Section tone="alt" className="overflow-hidden">
      <Container>
        <div className="text-center max-w-3xl mx-auto">
          <SectionHeading
            eyebrow="The Sawa Advantage"
            title="Why Sawa beats traditional importers and classifieds"
            description="Traditional Japanese exporters ask for 100% wire transfer upfront on an unseen car; generic classifieds leave you unprotected with unknown sellers. Sawa combines physical Kigali inspection hubs with cryptographic VIN intelligence."
          />
        </div>

        {/* Comparison Table for Large Screens */}
        <div className="mt-14 hidden md:block overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card">
          <div className="grid grid-cols-[1.2fr_1.3fr_1fr_1fr] border-b border-line-soft bg-surface-alt/70 p-5 text-caption font-extrabold uppercase tracking-wider text-content">
            <div>Verification Standard</div>
            <div className="flex items-center gap-2 text-brand">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                <Icon name="check" size={12} />
              </span>
              Sawa Certified Standard
            </div>
            <div className="text-content-muted">Traditional Importers (e.g. Beforward)</div>
            <div className="text-content-muted">Generic Classifieds (e.g. Auto24)</div>
          </div>

          <div className="divide-y divide-line-soft">
            {COMPARISONS.map((row, idx) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.2fr_1.3fr_1fr_1fr] p-5 transition-colors hover:bg-surface-alt/40 ${
                  idx % 2 === 0 ? 'bg-surface' : 'bg-surface-page/50'
                }`}
              >
                {/* Feature Name */}
                <div className="font-extrabold text-title-sm text-content pr-4">
                  {row.feature}
                </div>

                {/* Sawa Column (Winner) */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-4 -my-2 mr-4">
                  <div className="flex items-center gap-2 font-extrabold text-caption text-emerald-950">
                    <Icon name="shield-check" size={16} className="text-emerald-600 shrink-0" />
                    <span>{row.sawa.title}</span>
                  </div>
                  <p className="mt-1.5 text-micro leading-relaxed text-emerald-900/80">
                    {row.sawa.desc}
                  </p>
                </div>

                {/* Beforward Column */}
                <div className="pr-4">
                  <div className="flex items-center gap-1.5 font-bold text-caption text-rose-950/80">
                    <Icon name="alert" size={14} className="text-rose-500 shrink-0" />
                    <span>{row.beforward.title}</span>
                  </div>
                  <p className="mt-1 text-micro leading-relaxed text-content-muted">
                    {row.beforward.desc}
                  </p>
                </div>

                {/* Auto24 Column */}
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-caption text-amber-950/80">
                    <Icon name="alert" size={14} className="text-amber-500 shrink-0" />
                    <span>{row.auto24.title}</span>
                  </div>
                  <p className="mt-1 text-micro leading-relaxed text-content-muted">
                    {row.auto24.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Responsive Mobile Cards */}
        <div className="mt-10 space-y-5 md:hidden">
          {COMPARISONS.map((row, idx) => (
            <Reveal key={row.feature} delay={idx * 60}>
              <div className="overflow-hidden rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
                <h3 className="text-title-sm font-extrabold text-content">{row.feature}</h3>
                
                {/* Sawa Advantage */}
                <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center gap-2 text-caption font-extrabold text-emerald-950">
                    <Icon name="shield-check" size={16} className="text-emerald-600 shrink-0" />
                    <span>Sawa: {row.sawa.title}</span>
                  </div>
                  <p className="mt-1 text-micro text-emerald-900/80 leading-relaxed">
                    {row.sawa.desc}
                  </p>
                </div>

                {/* Others */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-micro">
                  <div className="rounded-lg bg-surface-alt p-2.5">
                    <span className="block font-bold text-content-secondary">Traditional Export:</span>
                    <span className="mt-0.5 block text-content-muted">{row.beforward.title}</span>
                  </div>
                  <div className="rounded-lg bg-surface-alt p-2.5">
                    <span className="block font-bold text-content-secondary">Local Classifieds:</span>
                    <span className="mt-0.5 block text-content-muted">{row.auto24.title}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}
