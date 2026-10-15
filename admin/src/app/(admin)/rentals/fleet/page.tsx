'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState, fmtMoney, formatRwfInput, parseRwfInput } from '@/components/ui'
import { QueueSearch } from '@/components/QueueSearch'
import { useConfirm, useToast } from '@/components/feedback'
import { fmtDate } from '@/lib/format'
import { MoneyInput } from '@/components/MoneyInput'
import { RentalCheckForm } from '@/components/RentalCheckForm'

const EMPTY = {
  provider_id: '', title: '', make: '', model: '', year: '', daily_rate: '',
  weekly_rate: '', deposit: '', min_days: '1', mileage: '', location: '',
  images: '', status: 'active', inspection_id: '',
}

const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none'
// The API takes six photos per request (RENTAL_PHOTOS_PER_REQUEST) and forty per car.
const PHOTOS_PER_UPLOAD = 6
const MAX_PHOTOS = 40
const PHOTO_TYPES = 'image/jpeg,image/png,image/webp'

/** Upload picked photos to a saved car, six at a time. Returns how many failed. */
async function uploadPhotos(carId: string, files: File[]): Promise<{ failed: number; error?: string }> {
  let failed = 0
  let error: string | undefined
  for (let i = 0; i < files.length; i += PHOTOS_PER_UPLOAD) {
    const batch = files.slice(i, i + PHOTOS_PER_UPLOAD)
    const data = new FormData()
    batch.forEach((file) => data.append('photos', file))
    try { await api.uploadRentalPhotos(carId, data) }
    catch (e: any) { failed += batch.length; error = e?.message }
  }
  return { failed, error }
}
const label = 'mb-1 block text-xs font-semibold text-gray-700'
const number = (value: string) => value === '' ? undefined : Number.parseInt(value, 10)

// 'pending_review' reads as an underscored fragment under a plain `capitalize`
// class — this is the one status a provider can put a car into themselves
// (POST /rentals/propose), and it is the one that most needs an operator's
// attention, so it gets its own label and its own colour rather than sharing
// the neutral grey the admin-created statuses use.
const STATUS_LABEL: Record<string, string> = {
  all: 'All', active: 'Active', maintenance: 'Maintenance', retired: 'Retired',
  pending_review: 'Pending review', check_requested: 'Check requested',
}

// Where the car stands on its 10-point Rental Check — derived once, on the
// server (rentalCheckStatus in routes/rentals.js).
const CHECK: Record<string, { label: string; tone: string; listable: boolean }> = {
  requested: { label: 'Rental Check requested', tone: 'bg-info-tint text-info', listable: false },
  none: { label: 'No Rental Check yet', tone: 'bg-danger-tint text-danger-strong', listable: false },
  legacy: { label: 'Listed on a 150-point inspection', tone: 'bg-gray-100 text-gray-600', listable: true },
  failed: { label: 'Rental Check failed — not public', tone: 'bg-danger-tint text-danger-strong', listable: false },
  expired: { label: 'Check or document expired — not public', tone: 'bg-danger-tint text-danger-strong', listable: false },
  expiring: { label: 'A document or the check runs out within 30 days', tone: 'bg-warning-tint text-warning-text', listable: true },
  passed: { label: 'Rental Check passed', tone: 'bg-success-tint text-success-text', listable: true },
}

