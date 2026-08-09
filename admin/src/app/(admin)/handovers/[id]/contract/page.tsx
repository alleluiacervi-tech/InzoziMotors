'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api, type ApiError } from '@/lib/api'
import { Card, PageHeader, Pill, fmtMoney } from '@/components/ui'

// The contract generator. The admin stands at the handover desk with two
// physical ID documents and a logbook in hand and transcribes them here; what
// comes out is the only artefact in this system with legal weight. So this page
// is deliberately pessimistic:
//
//   · every field the PDF prints as a fact is shown, pre-filled and named;
//   · everything the backend already knows is missing is marked in red BEFORE
//     anything is pressed, so nothing is discovered on submit;
//   · once a contract exists the form is gone, not disabled — regeneration is
//     impossible by construction, and replacing one is an explicit supersede
//     that keeps the old number, file and register row.

const inputCls    = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand'
const inputBadCls = 'w-full text-sm border border-red-400 bg-red-50 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400'
const labelCls    = 'block text-xs font-semibold text-gray-700 mb-1'
const bannerErr   = 'bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 p-4'

// ─── money ───────────────────────────────────────────────────────────────────
// Contract money is MINOR UNITS in a named currency. RWF is not divided in
// circulation, so a franc is its own minor unit; USD has 100 cents. Nothing
// here converts between currencies: a contract may never cite a guessed FX
// rate, which is also why fmtUSD() is not reused — it would print RWF with a
// dollar sign. Mirrors backend/src/lib/contract/format.js exactly.

const MINOR_PER_MAJOR: Record<string, number> = { RWF: 1, USD: 100 }
const perMajor = (currency: string) => MINOR_PER_MAJOR[currency] ?? 1

/** 24500000 RWF -> "RWF 24,500,000"; 2450050 USD -> "USD 24,500.50" */
function fmtMinor(minor: number | null, currency: string): string {
  if (minor == null || !Number.isFinite(minor)) return '—'
  const per = perMajor(currency)
  if (per === 1) return `${currency} ${Math.round(minor).toLocaleString('en-US')}`
  const major = Math.floor(minor / per)
  const rest  = Math.round(minor % per)
  return `${currency} ${major.toLocaleString('en-US')}.${String(rest).padStart(2, '0')}`
}

/** Minor units -> what the admin types: whole francs, or dollars.cents. */
function minorToInput(minor: unknown, currency: string): string {
  if (minor == null || minor === '') return ''
  const n = Number(minor)
  if (!Number.isFinite(n)) return ''
  const per = perMajor(currency)
  return per === 1 ? String(Math.round(n)) : (n / per).toFixed(2)
}

/** What the admin typed -> minor units. null when blank, NaN when unparseable. */
function inputToMinor(text: string, currency: string): number | null {
  const t = String(text ?? '').replace(/[\s,]/g, '').trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return NaN
  return Math.round(n * perMajor(currency))
}

/** A finite number, or null — so NaN never reaches a formatter. */
const finite = (v: number | null): number | null => (v != null && Number.isFinite(v) ? v : null)

// ─── the editable leaves, per dotted group ───────────────────────────────────
// Only what the PDF prints or the backend learns from. body_type and drive_side
// are on the prefill but appear on neither, so they are left untouched rather
// than round-tripped through a form.

type Group = 'seller' | 'buyer' | 'vehicle' | 'terms' | 'sawa'
type Form = Record<Group, Record<string, string>>

const PARTY_FIELDS = ['legal_name', 'id_type', 'id_number', 'id_expiry', 'phone',
  'address_line', 'district', 'sector', 'cell']

const EDITABLE: Record<Group, string[]> = {
  seller: PARTY_FIELDS,
  buyer: PARTY_FIELDS,
  vehicle: ['make', 'model', 'year', 'vin', 'plate', 'mileage_km', 'fuel',
    'transmission', 'colour', 'condition_grade', 'condition'],
  terms: ['currency', 'price_minor', 'deposit_minor', 'payment_method',
    'handover_on', 'handover_time', 'handover_center', 'balance_due_on'],
  sawa: ['officer_name', 'officer_id'],
}

