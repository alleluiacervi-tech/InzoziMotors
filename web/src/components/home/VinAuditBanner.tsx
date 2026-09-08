'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Icon, Section } from '@/components/ui'

export function VinAuditBanner() {
  const router = useRouter()
  const [vin, setVin] = useState('')
  const [error, setError] = useState('')

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!cleaned) {
      setError('Please enter a valid 17-character VIN or Japanese Chassis number.')
      return
    }
    if (cleaned.length < 9) {
      setError('Identifier must be at least 9 characters.')
      return
    }
    setError('')
    router.push(`/vehicles/lookup?vin=${encodeURIComponent(cleaned)}`)
  }

  return (
    <Section tone="page" className="py-12 sm:py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-10 sm:px-12 sm:py-14 text-white shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-micro font-bold text-emerald-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Instant Free Verification
            </div>

            <h2 className="mt-4 text-display-sm sm:text-display font-extrabold tracking-tight">
              Audit Any Vehicle Before You Pay
            </h2>

            <p className="mt-2 text-caption sm:text-body text-white/80">
              Decode manufacturer specs, verify Modulo 11 check digits, and check for odometer anomalies instantly.
            </p>

            <form onSubmit={handleLookup} className="mt-8">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 rounded-2xl bg-white/10 p-2 border border-white/15 backdrop-blur-md">
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Icon name="shield-check" size={20} className="text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => {
                      setVin(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Enter 17-character VIN or Japanese Chassis number…"
                    className="h-11 w-full bg-transparent font-mono font-bold tracking-wider uppercase text-body text-white placeholder:text-white/45 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-caption font-bold text-white shadow-brand hover:bg-brand-bright transition-all active:scale-[0.98]"
                >
                  <span>Audit History</span>
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>

              {error && (
                <p className="mt-2 text-caption font-semibold text-rose-400 text-left px-2">{error}</p>
              )}
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-micro font-semibold text-white/70">
              <span className="flex items-center gap-1.5">
                <Icon name="check" size={13} className="text-emerald-400" />
                Modulo 11 Mathematical Check
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check" size={13} className="text-emerald-400" />
                Odometer Rollback Detection
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check" size={13} className="text-emerald-400" />
                Zero-Leak Privacy Masking
              </span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export default VinAuditBanner