export default function RentalFleetPage() {
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [renewAmount, setRenewAmount] = useState<Record<string, string>>({})
  // Prefilled from the rate card so "Pay 30 days" defaults to the current
  // published price rather than whatever an operator remembers charging last
  // time — still a plain field, one edit away from a one-off different amount.
  const [defaultSubAmount, setDefaultSubAmount] = useState('')
  const [renewing, setRenewing] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [providerQuery, setProviderQuery] = useState('')
  const [providers, setProviders] = useState<any[]>([])
  const [inspections, setInspections] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  // Photos picked in the form, uploaded once the car is saved (a new car has no
  // id to upload to until then).
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const photoInput = useRef<HTMLInputElement>(null)
  const photoPreviews = useMemo(() => photoFiles.map((file) => URL.createObjectURL(file)), [photoFiles])
  useEffect(() => () => photoPreviews.forEach((url) => URL.revokeObjectURL(url)), [photoPreviews])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkRenewing, setBulkRenewing] = useState(false)
  const [checking, setChecking] = useState<any | null>(null)
  const toast = useToast()
  const ask = useConfirm()

  async function load() {
    setLoading(true); setError(null)
    try {
      const [fleet, completedInspections] = await Promise.all([
        api.rentalCars(), api.inspections({ status: 'complete' }),
      ])
      setCars(fleet)
      setInspections(completedInspections.filter((inspection) => inspection.passed && inspection.checklist_version === 'sawa-150-v1'))
    }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    api.rateCard().then((rates) => setDefaultSubAmount(formatRwfInput(String(rates.rental_subscription_monthly_rwf)))).catch(() => {})
  }, [])

  // The eligible set used to be filtered out silently, so a seller who was
  // simply missing a flag looked exactly like a typo: no results, no reason. A
  // rental provider needs four things at once, and the operator has to be told
  // which one is absent — with somewhere to go and fix it.
  useEffect(() => {
    const q = providerQuery.trim()
    if (q.length < 2) { setProviders([]); return }
    const timer = window.setTimeout(() => {
      api.searchUsers(q, 20)
        // Admins are never providers, so listing one with a blocker would be
        // noise rather than help. Everyone else is shown WITH the reason.
        .then((rows) => setProviders(rows.filter((row) => row.role !== 'admin').map((row) => {
          const blockers: string[] = []
          if (row.role !== 'seller') blockers.push('not a seller account')
          if (row.id_verified !== 'approved') blockers.push('identity not verified')
          if (row.business_verified !== true) blockers.push('not business-verified')
          if (row.account_status !== 'active') blockers.push('account suspended')
          return { ...row, blockers }
        })))
        .catch(() => setProviders([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [providerQuery])

  // Lowest number = needs an operator soonest. A paid car still sitting off
  // the public feed is one click from live and the cheapest win on the page;
  // an unreviewed proposal needs both a look and a payment; an active car
  // that has already lapsed or is about to is losing bookings right now.
  // Everything else — paid and live, maintenance, retired — can wait.
  function urgencyRank(car: any): number {
    if (car.publishable) return 0
    // A provider waiting for Sawa to come and check is waiting on us.
    if (car.check_status === 'requested') return 1
    if (car.status === 'pending_review') return 1
    if (car.subscription_status === 'lapsed' || car.subscription_status === 'none') return 2
    if (car.subscription_status === 'lapsing') return 3
    return 4
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cars
      .filter((car) => (filter === 'all' || car.status === filter
        || (filter === 'check_requested' && car.check_status === 'requested')) && (!q || [
        car.title, car.make, car.model, car.location, car.provider_name,
        car.provider_business_name, car.id,
      ].some((value) => String(value || '').toLowerCase().includes(q))))
      .sort((a, b) => {
        const rank = urgencyRank(a) - urgencyRank(b)
        if (rank) return rank
        // Within a tier, whichever runs out (or ran out) soonest comes first.
        const aEnds = a.subscription_ends_on ? new Date(a.subscription_ends_on).getTime() : Infinity
        const bEnds = b.subscription_ends_on ? new Date(b.subscription_ends_on).getTime() : Infinity
        return aEnds - bEnds
      })
  }, [cars, filter, query])

  // A selection narrowed out of view by a filter or search change should
  // shrink with it — the bulk bar naming a car the operator can no longer
  // even see would be its own kind of confusing.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev.size) return prev
      const visibleIds = new Set(visible.map((car) => car.id))
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [visible])

  // Only a car actually missing a live subscription belongs in a bulk renewal
  // — selecting one that is already paid would just spend money for nothing.
  const renewable = (car: any) => car.subscription_status !== 'active'
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function bulkRenew() {
    const targets = visible.filter((car) => selected.has(car.id))
    if (!targets.length) return
    const ok = await ask({
      title: `Renew ${targets.length} vehicle${targets.length === 1 ? '' : 's'} for 30 days?`,
      message: 'Records a 30-day listing subscription on each selected vehicle at its own entered (or default) amount. It does not change any vehicle’s status — a car still in maintenance stays off the public feed.',
      confirmLabel: `Renew ${targets.length}`,
    })
    if (!ok) return
    setBulkRenewing(true)
    let succeeded = 0
    const failures: string[] = []
    const today = new Date()
    const ends = new Date(today.getTime() + 30 * 86_400_000)
    for (const car of targets) {
      const amount = parseRwfInput(renewAmount[car.id] ?? defaultSubAmount)
      if (!amount) { failures.push(`${car.title}: no amount entered`); continue }
      try {
        await api.recordRentalSubscription(car.id, {
          amount_rwf: amount, method: 'cash',
          starts_on: today.toISOString().slice(0, 10), ends_on: ends.toISOString().slice(0, 10),
        })
        succeeded += 1
      } catch (e: any) {
        failures.push(`${car.title}: ${e.message}`)
      }
    }
    setBulkRenewing(false)
    setSelected(new Set())
    if (succeeded) toast(`Renewed ${succeeded} vehicle${succeeded === 1 ? '' : 's'} for 30 days.`, 'success')
    // Named, not counted — a bulk action that fails silently for one vehicle
    // in twelve is worse than one that fails loudly for all twelve.
    failures.forEach((line) => toast(line, 'error'))
    load()
  }

  function begin(car?: any) {
    setEditing(car || {})
    setPhotoFiles([])
    setProviders([])
    setProviderQuery(car ? (car.provider_business_name || car.provider_name || '') : '')
    setForm(car ? {
      provider_id: car.provider_id || '', title: car.title || '', make: car.make || '',
      model: car.model || '', year: car.year == null ? '' : String(car.year),
      daily_rate: String(car.daily_rate || ''), weekly_rate: car.weekly_rate == null ? '' : String(car.weekly_rate),
      deposit: car.deposit == null ? '' : String(car.deposit), min_days: String(car.min_days || 1),
      mileage: car.mileage == null ? '' : String(car.mileage), location: car.location || '',
      images: (car.images || []).join('\n'), status: car.status,
      inspection_id: car.inspection_id || '',
    } : EMPTY)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    // One message per gap: a single "provider, title and rate" message left the
    // operator guessing which of the three was wrong. The title is optional and
    // made from the car itself when left empty.
    const title = form.title.trim() || [form.year.trim(), form.make.trim(), form.model.trim()].filter(Boolean).join(' ')
    if (!form.provider_id) {
      toast('Pick the rental company: type its name in Provider, then tap it in the list.', 'error'); return
    }
    if (!title) { toast('Add the make and model (or a listing title).', 'error'); return }
    if (!number(form.daily_rate)) { toast('Enter the provider’s daily rate.', 'error'); return }
    const payload = {
      provider_id: form.provider_id, title, make: form.make.trim() || null,
      model: form.model.trim() || null, year: number(form.year), daily_rate: number(form.daily_rate),
      weekly_rate: number(form.weekly_rate), deposit: number(form.deposit) || 0,
      min_days: number(form.min_days) || 1, mileage: number(form.mileage),
      location: form.location.trim() || null,
      inspection_id: form.inspection_id || undefined,
      images: form.images.split('\n').map((item) => item.trim()).filter(Boolean), status: form.status,
    }
    // Activating needs a photo, and a new car's photos are only uploaded after
    // it is saved: save the details first, then activate once photos are in.
    const activatingWithPhotosPending = editing?.id && form.status === 'active'
      && payload.images.length === 0 && photoFiles.length > 0
    setSaving(true)
    try {
      const saved = editing?.id
        ? await api.updateRentalCar(editing.id, activatingWithPhotosPending ? { ...payload, status: editing.status === 'active' ? 'maintenance' : editing.status } : payload)
        : await api.createRentalCar(payload)
      const carId = editing?.id || saved?.id
      let photoNote = ''
      if (carId && photoFiles.length) {
        const { failed, error } = await uploadPhotos(carId, photoFiles)
        if (failed) photoNote = ` ${failed} of ${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'} did not upload${error ? `: ${error}` : ''}. Open the car and add them again.`
        else if (activatingWithPhotosPending) await api.updateRentalCar(carId, { status: 'active' })
      }
      setEditing(null); setForm(EMPTY); setPhotoFiles([]); await load()
      const done = editing?.id ? 'Rental listing updated.' : 'Rental listing created.'
      if (photoNote) toast(done + photoNote, 'error')
      else toast(done, 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  function addPhotos(list: FileList | null) {
    if (!list?.length) return
    const stored = form.images.split('\n').filter((item) => item.trim()).length
    const room = MAX_PHOTOS - stored - photoFiles.length
    const picked = Array.from(list).filter((file) => PHOTO_TYPES.split(',').includes(file.type))
    if (picked.length < list.length) toast('Only JPEG, PNG or WebP photos can be added.', 'error')
    if (picked.length > room) toast(`A rental listing holds at most ${MAX_PHOTOS} photos.`, 'error')
    setPhotoFiles((old) => [...old, ...picked.slice(0, Math.max(room, 0))])
  }

  function removeStoredPhoto(url: string) {
    setForm({ ...form, images: form.images.split('\n').filter((item) => item.trim() && item.trim() !== url).join('\n') })
  }

  // Recording a period is the whole interaction: it is what puts a car in the
  // public catalogue and what keeps it there. Deliberately inline on the card
  // rather than behind the edit form, because it is a different job — the form
  // describes the vehicle, this pays for the listing.
  // PATCH {status:'active'} re-checks for a live subscription server-side, so
  // this can only succeed exactly when the banner offering it is shown. No
  // second copy of the rule.
  async function publish(car: any) {
    setPublishing(car.id)
    try {
      await api.updateRentalCar(car.id, { status: 'active' })
      toast(`${car.title} is on the public rental feed.`, 'success')
      await load()
    } catch (e: any) { toast(e.message || 'Could not publish that vehicle.', 'error') }
    finally { setPublishing(null) }
  }

  // The provider-proposed review used to be two separate actions in two
  // different visual states: pay, wait for the page to say the car is now
  // publishable, then publish. One intention — approve this proposal — gets
  // one guided button, the same shape as Listings' approve-and-publish: two
  // server transitions, chained, with an honest fallback if the second one
  // fails after the first already landed.
  async function approveAndActivate(car: any) {
    // Checked here as well as on the server so a payment is not recorded for
    // a car that then cannot be activated.
    if (!CHECK[car.check_status]?.listable) {
      toast('Record a passing Rental Check before approving this vehicle.', 'error'); return
    }
    const amount = parseRwfInput(renewAmount[car.id] ?? defaultSubAmount)
    if (!amount) { toast('Enter the amount collected, in Rwandan francs, before activating.', 'error'); return }
    const ok = await ask({
      title: `Approve and activate ${car.title}?`,
      message: 'Records a 30-day listing subscription for the amount entered and puts the vehicle on the public rental feed immediately. Check the inspection and images below first.',
      confirmLabel: 'Approve & activate',
    })
    if (!ok) return
    const today = new Date()
    const ends = new Date(today.getTime() + 30 * 86_400_000)
    setRenewing(car.id)
    try {
      await api.recordRentalSubscription(car.id, {
        amount_rwf: amount, method: 'cash',
        starts_on: today.toISOString().slice(0, 10), ends_on: ends.toISOString().slice(0, 10),
      })
      await api.updateRentalCar(car.id, { status: 'active' })
      toast(`${car.title} is paid for 30 days and live on the public rental feed.`, 'success')
      setRenewAmount({ ...renewAmount, [car.id]: '' })
    } catch (e: any) {
      // A failure between the two can leave the payment recorded but the car
      // still pending_review — a legitimate resting state. The ordinary
      // "Publish to the fleet" banner below picks it up from there.
      toast(`${e.message} — if the payment went through, use “Publish to the fleet” below once it appears to finish.`, 'error')
    } finally {
      setRenewing(null)
      load()
    }
  }

  async function renew(car: any) {
    const amount = parseRwfInput(renewAmount[car.id] ?? defaultSubAmount)
    if (!amount) { toast('Enter the amount collected, in Rwandan francs.', 'error'); return }
    const today = new Date()
    const ends = new Date(today.getTime() + 30 * 86_400_000)
    setRenewing(car.id)
    try {
      await api.recordRentalSubscription(car.id, {
        amount_rwf: amount,
        method: 'cash',
        starts_on: today.toISOString().slice(0, 10),
        ends_on: ends.toISOString().slice(0, 10),
      })
      toast('Listing paid for 30 days. The car is public again immediately.', 'success')
      setRenewAmount({ ...renewAmount, [car.id]: '' })
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not record the subscription.', 'error')
    } finally { setRenewing(null) }
  }

  if (error) return <ErrorState error={error} onRetry={load} />

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">{['all', 'check_requested', 'pending_review', 'active', 'maintenance', 'retired'].map((status) => (
          <button key={status} onClick={() => setFilter(status)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === status ? 'bg-ink-900 text-white' : 'border border-gray-200 bg-surface text-gray-600'}`}>{STATUS_LABEL[status] || status}</button>
        ))}</div>
        <button onClick={() => begin()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-on">Add provider vehicle</button>
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search vehicle, provider, location or ID" />
      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{selected.size} vehicle{selected.size === 1 ? '' : 's'} selected for renewal</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg border border-gray-200 bg-surface px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-content-muted">Clear</button>
            <button type="button" onClick={bulkRenew} disabled={bulkRenewing} className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-800 disabled:opacity-50">
              {bulkRenewing ? 'Renewing…' : `Renew ${selected.size} for 30 days`}
            </button>
          </div>
        </div>
      ) : null}
      {loading ? <LoadingState /> : !visible.length ? <EmptyState icon="car" title="No rental vehicles" description="Add inventory for a verified rental-company account." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((car) => (
          <article key={car.id} className={`overflow-hidden rounded-xl border bg-surface shadow-sm ${selected.has(car.id) ? 'border-brand ring-1 ring-brand/30' : 'border-gray-100'}`}>
            {car.images?.[0] ? <img src={car.images[0]} alt="" className="h-40 w-full bg-gray-100 object-contain" /> : <div className="flex h-40 items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {renewable(car) ? (
                    <input type="checkbox" checked={selected.has(car.id)} onChange={() => toggleSelect(car.id)}
                      aria-label={`Select ${car.title} for bulk renewal`}
                      className="mt-1 h-4 w-4 accent-brand" />
                  ) : null}
                  <div><h2 className="font-bold text-gray-900">{car.title}</h2><p className="mt-1 text-xs text-gray-500">{car.provider_business_name || car.provider_name || 'Provider not assigned'}</p></div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${car.status === 'pending_review' ? 'bg-warning-tint text-warning-text' : 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[car.status] || car.status}</span>
              </div>
              <p className="mt-4 text-lg font-extrabold text-gray-900">{fmtMoney(car.daily_rate, car.currency || 'RWF')} <span className="text-xs font-medium text-gray-500">provider rate / day</span></p>
              <p className="mt-2 text-xs text-gray-500">Rates and availability are confirmed directly by the provider.</p>

              {/* The Rental Check: the evidence half of "is this car public". */}
              {car.check_status && CHECK[car.check_status] ? (
                <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${CHECK[car.check_status].tone}`}>
                  <p className="font-bold">{CHECK[car.check_status].label}</p>
                  {car.rental_check?.kind === 'rental_check' ? (
                    <p className="mt-0.5 font-medium">
                      {car.rental_check.passed_count}/{car.rental_check.total} on {fmtDate(car.rental_check.checked_on)}
                      {' · '}insurance to {fmtDate(car.rental_check.insurance_valid_until)}
                      {' · '}technical control to {fmtDate(car.rental_check.technical_control_valid_until)}
                    </p>
                  ) : null}
                  {car.rental_check?.failed?.length ? (
                    <ul className="mt-1 list-disc pl-4">
                      {car.rental_check.failed.map((f: any) => <li key={f.id}>{f.label}{f.note ? `: ${f.note}` : ''}</li>)}
                    </ul>
                  ) : null}
                  <button type="button" onClick={() => setChecking(car)}
                    className="mt-2 min-h-[36px] rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-800">
                    {car.check_status === 'none' || car.check_status === 'requested' || car.check_status === 'legacy' ? 'Record Rental Check' : 'Record a new check'}
                  </button>
                </div>
              ) : null}

              {/* Whether this car is actually in the catalogue. A lapsed car is
                  shown, never hidden — these are the ones needing a call. */}
              <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                car.subscription_status === 'lapsed' || car.subscription_status === 'none'
                  ? 'bg-danger-tint text-danger-strong'
                  : car.subscription_status === 'lapsing' ? 'bg-warning-tint text-warning-text'
                  : 'bg-success-tint text-success-text'
              }`}>
                <span className="font-bold">
                  {car.subscription_status === 'none' ? 'No listing subscription'
                    : car.subscription_status === 'lapsed' ? 'Listing lapsed — not public'
                    : car.subscription_status === 'lapsing' ? 'Lapses within 7 days'
                    : 'Listing paid'}
                </span>
                {car.subscription_ends_on ? (
                  <span className="ml-1 font-medium">· to {fmtDate(String(car.subscription_ends_on).slice(0, 10))}</span>
                ) : null}
              </div>

              {/* Paid for, and still not public. The card said "Listing paid"
                  in green while the car sat in maintenance, invisible — which
                  is the most reassuring possible way to show a problem. The
                  server derives `publishable` so there is one definition of
                  "one click from live". */}
              {car.status === 'pending_review' ? (
                <div className="mt-2 rounded-lg border border-line bg-info-tint px-3 py-2.5">
                  <p className="text-xs font-bold text-info">Provider-proposed — awaiting your review</p>
                  <p className="mt-0.5 text-caption text-info">
                    {car.provider_business_name || car.provider_name || 'The provider'} added this vehicle.
                    Record its Rental Check, check the images, then approve it.
                  </p>
                </div>
              ) : null}

              {car.publishable ? (
                <div className="mt-2 rounded-lg border border-warning-border bg-warning-tint px-3 py-2.5">
                  <p className="text-xs font-bold text-warning-text">Paid, but not on the public feed</p>
                  <p className="mt-0.5 text-caption text-warning-text">
                    The subscription is live, but this vehicle is set to <strong>{car.status}</strong>, so
                    renters cannot see it. Recording a payment never publishes a car on its own — a vehicle
                    in the workshop should stay parked.
                  </p>
                  <button type="button" onClick={() => publish(car)} disabled={publishing === car.id}
                    className="mt-2 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-800 disabled:opacity-50">
                    {publishing === car.id ? 'Publishing…' : 'Publish to the fleet'}
                  </button>
                </div>
              ) : null}

              {car.subscription_status !== 'active' ? (
                <div className="mt-2">
                  <div className="flex gap-2">
                    <input
                      inputMode="numeric" placeholder="Amount (RWF)"
                      value={renewAmount[car.id] ?? defaultSubAmount}
                      onChange={(e) => setRenewAmount({ ...renewAmount, [car.id]: formatRwfInput(e.target.value) })}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm tabular-nums focus:border-brand focus:outline-none"
                    />
                    {car.status === 'pending_review' ? (
                      <button onClick={() => approveAndActivate(car)} disabled={renewing === car.id}
                        className="whitespace-nowrap rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800 disabled:opacity-50">
                        {renewing === car.id ? 'Activating…' : 'Approve & activate'}
                      </button>
                    ) : (
                      <button onClick={() => renew(car)} disabled={renewing === car.id}
                        className="whitespace-nowrap rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        {renewing === car.id ? 'Saving…' : 'Pay 30 days'}
                      </button>
                    )}
                  </div>
                  {/* Kept for the case where approving is not today's decision —
                      mirrors Listings' "Approve only" escape hatch. */}
                  {car.status === 'pending_review' ? (
                    <button type="button" onClick={() => renew(car)} disabled={renewing === car.id}
                      className="mt-1.5 text-caption font-semibold text-content-muted underline underline-offset-2 hover:text-content disabled:opacity-50">
                      Just record the payment — decide about publishing later
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button onClick={() => begin(car)} className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-content-muted">Edit inventory</button>
            </div>
          </article>
        ))}</div>
      )}

      {checking ? (
        <RentalCheckForm car={checking} onClose={() => setChecking(null)} onSaved={() => { setChecking(null); load() }} />
      ) : null}

      {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null) }}>
        <form onSubmit={save} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-gray-900">{editing.id ? 'Edit rental vehicle' : 'Add rental vehicle'}</h2><p className="mt-1 text-xs text-gray-500">Every vehicle must belong to a verified rental company.</p></div><button type="button" onClick={() => setEditing(null)} className="text-gray-500">Close</button></div>
          <div className="mb-4"><label className={label}>Verified provider</label><input value={providerQuery} onChange={(e) => { setProviderQuery(e.target.value); setForm((old) => ({ ...old, provider_id: '', inspection_id: '' })) }} placeholder="Search showroom or contact" className={input} />
            {form.provider_id
              ? <p className="mt-1 text-xs font-semibold text-success-text">✓ Rental company selected</p>
              : providerQuery.trim().length >= 2
                ? <p className="mt-1 text-xs text-warning-text">Not selected yet: tap the company in the list below.</p>
                : null}
            {form.provider_id && <p className="mt-1 text-xs font-semibold text-success">Provider selected</p>}
            {providers.length > 0 && <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-surface">{providers.map((provider) => provider.blockers.length === 0 ? (
              <button key={provider.id} type="button" onClick={() => { setForm((old) => ({ ...old, provider_id: provider.id, inspection_id: '' })); setProviderQuery(provider.business_name || provider.name); setProviders([]) }} className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50">
                <span className="font-semibold">{provider.business_name || provider.name}</span><span className="ml-2 text-xs text-gray-500">{provider.email}</span>
              </button>
            ) : (
              <div key={provider.id} className="border-b border-gray-100 px-3 py-2 text-sm last:border-0">
                <span className="font-semibold text-gray-500">{provider.business_name || provider.name}</span>
                <span className="ml-2 text-xs text-gray-400">{provider.email}</span>
                <p className="mt-0.5 text-xs text-warning-text">
                  Cannot be a rental provider — {provider.blockers.join(', ')}.{' '}
                  <a href={`/users?q=${encodeURIComponent(provider.email)}`} className="font-bold underline">Fix in the user directory</a>
                </p>
              </div>
            ))}</div>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={label}>Passing 150-point inspection (optional)</label><select value={form.inspection_id} onChange={(e) => { const selected = inspections.find((inspection) => inspection.id === e.target.value); setForm({ ...form, inspection_id: e.target.value, make: selected ? String(selected.make || selected.submission_make || '') : form.make, model: selected ? String(selected.model || selected.submission_model || '') : form.model, year: selected ? String(selected.year || selected.submission_year || '') : form.year }) }} className={input} disabled={!form.provider_id}><option value="">None — record a Rental Check instead</option>{inspections.filter((inspection) => inspection.seller_id === form.provider_id && (!cars.some((car) => car.inspection_id === inspection.id) || inspection.id === editing?.inspection_id)).map((inspection) => <option key={inspection.id} value={inspection.id}>{inspection.year || inspection.submission_year} {inspection.make || inspection.submission_make} {inspection.model || inspection.submission_model} · {inspection.score}/150 · {fmtDate(inspection.completed_at)}</option>)}</select><p className="mt-1 text-xs text-gray-500">Rental cars are listed on the 10-point Rental Check, recorded from the fleet card after saving. An existing passing inspection of this car may stand in until the first check.</p></div>
            <div className="sm:col-span-2"><label className={label}>Listing title <span className="font-normal text-gray-400">(optional)</span></label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} placeholder={[form.year, form.make, form.model].filter(Boolean).join(' ') || 'Made from the year, make and model'} /></div>
            <div><label className={label}>Make</label><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} className={input} required /></div>
            <div><label className={label}>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={input} required /></div>
            <div><label className={label}>Year</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={input} required /></div>
            <div><label className={label}>Mileage (km)</label><input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} className={input} /></div>
            <div><label htmlFor="fleet-daily_rate" className={label}>Provider daily rate</label><MoneyInput id="fleet-daily_rate" value={String(form.daily_rate ?? '')} onChange={(digits) => setForm({ ...form, daily_rate: digits })} className={input} required /></div>
            <div><label htmlFor="fleet-weekly_rate" className={label}>Provider weekly rate</label><MoneyInput id="fleet-weekly_rate" value={String(form.weekly_rate ?? '')} onChange={(digits) => setForm({ ...form, weekly_rate: digits })} className={input} /></div>
            <div><label htmlFor="fleet-deposit" className={label}>Provider-stated deposit</label><MoneyInput id="fleet-deposit" value={String(form.deposit ?? '')} onChange={(digits) => setForm({ ...form, deposit: digits })} className={input} /></div>
            <div><label className={label}>Minimum days</label><input type="number" min="1" value={form.min_days} onChange={(e) => setForm({ ...form, min_days: e.target.value })} className={input} /></div>
            <div className="sm:col-span-2"><label className={label}>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} /></div>
            <div className="sm:col-span-2">
              <span className={label}>Photos</span>
              {/* Stored photos (already on the car) and picked ones (uploaded on save). */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.images.split('\n').map((item) => item.trim()).filter(Boolean).map((url) => (
                  <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeStoredPhoto(url)} aria-label="Remove photo"
                      className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-sm font-bold text-white hover:bg-black/80">×</button>
                  </div>
                ))}
                {photoPreviews.map((src, index) => (
                  <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Uploads on save</span>
                    <button type="button" onClick={() => setPhotoFiles((old) => old.filter((_, i) => i !== index))} aria-label="Remove photo"
                      className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-sm font-bold text-white hover:bg-black/80">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => photoInput.current?.click()}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-brand hover:text-brand">
                  <span className="text-2xl leading-none">+</span>Add photos
                </button>
              </div>
              <input ref={photoInput} type="file" accept={PHOTO_TYPES} multiple className="sr-only"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
              <p className="mt-1 text-xs text-gray-500">At least one photo before the car can go live; up to {MAX_PHOTOS}. JPEG, PNG or WebP.</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-gray-500">Paste image links instead</summary>
                <textarea rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className={`${input} mt-2`} placeholder="https://…, one per line" />
              </details>
            </div>
            {editing.id && <div className="sm:col-span-2"><label className={label}>Inventory status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}><option value="pending_review">Pending review</option><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select></div>}
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button><button disabled={saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-on disabled:opacity-50">{saving ? 'Saving…' : 'Save vehicle'}</button></div>
        </form>
      </div>}
    </div>
  )
}
