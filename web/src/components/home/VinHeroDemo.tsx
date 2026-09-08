'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'

export function VinHeroDemo() {
  const router = useRouter()
  const [vin, setVin] = useState('')
  const [activeTab, setActiveTab] = useState<'timeline' | 'specs' | 'odometer'>('timeline')

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (vin.trim()) {
      router.push(`/vehicles/lookup?vin=${encodeURIComponent(vin.trim().toUpperCase())}`)
    }
  }

  return (
    <Section tone="page" className="overflow-hidden">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-center">
          
          {/* Left Column: Mission & Explainer */}
          <div>
            <SectionHeading
              eyebrow="Proprietary Automotive Intelligence"
              title="Verify before you commit. Not after you pay."
              description="Every physical car in Rwanda has a unique 17-character VIN or Japanese Chassis number. Sawa's cryptographic engine validates manufacturer build records, checks Modulo 11 authenticity, and tracks physical provenance events."
            />

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name="shield-check" size={18} />
                </span>
                <div>
                  <h4 className="text-title-sm font-extrabold text-content">Cryptographic Modulo 11 Check</h4>
                  <p className="mt-0.5 text-caption text-content-secondary">
                    Validates the mathematical check digit at position 9, catching fake or doctored registration numbers instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name="gauge" size={18} />
                </span>
                <div>
                  <h4 className="text-title-sm font-extrabold text-content">Algorithmic Rollback Detection</h4>
                  <p className="mt-0.5 text-caption text-content-secondary">
                    Chronologically sequences every odometer reading from import, inspection, and servicing to flag mileage drops.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name="lock" size={18} />
                </span>
                <div>
                  <h4 className="text-title-sm font-extrabold text-content">Zero-Leak Consumer Privacy</h4>
                  <p className="mt-0.5 text-caption text-content-secondary">
                    Raw VINs are strictly masked for public buyers to protect owners from cloned vehicle plates and identity fraud.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Lookup Form */}
            <form onSubmit={handleLookup} className="mt-8 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card">
              <Icon name="search" size={18} className="ml-3 text-content-muted" />
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Enter VIN or Chassis to audit…"
                className="h-10 min-w-0 flex-1 font-mono uppercase text-body text-content placeholder:text-content-muted outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-caption font-bold text-white shadow-brand hover:bg-brand-bright transition-all"
              >
                <span>Audit</span>
                <Icon name="arrow-right" size={14} />
              </button>
            </form>
          </div>

          {/* Right Column: Interactive Live Report Preview Card */}
          <div className="rounded-3xl border border-line-soft bg-surface shadow-card-lg overflow-hidden">
            
            {/* Report Header */}
            <div className="bg-ink-900 p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
                    <Icon name="shield-check" size={18} />
                  </span>
                  <div>
                    <h3 className="text-title-sm font-extrabold text-white">2022 Toyota Land Cruiser Prado TX-L</h3>
                    <p className="font-mono text-micro text-white/70">VIN: JTEBU3FJ***0812 · Japanese JDM</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-micro font-bold text-emerald-300">
                  Modulo 11 Verified
                </span>
              </div>

              {/* Quick Metrics Bar */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center">
                <div>
                  <span className="block text-micro text-white/60">Inspection Score</span>
                  <span className="text-title-sm font-extrabold text-emerald-400">146 / 150</span>
                </div>
                <div>
                  <span className="block text-micro text-white/60">Odometer Status</span>
                  <span className="text-title-sm font-extrabold text-emerald-400">Verified 42,800 km</span>
                </div>
                <div>
                  <span className="block text-micro text-white/60">RRA Customs</span>
                  <span className="text-title-sm font-extrabold text-emerald-400">Duty Cleared</span>
                </div>
              </div>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex border-b border-line-soft bg-surface-alt/50 px-4 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`pb-2.5 text-caption font-bold transition-all border-b-2 ${
                  activeTab === 'timeline'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-content-secondary hover:text-content'
                }`}
              >
                Provenance Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`pb-2.5 text-caption font-bold transition-all border-b-2 ${
                  activeTab === 'specs'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-content-secondary hover:text-content'
                }`}
              >
                Decoded Specifications
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {activeTab === 'timeline' && (
                <ol className="relative border-l border-line pl-5 space-y-6">
                  <li className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white" />
                    <span className="text-micro font-bold text-content-muted">2026-08-15 · Kigali, Rwanda</span>
                    <h4 className="text-caption font-bold text-content">Sawa Certified 150-Point Physical Diagnostic</h4>
                    <p className="mt-0.5 text-micro text-content-secondary">
                      Computerized OBD-II diagnostic scan passed with 0 error codes. Optical wheel alignment and brake dyno completed.
                    </p>
                  </li>

                  <li className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white" />
                    <span className="text-micro font-bold text-content-muted">2026-07-28 · Kigali Dry Port (DP World)</span>
                    <h4 className="text-caption font-bold text-content">Customs Clearance & RRA Digital Yellow Card</h4>
                    <p className="mt-0.5 text-micro text-content-secondary">
                      Import duties, VAT, and environmental levies paid in full. Verified clear of liens.
                    </p>
                  </li>

                  <li className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white" />
                    <span className="text-micro font-bold text-content-muted">2022-04-10 · Tahara Plant, Japan</span>
                    <h4 className="text-caption font-bold text-content">Manufacturing & Assembly</h4>
                    <p className="mt-0.5 text-micro text-content-secondary">
                      Original 2.8L D-4D Turbo Diesel (1GD-FTV) with 6-speed Super ECT Automatic transmission.
                    </p>
                  </li>
                </ol>
              )}

              {activeTab === 'specs' && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-caption">
                  <div className="rounded-xl bg-surface-alt p-2.5">
                    <dt className="text-micro text-content-muted">Manufacturer (WMI)</dt>
                    <dd className="font-bold text-content">Toyota Motor Kyushu (Japan)</dd>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-2.5">
                    <dt className="text-micro text-content-muted">Engine Displacement</dt>
                    <dd className="font-bold text-content">2,755 cc (2.8L Turbo Diesel)</dd>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-2.5">
                    <dt className="text-micro text-content-muted">Drivetrain</dt>
                    <dd className="font-bold text-content">Full-Time 4WD with Torsen LSD</dd>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-2.5">
                    <dt className="text-micro text-content-muted">Safety & Airbags</dt>
                    <dd className="font-bold text-content">7 Airbags, ABS, VSC, Hill Descent</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
