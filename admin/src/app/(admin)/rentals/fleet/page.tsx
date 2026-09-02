'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { EmptyState, ErrorState, LoadingState, fmtMoney, formatRwfInput, parseRwfInput } from '@/components/ui'
import { QueueSearch } from '@/components/QueueSearch'
import { useToast } from '@/components/feedback'

const EMPTY = {
  provider_id: '', title: '', make: '', model: '', year: '', daily_rate: '',
  weekly_rate: '', deposit: '', min_days: '1', mileage: '', location: '',
  images: '', status: 'active', inspection_id: '',
}

const input = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none'
const label = 'mb-1 block text-xs font-semibold text-gray-700'
const number = (value: string) => value === '' ? undefined : Number.parseInt(value, 10)

// 'pending_review' reads as an underscored fragment under a plain `capitalize`
// class — this is the one status a provider can put a car into themselves
// (POST /rentals/propose), and it is the one that most needs an operator's
// attention, so it gets its own label and its own colour rather than sharing
// the neutral grey the admin-created statuses use.
const STATUS_LABEL: Record<string, string> = {
  all: 'all', active: 'Active', maintenance: 'Maintenance', retired: 'Retired',
  pending_review: 'Pending review',
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
  const toast = useToast()

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cars.filter((car) => (filter === 'all' || car.status === filter) && (!q || [
      car.title, car.make, car.model, car.location, car.provider_name,
      car.provider_business_name, car.id,
    ].some((value) => String(value || '').toLowerCase().includes(q))))
  }, [cars, filter, query])

  function begin(car?: any) {
    setEditing(car || {})
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
    if (!form.provider_id || !form.inspection_id || !form.title.trim() || !number(form.daily_rate)) {
      toast('Choose a verified rental provider, a passing inspection, a title and a daily rate.', 'error'); return
    }
    const payload = {
      provider_id: form.provider_id, title: form.title.trim(), make: form.make.trim() || null,
      model: form.model.trim() || null, year: number(form.year), daily_rate: number(form.daily_rate),
      weekly_rate: number(form.weekly_rate), deposit: number(form.deposit) || 0,
      min_days: number(form.min_days) || 1, mileage: number(form.mileage),
      location: form.location.trim() || null,
      inspection_id: form.inspection_id,
      images: form.images.split('\n').map((item) => item.trim()).filter(Boolean), status: form.status,
    }
    setSaving(true)
    try {
      if (editing?.id) await api.updateRentalCar(editing.id, payload)
      else await api.createRentalCar(payload)
      setEditing(null); setForm(EMPTY); await load()
      toast(editing?.id ? 'Rental listing updated.' : 'Rental listing created.', 'success')
    } catch (e: any) { toast(e.message, 'error') }
    finally { setSaving(false) }
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
        <div className="flex flex-wrap gap-1">{['all', 'pending_review', 'active', 'maintenance', 'retired'].map((status) => (
          <button key={status} onClick={() => setFilter(status)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === status ? 'bg-brand text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>{STATUS_LABEL[status] || status}</button>
        ))}</div>
        <button onClick={() => begin()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Add provider vehicle</button>
      </div>
      <QueueSearch value={query} onChange={setQuery} resultCount={visible.length} placeholder="Search vehicle, provider, location or ID" />
      {loading ? <LoadingState /> : !visible.length ? <EmptyState icon="car" title="No rental vehicles" description="Add inventory for a verified rental-company account." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((car) => (
          <article key={car.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {car.images?.[0] ? <img src={car.images[0]} alt="" className="h-40 w-full bg-gray-100 object-contain" /> : <div className="flex h-40 items-center justify-center bg-gray-100 text-sm text-gray-400">No image</div>}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-gray-900">{car.title}</h2><p className="mt-1 text-xs text-gray-500">{car.provider_business_name || car.provider_name || 'Provider not assigned'}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${car.status === 'pending_review' ? 'bg-warning-tint text-warning-text' : 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[car.status] || car.status}</span></div>
              <p className="mt-4 text-lg font-extrabold text-gray-900">{fmtMoney(car.daily_rate, car.currency || 'RWF')} <span className="text-xs font-medium text-gray-500">provider rate / day</span></p>
              <p className="mt-2 text-xs text-gray-500">Rates and availability are confirmed directly by the provider.</p>

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
                  <span className="ml-1 font-medium">· to {String(car.subscription_ends_on).slice(0, 10)}</span>
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
                  <p className="mt-0.5 text-[11px] text-info">
                    {car.provider_business_name || car.provider_name || 'The provider'} proposed this vehicle from
                    their own passing inspection. Check the inspection and images, record a listing subscription
                    below, then set the inventory status to Active to publish it.
                  </p>
                </div>
              ) : null}

              {car.publishable ? (
                <div className="mt-2 rounded-lg border border-warning-border bg-warning-tint px-3 py-2.5">
                  <p className="text-xs font-bold text-warning-text">Paid, but not on the public feed</p>
                  <p className="mt-0.5 text-[11px] text-warning-text">
                    The subscription is live, but this vehicle is set to <strong>{car.status}</strong>, so
                    renters cannot see it. Recording a payment never publishes a car on its own — a vehicle
                    in the workshop should stay parked.
                  </p>
                  <button type="button" onClick={() => publish(car)} disabled={publishing === car.id}
                    className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50">
                    {publishing === car.id ? 'Publishing…' : 'Publish to the fleet'}
                  </button>
                </div>
              ) : null}

              {car.subscription_status !== 'active' ? (
                <div className="mt-2 flex gap-2">
                  <input
                    inputMode="numeric" placeholder="Amount (RWF)"
                    value={renewAmount[car.id] ?? defaultSubAmount}
                    onChange={(e) => setRenewAmount({ ...renewAmount, [car.id]: formatRwfInput(e.target.value) })}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm tabular-nums focus:border-brand focus:outline-none"
                  />
                  <button onClick={() => renew(car)} disabled={renewing === car.id}
                    className="whitespace-nowrap rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {renewing === car.id ? 'Saving…' : 'Pay 30 days'}
                  </button>
                </div>
              ) : null}

              <button onClick={() => begin(car)} className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-brand">Edit inventory</button>
            </div>
          </article>
        ))}</div>
      )}

      {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null) }}>
        <form onSubmit={save} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-gray-900">{editing.id ? 'Edit rental vehicle' : 'Add rental vehicle'}</h2><p className="mt-1 text-xs text-gray-500">Every vehicle must belong to a verified rental company.</p></div><button type="button" onClick={() => setEditing(null)} className="text-gray-500">Close</button></div>
          <div className="mb-4"><label className={label}>Verified provider</label><input value={providerQuery} onChange={(e) => { setProviderQuery(e.target.value); setForm((old) => ({ ...old, provider_id: '', inspection_id: '' })) }} placeholder="Search showroom or contact" className={input} />
            {form.provider_id && <p className="mt-1 text-xs font-semibold text-success">Provider selected</p>}
            {providers.length > 0 && <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white">{providers.map((provider) => provider.blockers.length === 0 ? (
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
            <div className="sm:col-span-2"><label className={label}>Passing 150-point inspection</label><select value={form.inspection_id} onChange={(e) => { const selected = inspections.find((inspection) => inspection.id === e.target.value); setForm({ ...form, inspection_id: e.target.value, make: selected ? String(selected.make || selected.submission_make || '') : form.make, model: selected ? String(selected.model || selected.submission_model || '') : form.model, year: selected ? String(selected.year || selected.submission_year || '') : form.year }) }} className={input} required disabled={!form.provider_id}><option value="">Select inspection evidence</option>{inspections.filter((inspection) => inspection.seller_id === form.provider_id && (!cars.some((car) => car.inspection_id === inspection.id) || inspection.id === editing?.inspection_id)).map((inspection) => <option key={inspection.id} value={inspection.id}>{inspection.year || inspection.submission_year} {inspection.make || inspection.submission_make} {inspection.model || inspection.submission_model} · {inspection.score}/150 · {new Date(inspection.completed_at).toLocaleDateString()}</option>)}</select><p className="mt-1 text-xs text-gray-500">Only a complete, passing inspection belonging to the selected provider can activate this vehicle.</p></div>
            <div className="sm:col-span-2"><label className={label}>Listing title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} required /></div>
            <div><label className={label}>Make</label><input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} className={input} required /></div>
            <div><label className={label}>Model</label><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={input} required /></div>
            <div><label className={label}>Year</label><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={input} required /></div>
            <div><label className={label}>Mileage (km)</label><input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} className={input} /></div>
            <div><label className={label}>Provider daily rate (RWF)</label><input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} className={input} required /></div>
            <div><label className={label}>Provider weekly rate (RWF)</label><input type="number" value={form.weekly_rate} onChange={(e) => setForm({ ...form, weekly_rate: e.target.value })} className={input} /></div>
            <div><label className={label}>Provider-stated deposit</label><input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} className={input} /></div>
            <div><label className={label}>Minimum days</label><input type="number" min="1" value={form.min_days} onChange={(e) => setForm({ ...form, min_days: e.target.value })} className={input} /></div>
            <div className="sm:col-span-2"><label className={label}>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={input} /></div>
            <div className="sm:col-span-2"><label className={label}>Image URLs, one per line</label><textarea rows={4} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className={input} required /><p className="mt-1 text-xs text-gray-500">At least one HTTPS image is required while the vehicle is active; up to 40 are supported.</p></div>
            {editing.id && <div className="sm:col-span-2"><label className={label}>Inventory status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input}><option value="pending_review">Pending review</option><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select></div>}
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">Cancel</button><button disabled={saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save vehicle'}</button></div>
        </form>
      </div>}
    </div>
  )
}
