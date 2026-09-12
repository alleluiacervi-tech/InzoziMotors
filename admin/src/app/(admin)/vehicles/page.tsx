'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Pill } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/feedback'

type TabKey = 'decoder' | 'discrepancies' | 'signals' | 'events' | 'inspections'

export default function VehicleIntelligenceCommandCenter() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('decoder')

  // ── Decoder State ──────────────────────────────────────────────────────────
  const [vinInput, setVinInput] = useState('')
  const [decoding, setDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const [decodeResult, setDecodeResult] = useState<any | null>(null)

  // ── Discrepancy Diffing State ──────────────────────────────────────────────
  const [listingClaim, setListingClaim] = useState({
    make: 'Toyota',
    model: 'RAV4',
    year: '2021',
    fuel_type: 'Petrol',
    transmission: 'Automatic',
    body_type: 'SUV',
  })
  const [diffing, setDiffing] = useState(false)
  const [diffResult, setDiffResult] = useState<any | null>(null)

  // ── Anomaly Signals State ──────────────────────────────────────────────────
  const [signals, setSignals] = useState<any[]>([])
  const [loadingSignals, setLoadingSignals] = useState(false)
  const [resolvingSignal, setResolvingSignal] = useState<any | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolving, setResolving] = useState(false)

  // ── Event Ingestion State ──────────────────────────────────────────────────
  const [eventForm, setEventForm] = useState({
    vehicleId: '',
    eventType: 'customs_clearance',
    eventDate: new Date().toISOString().slice(0, 10),
    odometerKm: '',
    odometerVerified: false,
    providerId: 'rra_customs_verified',
    sourceType: 'government_open',
    sourceReference: '',
    title: 'Customs Clearance & Import Duty Paid',
    publicSummary: 'Vehicle verified cleared by Rwanda Revenue Authority customs at Kigali inland port.',
  })
  const [recordingEvent, setRecordingEvent] = useState(false)

  // ── Legacy Inspection Lookup State ─────────────────────────────────────────
  const [inspectionVin, setInspectionVin] = useState('')
  const [historyResult, setHistoryResult] = useState<any | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load signals on mount and tab change
  useEffect(() => {
    if (activeTab === 'signals') {
      loadSignals()
    }
  }, [activeTab])

  async function loadSignals() {
    setLoadingSignals(true)
    try {
      const data = await api.getActiveSignals(false)
      setSignals(data || [])
    } catch (err: any) {
      toast(err.message || 'Failed to fetch anomaly signals', 'error')
    } finally {
      setLoadingSignals(false)
    }
  }

  async function handleDecode(targetVin = vinInput) {
    const cleanVin = targetVin.trim()
    if (!cleanVin) return
    setDecoding(true)
    setDecodeError(null)
    setDecodeResult(null)
    try {
      const res = await api.decodeAndRetrieveVin(cleanVin)
      setDecodeResult(res)
      if (res.vehicleId) {
        setEventForm((prev) => ({ ...prev, vehicleId: res.vehicleId }))
      }
      toast('Vehicle decoded & intelligence populated.', 'success')
    } catch (err: any) {
      setDecodeError(err.message || 'Failed to decode vehicle identifier')
    } finally {
      setDecoding(false)
    }
  }

  async function handleCompare() {
    if (!decodeResult?.normalizedSpecs) {
      toast('Please decode a vehicle first to compare against ground truth specs.', 'error')
      return
    }
    setDiffing(true)
    try {
      const inputs = {
        make: listingClaim.make,
        model: listingClaim.model,
        year: parseInt(listingClaim.year, 10),
        fuel_type: listingClaim.fuel_type,
        transmission: listingClaim.transmission,
        body_type: listingClaim.body_type,
      }
      const res = await api.compareDiscrepancies(inputs, decodeResult.normalizedSpecs)
      setDiffResult(res)
      toast(`Compared specs: ${res.count} discrepancy detected.`, res.hasDiscrepancies ? 'info' : 'success')
    } catch (err: any) {
      toast(err.message || 'Comparison failed', 'error')
    } finally {
      setDiffing(false)
    }
  }

  async function handleResolveSignal(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvingSignal || !resolutionNote.trim()) {
      toast('A written resolution justification note is required.', 'error')
      return
    }
    setResolving(true)
    try {
      await api.resolveSignal(resolvingSignal.id, resolutionNote.trim())
      toast('Anomaly signal resolved and recorded in audit log.', 'success')
      setResolvingSignal(null)
      setResolutionNote('')
      loadSignals()
    } catch (err: any) {
      toast(err.message || 'Failed to resolve signal', 'error')
    } finally {
      setResolving(false)
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!eventForm.vehicleId) {
      toast('A valid canonical Vehicle ID is required.', 'error')
      return
    }
    setRecordingEvent(true)
    try {
      await api.addVehicleHistoryEvent(eventForm.vehicleId, {
        event_type: eventForm.eventType,
        event_date: eventForm.eventDate,
        odometer_km: eventForm.odometerKm ? parseInt(eventForm.odometerKm, 10) : null,
        odometer_verified: eventForm.odometerVerified,
        provider_id: eventForm.providerId,
        source_type: eventForm.sourceType,
        source_reference: eventForm.sourceReference || null,
        title: eventForm.title,
        public_summary: eventForm.publicSummary,
      })
      toast('Verified history event permanently appended to ledger.', 'success')
      setEventForm((prev) => ({
        ...prev,
        sourceReference: '',
        odometerKm: '',
      }))
    } catch (err: any) {
      toast(err.message || 'Failed to record event', 'error')
    } finally {
      setRecordingEvent(false)
    }
  }

  async function handleHistoryLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!inspectionVin.trim()) return
    setLoadingHistory(true)
    setHistoryResult(null)
    try {
      const data = await api.vehicleHistory(inspectionVin.trim())
      setHistoryResult(data)
    } catch (err: any) {
      toast(err.message || 'Lookup failed', 'error')
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Vehicle Intelligence & Registry"
        description="Canonical ground truth, multi-provider decoders, listing discrepancy diffing, and anomaly signal streams."
      />

      {/* ── MAANG Segmented Tab Control ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line-soft bg-surface p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('decoder')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'decoder'
              ? 'bg-ink-900 text-white shadow-md'
              : 'text-content-secondary hover:bg-surface-alt hover:text-content'
          }`}
        >
          <Icon name="search" className="h-4 w-4" />
          VIN Decoder & Specs
        </button>

        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'discrepancies'
              ? 'bg-ink-900 text-white shadow-md'
              : 'text-content-secondary hover:bg-surface-alt hover:text-content'
          }`}
        >
          <Icon name="filter" className="h-4 w-4" />
          Discrepancy Diffing
        </button>

        <button
          onClick={() => setActiveTab('signals')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'signals'
              ? 'bg-ink-900 text-white shadow-md'
              : 'text-content-secondary hover:bg-surface-alt hover:text-content'
          }`}
        >
          <Icon name="alert" className="h-4 w-4" />
          Anomaly Signals
          {signals.length > 0 && (
            <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-extrabold text-white">
              {signals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'events'
              ? 'bg-ink-900 text-white shadow-md'
              : 'text-content-secondary hover:bg-surface-alt hover:text-content'
          }`}
        >
          <Icon name="document" className="h-4 w-4" />
          Provenance Ingestion
        </button>

        <button
          onClick={() => setActiveTab('inspections')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'inspections'
              ? 'bg-ink-900 text-white shadow-md'
              : 'text-content-secondary hover:bg-surface-alt hover:text-content'
          }`}
        >
          <Icon name="calendar" className="h-4 w-4" />
          Inspection Archive
        </button>
      </div>

      {/* ── TAB 1: VIN Decoder & Specs Grid ─────────────────────────────────── */}
      {activeTab === 'decoder' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-content-secondary">
                Enter ISO 3779 VIN or Japanese Domestic Chassis Number
              </label>
              <div className="flex flex-wrap gap-3">
                <input
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 4T1BF1FK5CU123456 or NZE121-1234567"
                  className="h-12 flex-1 rounded-xl border border-line bg-surface px-4 font-mono text-sm font-semibold tracking-wider text-content uppercase focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  disabled={decoding || !vinInput.trim()}
                  onClick={() => handleDecode()}
                  className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-xs font-bold text-brand-on shadow-sm hover:bg-brand-bright disabled:opacity-50"
                >
                  {decoding ? (
                    <>
                      <Icon name="refresh" className="h-4 w-4 animate-spin" />
                      Ingesting...
                    </>
                  ) : (
                    <>
                      <Icon name="sparkles" className="h-4 w-4" />
                      Decode & Ingest
                    </>
                  )}
                </button>
              </div>

              {/* Sample Chips for Fast Testing */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                <span className="font-semibold">Quick Samples:</span>
                <button
                  type="button"
                  onClick={() => { setVinInput('NZE121-1234567'); handleDecode('NZE121-1234567') }}
                  className="rounded-lg bg-surface-alt px-2.5 py-1 font-mono text-[11px] text-content hover:bg-line-soft"
                >
                  Toyota Vitz / Corolla (JDM)
                </button>
                <button
                  type="button"
                  onClick={() => { setVinInput('4T1BF1FK5CU123456'); handleDecode('4T1BF1FK5CU123456') }}
                  className="rounded-lg bg-surface-alt px-2.5 py-1 font-mono text-[11px] text-content hover:bg-line-soft"
                >
                  Toyota Camry (USA ISO)
                </button>
                <button
                  type="button"
                  onClick={() => { setVinInput('WBA5A5C51FD123456'); handleDecode('WBA5A5C51FD123456') }}
                  className="rounded-lg bg-surface-alt px-2.5 py-1 font-mono text-[11px] text-content hover:bg-line-soft"
                >
                  BMW X5 (Germany ISO)
                </button>
              </div>
            </div>
          </Card>

          {decodeError && (
            <div className="rounded-xl border border-danger/30 bg-danger-tint p-4 text-xs font-semibold text-danger-strong">
              {decodeError}
            </div>
          )}

          {decodeResult && (
            <div className="space-y-6">
              {/* Authenticity & Verification Hero Card */}
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-extrabold text-content">
                        {decodeResult.normalizedSpecs?.make} {decodeResult.normalizedSpecs?.model}
                      </span>
                      <span className="rounded-lg bg-surface-alt px-2.5 py-1 font-mono text-xs font-bold text-content">
                        {decodeResult.normalizedSpecs?.year}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs tracking-wider text-content-muted">
                      Masked Identifier: <strong className="text-content">{decodeResult.vehicleIdentity?.vinMasked}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Check Digit Badge */}
                    {decodeResult.vehicleIdentity?.checkDigitValid !== null && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                          decodeResult.vehicleIdentity?.checkDigitValid
                            ? 'bg-success-tint text-success'
                            : 'bg-danger-tint text-danger-strong'
                        }`}
                      >
                        <Icon
                          name={decodeResult.vehicleIdentity?.checkDigitValid ? 'check-circle' : 'close-circle'}
                          className="h-4 w-4"
                        />
                        {decodeResult.vehicleIdentity?.checkDigitValid
                          ? 'Modulo 11 Authentic'
                          : 'Tampered Check Digit'}
                      </span>
                    )}

                    {/* Verification Status */}
                    <span className="rounded-xl bg-info-tint px-3 py-1.5 text-xs font-bold text-info">
                      Status: {decodeResult.verificationStatus?.replace('_', ' ').toUpperCase()}
                    </span>

                    {/* Confidence */}
                    <span className="rounded-xl bg-surface-alt px-3 py-1.5 text-xs font-semibold text-content">
                      Confidence: {Math.round((decodeResult.confidenceScore || 1) * 100)}%
                    </span>
                  </div>
                </div>

                {/* High-Density Specs Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Trim / Grade</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.trim || 'Standard'}</p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Body Type</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.bodyType || 'Sedan'}</p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Displacement</p>
                    <p className="mt-1 text-sm font-bold text-content">
                      {decodeResult.normalizedSpecs?.engineDisplacementCc
                        ? `${decodeResult.normalizedSpecs?.engineDisplacementCc} cc`
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Fuel Type</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.fuelType || 'Petrol'}</p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Transmission</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.transmission || 'Automatic'}</p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Drivetrain</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.drivetrain || 'FWD'}</p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Manufacturing Country</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.plantCountry || 'Japan'}</p>
                  </div>

                  <div className="rounded-xl bg-surface-alt/70 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-content-muted">Assembly City</p>
                    <p className="mt-1 text-sm font-bold text-content">{decodeResult.normalizedSpecs?.plantCity || 'Toyota City'}</p>
                  </div>
                </div>

                {/* Multi-Provider Attributions */}
                <div className="mt-6 border-t border-line-soft pt-4">
                  <p className="text-xs font-semibold text-content-muted">
                    Verified across {decodeResult.activeProviders?.length || 1} independent provider data stream(s):
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(decodeResult.activeProviders || ['local_iso_decoder']).map((prov: string) => (
                      <span key={prov} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-content">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        {prov}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Discrepancy Diffing Tool ─────────────────────────────────── */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-extrabold text-content">Listing vs Verified Registry Discrepancy Diffing</h2>
            <p className="mt-1 text-xs text-content-muted">
              Compare administrator-entered or seller-claimed listing values side-by-side against verified VIN factory ground truth.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-line-soft bg-surface-alt/40 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-content">Claimed Listing Inputs</h3>
                
                <div>
                  <label className="text-xs font-medium text-content-secondary">Make</label>
                  <input
                    value={listingClaim.make}
                    onChange={(e) => setListingClaim({ ...listingClaim, make: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-content-secondary">Model</label>
                  <input
                    value={listingClaim.model}
                    onChange={(e) => setListingClaim({ ...listingClaim, model: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-content-secondary">Model Year</label>
                  <input
                    type="number"
                    value={listingClaim.year}
                    onChange={(e) => setListingClaim({ ...listingClaim, year: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-content-secondary">Fuel Type</label>
                  <select
                    value={listingClaim.fuel_type}
                    onChange={(e) => setListingClaim({ ...listingClaim, fuel_type: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-line-soft bg-surface-alt/40 p-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-content">Verified VIN Ground Truth</h3>
                  {decodeResult?.normalizedSpecs ? (
                    <div className="mt-4 space-y-2 text-xs">
                      <p className="flex justify-between border-b border-line-soft pb-1">
                        <span className="text-content-muted">Make:</span>
                        <strong className="font-semibold text-content">{decodeResult.normalizedSpecs.make}</strong>
                      </p>
                      <p className="flex justify-between border-b border-line-soft pb-1">
                        <span className="text-content-muted">Model:</span>
                        <strong className="font-semibold text-content">{decodeResult.normalizedSpecs.model}</strong>
                      </p>
                      <p className="flex justify-between border-b border-line-soft pb-1">
                        <span className="text-content-muted">Year:</span>
                        <strong className="font-semibold text-content">{decodeResult.normalizedSpecs.year}</strong>
                      </p>
                      <p className="flex justify-between border-b border-line-soft pb-1">
                        <span className="text-content-muted">Fuel Type:</span>
                        <strong className="font-semibold text-content">{decodeResult.normalizedSpecs.fuelType}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col items-center justify-center p-6 text-center">
                      <Icon name="info" className="h-6 w-6 text-content-muted" />
                      <p className="mt-2 text-xs text-content-muted">Decode a vehicle in Tab 1 to load verified ground truth specs.</p>
                    </div>
                  )}
                </div>

                <button
                  disabled={diffing || !decodeResult?.normalizedSpecs}
                  onClick={handleCompare}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                  Run Discrepancy Diff Check
                </button>
              </div>
            </div>

            {/* Discrepancy Diff Table */}
            {diffResult && (
              <div className="mt-6 border-t border-line-soft pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-content">Diff Results</h3>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    diffResult.hasDiscrepancies ? 'bg-warning-tint text-warning-text' : 'bg-success-tint text-success'
                  }`}>
                    {diffResult.hasDiscrepancies ? `${diffResult.count} Discrepancy Found` : '100% Match'}
                  </span>
                </div>

                {diffResult.hasDiscrepancies ? (
                  <div className="mt-3 space-y-2">
                    {diffResult.discrepancies.map((d: any) => (
                      <div key={d.field} className="flex flex-wrap items-center justify-between rounded-xl border border-warning/20 bg-warning-tint/30 p-3 text-xs">
                        <div>
                          <p className="font-bold text-content">{d.label}</p>
                          <p className="text-content-muted">{d.message}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded bg-surface px-2 py-1 line-through text-danger-strong">{d.entered}</span>
                          <Icon name="arrow-right" className="h-3 w-3 text-content-muted" />
                          <span className="rounded bg-surface px-2 py-1 font-bold text-success-text">{d.verified}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-success-text">All claimed listing fields align perfectly with verified factory data.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: Anomaly & Data Quality Queue ──────────────────────────────── */}
      {activeTab === 'signals' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-4">
              <div>
                <h2 className="text-base font-extrabold text-content">Active Anomaly & Data Quality Stream</h2>
                <p className="mt-1 text-xs text-content-muted">
                  Objective rollback detection and chronological sequence warnings requiring administrative resolution.
                </p>
              </div>
              <button
                onClick={loadSignals}
                disabled={loadingSignals}
                className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-content hover:bg-surface-alt"
              >
                <Icon name="refresh" className={`h-3.5 w-3.5 ${loadingSignals ? 'animate-spin' : ''}`} />
                Refresh Stream
              </button>
            </div>

            {loadingSignals ? (
              <LoadingState />
            ) : signals.length === 0 ? (
              <div className="py-12 text-center">
                <Icon name="check-circle" className="mx-auto h-8 w-8 text-success" />
                <p className="mt-2 text-sm font-bold text-content">Zero active anomaly signals</p>
                <p className="text-xs text-content-muted">All registered vehicles pass chronological and odometer consistency checks.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className={`rounded-xl border p-4 transition-all ${
                      signal.severity === 'critical'
                        ? 'border-danger/30 bg-danger-tint/20'
                        : 'border-warning/30 bg-warning-tint/20'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                              signal.severity === 'critical'
                                ? 'bg-danger text-white'
                                : 'bg-warning text-white'
                            }`}
                          >
                            {signal.severity}
                          </span>
                          <h3 className="text-sm font-bold text-content">{signal.title}</h3>
                          <span className="font-mono text-xs text-content-muted">
                            {signal.make} {signal.model} ({signal.vin_masked})
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-content-secondary">
                          {signal.public_message}
                        </p>
                      </div>

                      <button
                        onClick={() => { setResolvingSignal(signal); setResolutionNote('') }}
                        className="rounded-xl bg-ink-900 px-4 py-2 text-xs font-bold text-white hover:bg-ink-800"
                      >
                        Resolve Signal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Inline Resolution Modal */}
          {resolvingSignal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <Card className="w-full max-w-lg p-6 shadow-2xl">
                <h3 className="text-base font-extrabold text-content">Resolve Anomaly Signal</h3>
                <p className="mt-1 text-xs text-content-muted">
                  Signal: <strong className="text-content">{resolvingSignal.title}</strong> on {resolvingSignal.vin_masked}
                </p>

                <form onSubmit={handleResolveSignal} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-content-secondary mb-1">
                      Administrative Resolution Justification (Required for Audit Log)
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="e.g. Cluster replaced in verified garage with supporting maintenance documentation; reading discrepancy confirmed non-tampered."
                      className="w-full rounded-xl border border-line bg-surface p-3 text-xs text-content focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={resolving}
                      onClick={() => setResolvingSignal(null)}
                      className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-content hover:bg-surface-alt"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resolving || !resolutionNote.trim()}
                      className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50"
                    >
                      {resolving ? 'Recording...' : 'Confirm Resolution'}
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Provenance Ingestion Form ─────────────────────────────────── */}
      {activeTab === 'events' && (
        <Card className="p-6">
          <h2 className="text-base font-extrabold text-content">Append Verified Provenance Event</h2>
          <p className="mt-1 text-xs text-content-muted">
            Record real-world official records into the immutable chronological vehicle history ledger.
          </p>

          <form onSubmit={handleAddEvent} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-content-secondary">Canonical Vehicle ID (UUID)</label>
              <input
                value={eventForm.vehicleId}
                onChange={(e) => setEventForm({ ...eventForm, vehicleId: e.target.value })}
                placeholder="Target vehicle UUID from Tab 1"
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-content-secondary">Event Category</label>
              <select
                value={eventForm.eventType}
                onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-xs"
              >
                <option value="customs_clearance">Rwanda Customs / Duty Paid</option>
                <option value="port_arrival">Port of Mombasa / Dar Arrival</option>
                <option value="inspection">Certified Sawa Inspection</option>
                <option value="odometer">Official Odometer Certification</option>
                <option value="recall">Manufacturer Recall Notice</option>
                <option value="service">Major Dealership Service</option>
                <option value="auction_record">Overseas Auction Report</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-content-secondary">Event Date</label>
              <input
                type="date"
                value={eventForm.eventDate}
                onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-content-secondary">Verified Odometer (km)</label>
              <input
                type="number"
                value={eventForm.odometerKm}
                onChange={(e) => setEventForm({ ...eventForm, odometerKm: e.target.value })}
                placeholder="e.g. 74000"
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-content-secondary">Event Title</label>
              <input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-xs font-bold"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-content-secondary">Public Summary (Safe Consumer View)</label>
              <textarea
                rows={2}
                value={eventForm.publicSummary}
                onChange={(e) => setEventForm({ ...eventForm, publicSummary: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-xs"
                required
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={recordingEvent || !eventForm.vehicleId}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50"
              >
                <Icon name="plus" className="h-4 w-4" />
                {recordingEvent ? 'Recording...' : 'Append Event to Ledger'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── TAB 5: Historical Inspection Records ─────────────────────────────── */}
      {activeTab === 'inspections' && (
        <div className="space-y-6">
          <Card className="p-6">
            <form onSubmit={handleHistoryLookup} className="flex flex-wrap gap-3">
              <label className="min-w-[16rem] flex-1 text-xs font-bold uppercase tracking-wider text-content">
                Search Sawa Inspection History
                <input
                  value={inspectionVin}
                  onChange={(e) => setInspectionVin(e.target.value.toUpperCase())}
                  placeholder="JTDBZ293401234567  ·  NZE121-1234567"
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 font-mono text-sm uppercase focus:border-brand focus:outline-none"
                />
              </label>
              <button
                disabled={loadingHistory}
                className="self-end rounded-xl bg-brand px-5 py-3 text-xs font-bold text-brand-on hover:bg-brand-bright disabled:opacity-50"
              >
                {loadingHistory ? 'Searching...' : 'Search Archive'}
              </button>
            </form>
          </Card>

          {historyResult && (
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-line-soft pb-4">
                <div>
                  <h3 className="text-sm font-bold text-content">Normalized Key: {historyResult.vin?.key}</h3>
                  <p className="text-xs text-content-muted">{historyResult.vin?.note}</p>
                </div>
                <span className="rounded-xl bg-surface-alt px-3 py-1.5 text-xs font-bold text-content">
                  {historyResult.summary?.inspections || 0} inspection(s)
                </span>
              </div>

              {historyResult.inspections?.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {historyResult.inspections.map((i: any) => (
                    <div key={i.id} className="flex items-center justify-between rounded-xl border border-line-soft p-3 text-xs">
                      <div>
                        <p className="font-bold text-content">{i.center || 'Inspection Center'}</p>
                        <p className="text-content-muted">{i.scheduled_on} · Inspector: {i.inspector_name || 'Assigned'}</p>
                      </div>
                      <span className="font-bold text-brand">{i.score}% Score</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-content-muted">No historical inspections on record for this identifier.</p>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