// Mirrors REQUIRED in backend/src/lib/contract/validate.js — same order, same
// labels, so a client-side refusal reads identically to a server-side one.
const REQUIRED: [string, string][] = [
  ['seller.legal_name', 'Seller — full legal name'],
  ['seller.id_number', 'Seller — national ID or passport number'],
  ['seller.id_type', 'Seller — identity document type'],
  ['seller.phone', 'Seller — telephone'],
  ['seller.address_line', 'Seller — address'],
  ['seller.district', 'Seller — district'],
  ['buyer.legal_name', 'Buyer — full legal name'],
  ['buyer.id_number', 'Buyer — national ID or passport number'],
  ['buyer.id_type', 'Buyer — identity document type'],
  ['buyer.phone', 'Buyer — telephone'],
  ['buyer.address_line', 'Buyer — address'],
  ['buyer.district', 'Buyer — district'],
  ['vehicle.make', 'Vehicle — make'],
  ['vehicle.model', 'Vehicle — model'],
  ['vehicle.year', 'Vehicle — year of manufacture'],
  ['vehicle.vin', 'Vehicle — chassis / VIN'],
  ['vehicle.plate', 'Vehicle — registration plate'],
  ['vehicle.mileage_km', 'Vehicle — odometer reading'],
  ['vehicle.condition', 'Vehicle — declared condition'],
  ['terms.currency', 'Sale terms — currency'],
  ['terms.price_minor', 'Sale terms — agreed price'],
  ['terms.payment_method', 'Sale terms — payment method'],
  ['terms.handover_on', 'Sale terms — handover date'],
  ['terms.handover_center', 'Sale terms — handover centre'],
  ['sawa.officer_name', 'Sawa Cars — name of authorised officer'],
  ['sawa.officer_id', 'Sawa Cars — staff ID of authorised officer'],
]

const ID_TYPE_OPTIONS = [
  { value: '', label: '— select document type —' },
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_licence', label: 'Driving licence' },
]

const GRADE_OPTIONS = [
  { value: '', label: '— not graded —' },
  { value: 'A', label: 'A — excellent' },
  { value: 'B', label: 'B — good' },
  { value: 'C', label: 'C — fair' },
  { value: 'D', label: 'D — poor' },
]

const CURRENCY_OPTIONS = [
  { value: 'RWF', label: 'RWF — Rwandan franc' },
  { value: 'USD', label: 'USD — US dollar' },
]

const isDateStr = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

const fileHref = (contractId: string, download = false) =>
  `/api/backend/contracts/${contractId}/file${download ? '?download=1' : ''}`

const when = (ts?: string | null) => (ts ? new Date(ts).toLocaleString() : '—')

function seedForm(data: any): Form {
  const currency = data?.terms?.currency === 'USD' ? 'USD' : 'RWF'
  const out = {} as Form
  for (const group of Object.keys(EDITABLE) as Group[]) {
    const src = data?.[group] || {}
    const vals: Record<string, string> = {}
    for (const key of EDITABLE[group]) {
      const v = src[key]
      vals[key] = v == null ? '' : String(v)
    }
    out[group] = vals
  }
  out.terms.currency      = currency
  out.terms.price_minor   = minorToInput(data?.terms?.price_minor, currency)
  out.terms.deposit_minor = minorToInput(data?.terms?.deposit_minor, currency)
  return out
}

// ─── presentational bits ─────────────────────────────────────────────────────

function Fieldset({
  n, title, description, children,
}: { n: number; title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft bg-surface-alt px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-content">
          {n}. {title}
        </h2>
        {description ? <p className="mt-1 text-xs text-content-muted">{description}</p> : null}
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </Card>
  )
}

function Field({
  label, value, onChange, error, hint, type = 'text', options, textarea, placeholder, mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  type?: string
  options?: { value: string; label: string }[]
  textarea?: boolean
  placeholder?: string
  mono?: boolean
}) {
  const cls = `${error ? inputBadCls : inputCls}${mono ? ' font-mono' : ''}`
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
      {error
        ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
        : hint ? <p className="mt-1 text-xs text-content-muted">{hint}</p> : null}
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className="text-sm text-content-secondary">{value || '—'}</p>
    </div>
  )
}

const pdfBtn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700'
const pdfBtnAlt = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-brand hover:text-brand'

function PdfLinks({ contractId }: { contractId: string }) {
  return (
    <>
      <a href={fileHref(contractId)} target="_blank" rel="noreferrer" className={pdfBtn}>
        Open PDF
      </a>
      <a href={fileHref(contractId, true)} target="_blank" rel="noreferrer" className={pdfBtnAlt}>
        Download
      </a>
    </>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ContractPage() {
  const { id } = useParams<{ id: string }>()

  const [prefill, setPrefill]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')

  const [form, setForm]                 = useState<Form | null>(null)
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({})
  const [formError, setFormError]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [issued, setIssued]             = useState<any>(null)

  const [actionId, setActionId]           = useState<string | null>(null)
  const [liveError, setLiveError]         = useState('')
  const [supersedeOpen, setSupersedeOpen] = useState(false)
  const [reason, setReason]               = useState('')
  const [supersedeError, setSupersedeError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await api.contractPrefill(id)
      setPrefill(data)
      setForm(seedForm(data.data))
      // The backend already knows what is missing. Show it now, in the inputs,
      // rather than after a wasted round trip.
      const seeded: Record<string, string> = {}
      for (const m of data.missing || []) seeded[m.field] = m.problem
      setFieldErrors(seeded)
      setLoadError('')
    } catch (e: any) {
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  function set(group: Group, key: string, value: string) {
    setForm((prev) => (prev ? { ...prev, [group]: { ...prev[group], [key]: value } } : prev))
    // The red marker describes the value that WAS there; typing retires it.
    setFieldErrors((prev) => {
      const path = `${group}.${key}`
      if (!prev[path]) return prev
      const next = { ...prev }
      delete next[path]
      return next
    })
  }

  const live = prefill?.live_contract || null
  const data = prefill?.data || null
  const canGenerate = !!prefill?.can_generate

  const currency     = form?.terms.currency || 'RWF'
  const priceMinor   = finite(inputToMinor(form?.terms.price_minor ?? '', currency))
  const depositMinor = finite(inputToMinor(form?.terms.deposit_minor ?? '', currency)) ?? 0
  const balanceMinor = priceMinor == null ? null : priceMinor - depositMinor

  function validate(f: Form): Record<string, string> {
    const errs: Record<string, string> = {}
    const val = (path: string) => String(f[path.split('.')[0] as Group]?.[path.split('.')[1]] ?? '').trim()

    for (const [path] of REQUIRED) {
      if (!val(path)) errs[path] = 'is required'
    }

    const nextYear = new Date().getUTCFullYear() + 1
    const year = Number(val('vehicle.year'))
    if (val('vehicle.year') && (!Number.isInteger(year) || year < 1950 || year > nextYear)) {
      errs['vehicle.year'] = `must be a year between 1950 and ${nextYear}`
    }
    const km = Number(val('vehicle.mileage_km'))
    if (val('vehicle.mileage_km') && (!Number.isInteger(km) || km < 0 || km > 2_000_000)) {
      errs['vehicle.mileage_km'] = 'must be a whole number of kilometres'
    }

    const price = inputToMinor(f.terms.price_minor, f.terms.currency)
    if (val('terms.price_minor') && (price == null || !Number.isFinite(price) || price <= 0)) {
      errs['terms.price_minor'] = 'must be greater than zero'
    }
    if (val('terms.deposit_minor')) {
      const dep = inputToMinor(f.terms.deposit_minor, f.terms.currency)
      if (dep == null || !Number.isFinite(dep) || dep < 0) {
        errs['terms.deposit_minor'] = 'must be zero or more'
      } else if (price != null && Number.isFinite(price) && dep > price) {
        errs['terms.deposit_minor'] = 'cannot be more than the agreed price'
      }
    }

    if (val('terms.handover_on') && !isDateStr(val('terms.handover_on'))) {
      errs['terms.handover_on'] = 'must be a date (YYYY-MM-DD)'
    }
    if (val('terms.balance_due_on')) {
      if (!isDateStr(val('terms.balance_due_on'))) {
        errs['terms.balance_due_on'] = 'must be a date (YYYY-MM-DD)'
      } else if (isDateStr(val('terms.handover_on'))
        && Date.parse(val('terms.balance_due_on')) < Date.parse(val('terms.handover_on'))) {
        errs['terms.balance_due_on'] = 'falls before the handover date'
      }
    }

    // An expired document cannot be cited as proof of identity.
    for (const side of ['seller', 'buyer'] as const) {
      const exp = val(`${side}.id_expiry`)
      if (!exp) continue
      if (!isDateStr(exp)) {
        errs[`${side}.id_expiry`] = 'must be a date (YYYY-MM-DD)'
      } else if (Date.parse(exp) < Date.now()) {
        errs[`${side}.id_expiry`] = 'has passed — an expired document cannot identify a party'
      }
    }
    return errs
  }

  function buildPayload(f: Form) {
    const num = (v: string) => (String(v).trim() === '' ? '' : Number(String(v).replace(/[\s,]/g, '')))
    return {
      seller: { ...f.seller },
      buyer: { ...f.buyer },
      vehicle: { ...f.vehicle, year: num(f.vehicle.year), mileage_km: num(f.vehicle.mileage_km) },
      terms: {
        ...f.terms,
        price_minor: inputToMinor(f.terms.price_minor, f.terms.currency),
        deposit_minor: inputToMinor(f.terms.deposit_minor, f.terms.currency) ?? 0,
      },
      sawa: { ...f.sawa },
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const errs = validate(form)
    const count = Object.keys(errs).length
    if (count) {
      setFieldErrors(errs)
      setFormError(
        `${count} field${count === 1 ? '' : 's'} still ${count === 1 ? 'needs' : 'need'} attention — `
        + 'each one is marked in red below. Nothing has been generated.'
      )
      return
    }
    if (!window.confirm(
      'Generate the sale agreement? A contract number is allocated permanently and the PDF '
      + 'becomes the record of this sale — replacing it later requires an explicit supersede.'
    )) return

    setSaving(true)
    setFormError('')
    try {
      const contract = await api.generateContract(id, buildPayload(form))
      setIssued(contract)
      setFieldErrors({})
      await load()
    } catch (e) {
      const err = e as ApiError
      if (err.code === 'VALIDATION_FAILED' && err.errors?.length) {
        const mapped: Record<string, string> = {}
        for (const f of err.errors) mapped[f.field] = f.problem
        setFieldErrors(mapped)
        setFormError(
          `${err.message} ${err.errors.length} field${err.errors.length === 1 ? '' : 's'} `
          + 'rejected by the server — marked in red below.'
        )
      } else {
        setFormError(err.message)
        // The server's view of this handover moved: a contract now exists, or a
        // number is reserved by a draft. Re-read rather than guess.
        if (err.code === 'CONTRACT_EXISTS' || err.code === 'RENDER_FAILED' || err.code === 'WRITE_FAILED') {
          await load()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function signIt() {
    if (!live) return
    if (!window.confirm(
      `Record contract ${live.contract_number} as signed? Only an issued contract can be signed, `
      + 'and after this it can never be regenerated — only superseded.'
    )) return
    setActionId(live.id)
    setLiveError('')
    try {
      await api.markContractSigned(live.id)
      await load()
    } catch (e: any) {
      setLiveError(e.message)
    } finally {
      setActionId(null)
    }
  }

  async function supersede() {
    if (!live) return
    const r = reason.trim()
    if (r.length < 5) {
      setSupersedeError('Give a reason of at least 5 characters — it is written into the register against the old number.')
      return
    }
    if (!window.confirm(
      `Supersede ${live.contract_number}? It stays in the register as “superseded” with this reason, `
      + 'its PDF is kept, and the replacement is issued under a NEW number.'
    )) return
    setActionId(live.id)
    setSupersedeError('')
    try {
      await api.supersedeContract(live.id, r)
      setSupersedeOpen(false)
      setReason('')
      setIssued(null)
      setLiveError('')
      await load()
    } catch (e: any) {
      setSupersedeError(e.message)
    } finally {
      setActionId(null)
    }
  }

  if (loading && !prefill) return <div className="text-sm text-gray-400">Loading contract…</div>
  if (loadError && !prefill) {
    return (
      <div>
        <div className={bannerErr}>Error: {loadError}</div>
        <Link href="/handovers" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          ← Back to handovers
        </Link>
      </div>
    )
  }
  if (!prefill || !form || !data) return <div className={bannerErr}>Contract prefill unavailable.</div>

  const vehicleTitle = [data.vehicle.year, data.vehicle.make, data.vehicle.model]
    .filter(Boolean).join(' ') || 'Vehicle'

  // Identity warnings. The seller's verification is a platform fact; a buyer is
  // never required to verify, so their identity is always transcribed from paper.
  const warnings: string[] = []
  if (data.seller.id_verified !== 'approved') {
    warnings.push(
      `The seller's ID verification is “${data.seller.id_verified || 'not submitted'}” — Sawa has not `
      + 'approved their documents, so nothing below has been checked against a scan.'
    )
  }
  if (data.buyer.id_verified !== 'approved') {
    warnings.push(
      'The buyer has no approved ID verification on the platform'
      + (data.buyer.id_number ? '' : ' and no document number on file')
      + ' — buyers are never required to verify, so their identity rests entirely on what you transcribe here.'
    )
  }

  return (
    <div>
      <PageHeader
        title="Sale agreement"
        description={`${vehicleTitle} · Booking ${data.handover.booking_id || '—'} · handover is ${data.handover.status}`}
        action={
          <Link href="/handovers" className="text-sm font-semibold text-brand hover:underline">
            ← Handovers
          </Link>
        }
      />

      {/* Draft watermark — the single most important thing to know before printing */}
      {prefill.draft_mode && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Draft mode — every page is watermarked “DRAFT — NOT FOR SIGNATURE”.</p>
          <p className="mt-1">
            The clauses have not been through legal review yet, so the PDF this page produces is a
            working document only. Do not have anyone sign it. Once a lawyer signs the clauses off,
            the server flag is switched and contracts issue unwatermarked.
          </p>
        </div>
      )}

      {/* Handover not agreed — generation is impossible, say so first and loudly */}
      {!canGenerate && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">A contract cannot be generated for this handover.</p>
          <p className="mt-1">{prefill.status_reason}</p>
          <Link href="/handovers" className="mt-2 inline-block font-semibold underline">
            Go to handovers and confirm the arrangement first
          </Link>
        </div>
      )}

      {/* Identity warnings — a warning, never a block: paper is the source of truth */}
      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Check the physical documents before you generate.</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Just issued */}
      {issued && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-bold">
            Contract <span className="font-mono">{issued.contract_number}</span> issued
            {issued.page_count ? ` · ${issued.page_count} page${issued.page_count === 1 ? '' : 's'}` : ''}
            {issued.draft_watermark ? ' · watermarked DRAFT' : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PdfLinks contractId={issued.id} />
          </div>
        </div>
      )}

      {live ? (
        /* ─── a contract already exists: this is the page's primary state ─── */
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft p-5">
              <div>
                <p className="font-mono text-lg font-bold tracking-tight text-content">
                  {live.contract_number}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                  <Pill status={live.status} />
                  <span>
                    {live.page_count ? `${live.page_count} page${live.page_count === 1 ? '' : 's'}` : 'no pages recorded'}
                  </span>
                  {live.draft_watermark ? <span>· watermarked DRAFT</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {live.status === 'draft' ? (
                  <span className="text-xs text-content-muted">No file — generation did not finish</span>
                ) : (
                  <PdfLinks contractId={live.id} />
                )}
                {live.status === 'issued' && (
                  <button
                    onClick={signIt}
                    disabled={actionId === live.id}
                    className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                  >
                    {actionId === live.id ? 'Working…' : 'Mark signed'}
                  </button>
                )}
              </div>
            </div>

            <dl className="grid gap-4 p-5 text-xs sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-gray-700">Generated</dt>
                <dd className="text-content-muted">{when(live.generated_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Issued</dt>
                <dd className="text-content-muted">{when(live.issued_at)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Signed</dt>
                <dd className="text-content-muted">{when(live.signed_at)}</dd>
              </div>
            </dl>

            {live.status === 'draft' && (
              <div className="mx-5 mb-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Number <span className="font-mono">{live.contract_number}</span> is allocated but the PDF
                was never written — the render or the disk write failed. The number is spent either way
                (that is what keeps the register gap-free); supersede this row to issue a corrected
                contract under the next number.
              </div>
            )}

            {liveError && <div className={`mx-5 mb-5 ${bannerErr}`}>{liveError}</div>}
          </Card>

          {/* The lock. Regeneration is not a button that is disabled — it does not exist. */}
          <Card className="border-line">
            <div className="p-5">
              <p className="text-sm font-bold text-content">
                This handover already has a contract, so a new one cannot be generated.
              </p>
              <p className="mt-1 text-sm text-content-secondary">
                A contract is never regenerated in place — that is the whole point of the number.
                To correct a mistake you supersede <span className="font-mono">{live.contract_number}</span>:
                it keeps its number, its PDF and its row in the register, is marked
                <span className="font-semibold"> superseded</span> with your reason, and the corrected
                contract is issued under a <span className="font-semibold">new</span> number.
                {live.status === 'signed'
                  ? ' This one is already signed on paper, so superseding it means retrieving and voiding the paper copy too.'
                  : ''}
              </p>

              {!supersedeOpen ? (
                <button
                  onClick={() => { setSupersedeOpen(true); setSupersedeError('') }}
                  className="mt-4 px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Supersede &amp; replace
                </button>
              ) : (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <label className="mb-2 block text-xs font-semibold text-red-700">
                    Why is {live.contract_number} being replaced? (at least 5 characters — it is stored
                    against the old number forever)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-red-200 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                    placeholder="e.g. Buyer's national ID number was transcribed with two digits transposed…"
                  />
                  {supersedeError && <p className="mt-2 text-xs font-semibold text-red-600">{supersedeError}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={supersede}
                      disabled={actionId === live.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionId === live.id ? 'Working…' : 'Confirm supersede'}
                    </button>
                    <button
                      onClick={() => { setSupersedeOpen(false); setReason(''); setSupersedeError('') }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        /* ─── no live contract: the form ─── */
        <form onSubmit={submit} className="space-y-5">
          <Fieldset
            n={1}
            title="Parties to this agreement"
            description="Transcribe both parties exactly as their identity document reads — names on documents differ from display names in order, middle names and spelling. Rwandan domicile is District → Sector → Cell."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {(['seller', 'buyer'] as const).map((side) => (
                <div key={side} className="space-y-4">
                  <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                      {side === 'seller' ? 'Seller' : 'Buyer'}
                    </h3>
                    <span className="truncate text-xs text-content-muted">
                      {data[side].display_name || '—'}{data[side].email ? ` · ${data[side].email}` : ''}
                    </span>
                  </div>

                  <Field
                    label="Full legal name (as on document) *"
                    value={form[side].legal_name}
                    onChange={(v) => set(side, 'legal_name', v)}
                    error={fieldErrors[`${side}.legal_name`]}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Document type *"
                      value={form[side].id_type}
                      onChange={(v) => set(side, 'id_type', v)}
                      error={fieldErrors[`${side}.id_type`]}
                      options={ID_TYPE_OPTIONS}
                    />
                    <Field
                      label="Document expiry"
                      type="date"
                      value={form[side].id_expiry}
                      onChange={(v) => set(side, 'id_expiry', v)}
                      error={fieldErrors[`${side}.id_expiry`]}
                      hint="Leave blank if the document does not expire."
                    />
                  </div>
                  <Field
                    label="Document number *"
                    value={form[side].id_number}
                    onChange={(v) => set(side, 'id_number', v)}
                    error={fieldErrors[`${side}.id_number`]}
                    mono
                    placeholder="e.g. 1198780012345678"
                  />
                  <Field
                    label="Telephone *"
                    value={form[side].phone}
                    onChange={(v) => set(side, 'phone', v)}
                    error={fieldErrors[`${side}.phone`]}
                    placeholder="+250 7…"
                  />
                  <Field
                    label="Address line *"
                    value={form[side].address_line}
                    onChange={(v) => set(side, 'address_line', v)}
                    error={fieldErrors[`${side}.address_line`]}
                    placeholder="e.g. KG 9 Ave"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Field
                      label="District *"
                      value={form[side].district}
                      onChange={(v) => set(side, 'district', v)}
                      error={fieldErrors[`${side}.district`]}
                    />
                    <Field
                      label="Sector"
                      value={form[side].sector}
                      onChange={(v) => set(side, 'sector', v)}
                      error={fieldErrors[`${side}.sector`]}
                    />
                    <Field
                      label="Cell"
                      value={form[side].cell}
                      onChange={(v) => set(side, 'cell', v)}
                      error={fieldErrors[`${side}.cell`]}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-content-muted">
              Saving writes these identity and address details back onto both user records, so the next
              contract for either party pre-fills itself.
            </p>
          </Fieldset>

          <Fieldset
            n={2}
            title="Vehicle"
            description="The document must identify the car unambiguously: chassis number and plate are what a registry search runs against."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Make *" value={form.vehicle.make} onChange={(v) => set('vehicle', 'make', v)} error={fieldErrors['vehicle.make']} />
              <Field label="Model *" value={form.vehicle.model} onChange={(v) => set('vehicle', 'model', v)} error={fieldErrors['vehicle.model']} />
              <Field label="Year of manufacture *" type="number" value={form.vehicle.year} onChange={(v) => set('vehicle', 'year', v)} error={fieldErrors['vehicle.year']} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Chassis / VIN *" value={form.vehicle.vin} onChange={(v) => set('vehicle', 'vin', v)} error={fieldErrors['vehicle.vin']} mono />
              <Field label="Registration plate *" value={form.vehicle.plate} onChange={(v) => set('vehicle', 'plate', v)} error={fieldErrors['vehicle.plate']} mono placeholder="e.g. RAD 123 B" />
              <Field label="Odometer at handover (km) *" type="number" value={form.vehicle.mileage_km} onChange={(v) => set('vehicle', 'mileage_km', v)} error={fieldErrors['vehicle.mileage_km']} />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Fuel" value={form.vehicle.fuel} onChange={(v) => set('vehicle', 'fuel', v)} error={fieldErrors['vehicle.fuel']} />
              <Field label="Transmission" value={form.vehicle.transmission} onChange={(v) => set('vehicle', 'transmission', v)} error={fieldErrors['vehicle.transmission']} />
              <Field label="Colour" value={form.vehicle.colour} onChange={(v) => set('vehicle', 'colour', v)} error={fieldErrors['vehicle.colour']} />
              <Field label="Condition grade" value={form.vehicle.condition_grade} onChange={(v) => set('vehicle', 'condition_grade', v)} error={fieldErrors['vehicle.condition_grade']} options={GRADE_OPTIONS} />
            </div>
            <ReadOnly label="Inspection (printed as-is)" value={data.vehicle.inspection_summary} />
            <Field
              label="Declared condition *"
              textarea
              value={form.vehicle.condition}
              onChange={(v) => set('vehicle', 'condition', v)}
              error={fieldErrors['vehicle.condition']}
              hint="Printed verbatim. Anything not disclosed here cannot later be called a hidden defect."
              placeholder="e.g. Sold as inspected — 138/150. Minor kerb scuff on the front-left alloy, disclosed to the buyer."
            />
          </Fieldset>

          <Fieldset
            n={3}
            title="Sale terms"
            description="The figure below is the agreed price in the currency you choose. It is never converted — a contract may not cite a guessed exchange rate."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Currency *"
                value={form.terms.currency}
                onChange={(v) => set('terms', 'currency', v)}
                error={fieldErrors['terms.currency']}
                options={CURRENCY_OPTIONS}
                hint="Changing this does not convert the amounts — re-enter them."
              />
              <Field
                label={`Agreed price (${currency}) *`}
                value={form.terms.price_minor}
                onChange={(v) => set('terms', 'price_minor', v)}
                error={fieldErrors['terms.price_minor']}
                hint={currency === 'RWF' ? 'Whole francs.' : 'Dollars and cents, e.g. 24500.50'}
              />
              <Field
                label={`Deposit already paid (${currency})`}
                value={form.terms.deposit_minor}
                onChange={(v) => set('terms', 'deposit_minor', v)}
                error={fieldErrors['terms.deposit_minor']}
                hint="Leave blank if none."
              />
            </div>

            {/* Live money preview — what the PDF will print, computed the same way */}
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold text-content-muted">Agreed price</p>
                  <p className="mt-0.5 text-lg font-extrabold tracking-[-0.02em] text-content">
                    {fmtMinor(priceMinor, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Deposit paid</p>
                  <p className="mt-0.5 text-lg font-extrabold tracking-[-0.02em] text-content">
                    {depositMinor > 0 ? fmtMinor(depositMinor, currency) : 'None'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-content-muted">Balance due</p>
                  <p className={`mt-0.5 text-lg font-extrabold tracking-[-0.02em] ${
                    balanceMinor != null && balanceMinor < 0 ? 'text-red-600' : 'text-brand'
                  }`}>
                    {balanceMinor == null
                      ? '—'
                      : balanceMinor <= 0 ? 'Paid in full' : fmtMinor(balanceMinor, currency)}
                  </p>
                </div>
              </div>
              {balanceMinor != null && balanceMinor < 0 && (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  The deposit is larger than the agreed price — the server will refuse this.
                </p>
              )}
              {data.terms.legacy_usd_price_hint != null && (
                <p className="mt-3 text-xs text-content-muted">
                  Hint only: the listing price recorded at booking was
                  {' '}<span className="font-semibold">{fmtMoney(data.terms.legacy_usd_price_hint, 'USD')}</span>{' '}
                  (a legacy USD figure carried over from the listing). It is shown for reference and is
                  deliberately not converted — enter the amount the parties actually agreed.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Payment method *"
                value={form.terms.payment_method}
                onChange={(v) => set('terms', 'payment_method', v)}
                error={fieldErrors['terms.payment_method']}
                placeholder="e.g. Bank transfer, MTN MoMo, cash at centre"
              />
              <Field
                label="Balance due on"
                type="date"
                value={form.terms.balance_due_on}
                onChange={(v) => set('terms', 'balance_due_on', v)}
                error={fieldErrors['terms.balance_due_on']}
                hint="Leave blank if the price is paid in full at handover."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Handover date *"
                type="date"
                value={form.terms.handover_on}
                onChange={(v) => set('terms', 'handover_on', v)}
                error={fieldErrors['terms.handover_on']}
              />
              <Field
                label="Handover time"
                value={form.terms.handover_time}
                onChange={(v) => set('terms', 'handover_time', v)}
                error={fieldErrors['terms.handover_time']}
                placeholder="e.g. 10:00 AM"
              />
              <Field
                label="Handover centre *"
                value={form.terms.handover_center}
                onChange={(v) => set('terms', 'handover_center', v)}
                error={fieldErrors['terms.handover_center']}
              />
            </div>
            {data.terms.handover_center_address && (
              <ReadOnly label="Centre address on file" value={data.terms.handover_center_address} />
            )}
            <p className="text-xs text-content-muted">
              These terms are written back onto the handover when the contract is generated — the
              commission recorded at completion is computed from them.
            </p>
          </Fieldset>

          <Fieldset
            n={4}
            title="Sawa Cars signatory"
            description={`The officer who signs for ${data.company?.legal_name || 'Sawa Cars'} as intermediary and witness. Name and staff ID are both printed.`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Authorised officer name *"
                value={form.sawa.officer_name}
                onChange={(v) => set('sawa', 'officer_name', v)}
                error={fieldErrors['sawa.officer_name']}
              />
              <Field
                label="Officer staff ID *"
                value={form.sawa.officer_id}
                onChange={(v) => set('sawa', 'officer_id', v)}
                error={fieldErrors['sawa.officer_id']}
                mono
                placeholder="e.g. SC-0114"
              />
            </div>
            {data.company && (
              <p className="text-xs text-content-muted">
                {data.company.legal_name}
                {data.company.tin ? ` · TIN ${data.company.tin}` : ''}
                {data.company.address ? ` · ${data.company.address}` : ''}
              </p>
            )}
          </Fieldset>

          {formError && <div className={bannerErr}>{formError}</div>}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-soft pt-4">
            <Link
              href="/handovers"
              className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !canGenerate}
              className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
            >
              {saving ? 'Generating…' : canGenerate ? 'Generate contract' : 'Generation blocked'}
            </button>
          </div>
        </form>
      )}

      {/* Every contract ever issued against this handover, live or retired. */}
      {prefill.contracts?.length > 1 && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-line-soft bg-surface-alt px-5 py-3">
            <h2 className="text-sm font-bold text-content">History for this handover</h2>
            <p className="mt-0.5 text-xs text-content-muted">
              Superseded numbers are never reused and never deleted.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pages</th>
                  <th className="px-4 py-3 font-medium">Generated</th>
                  <th className="px-4 py-3 text-right font-medium">File</th>
                </tr>
              </thead>
              <tbody>
                {prefill.contracts.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-gray-900">{c.contract_number}</td>
                    <td className="px-4 py-3"><Pill status={c.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{c.page_count ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {c.generated_at ? new Date(c.generated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'draft' ? (
                        <span className="text-xs text-gray-400">none</span>
                      ) : (
                        <a
                          href={fileHref(c.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          Open PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
