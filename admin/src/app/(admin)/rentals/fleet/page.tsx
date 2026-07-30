'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  active:      'bg-green-100 text-green-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired:     'bg-gray-100 text-gray-600',
}

interface RentalCar {
  id: string
  title: string
  make: string | null
  model: string | null
  year: number | null
  category: string | null
  seats: number | null
  fuel: string | null
  transmission: string | null
  mileage: number | null
  daily_rate: number
  weekly_rate: number | null
  deposit: number
  min_days: number
  inspected: boolean
  inspection_score: number | null
  rating: string | null
  trips: number
  location: string | null
  images: string[] | null
  safari_ready: boolean
  status: 'active' | 'maintenance' | 'retired'
}

const BLANK_FORM = {
  title: '', make: '', model: '', year: '', category: 'SUV', seats: '5',
  fuel: 'Petrol', transmission: 'Automatic', mileage: '', daily_rate: '',
  weekly_rate: '', deposit: '', min_days: '1', inspection_score: '',
  location: '', images: '', status: 'active',
}
type FleetForm = typeof BLANK_FORM

// Every money/count column on rental_cars is INT — never send a float or a string.
function int(v: string): number | undefined {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : undefined
}

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand'
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1'

// ─── Off-fleet registry ───────────────────────────────────────────────────────
// GET /rentals is active-only and there is no admin list route, so the moment a
// car goes to maintenance/retired the only handle left on it is its id. Booking
// history recovers the ones that have been rented; this registry remembers the
// rest, so parking a brand-new car in the workshop is not a one-way door.
const REGISTRY_KEY = 'inzozi_rental_off_fleet_ids'

function readRegistry(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && !!v) : []
  } catch {
    return []
  }
}

function writeRegistry(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(Array.from(new Set(ids))))
  } catch {
    // Quota / private-mode failures must not take the page down with them.
  }
}

export default function RentalFleetPage() {
  const [filter, setFilter]     = useState<'all' | 'active' | 'maintenance' | 'retired'>('all')
  const [cars, setCars]         = useState<RentalCar[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [creating, setCreating] = useState(false)
  const [editing, setEditing]   = useState<RentalCar | null>(null)
  const [form, setForm]         = useState<FleetForm>(BLANK_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]     = useState(false)

  const [restoreId, setRestoreId] = useState('')
  const [restoring, setRestoring] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const active: RentalCar[] = await api.rentalCars()
      // GET /rentals only returns active cars — pull maintenance/retired ones back
      // by id, through booking history and through the registry, so a car parked
      // in the workshop stays editable whether or not it was ever rented.
      const bookings = await api.getRentalBookings()
      const registered = readRegistry()
      const listed = new Set<string>(active.map((c) => c.id))
      const missing = Array.from(new Set<string>([
        ...bookings.map((b: any) => b.rental_car_id as string),
        ...registered,
      ])).filter((id) => id && !listed.has(id))

      const rest = await Promise.all(missing.map((id) => api.getRentalCar(id).catch(() => null)))
      const all = [...active, ...(rest.filter(Boolean) as RentalCar[])]
      setCars(all)

      // Re-sync: register everything currently off the fleet, forget cars that are
      // active again. Ids that failed to resolve are kept — a network blip must not
      // throw away the only pointer we have to a record.
      const activeIds = new Set(all.filter((c) => c.status === 'active').map((c) => c.id))
      writeRegistry([
        ...registered.filter((id) => !activeIds.has(id)),
        ...all.filter((c) => c.status !== 'active').map((c) => c.id),
      ])
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Escape hatch: the registry is per-browser, so an admin on another machine
  // needs a way to pull an off-fleet car back into view from its id alone.
  async function restoreById() {
    const id = restoreId.trim()
    if (!id) return
    setRestoring(true)
    try {
      const car: RentalCar = await api.getRentalCar(id)
      if (car.status !== 'active') writeRegistry([...readRegistry(), car.id])
      setRestoreId('')
      setError('')
      await load()
    } catch (e: any) {
      setError(`Could not restore ${id} — ${e.message}`)
    } finally {
      setRestoring(false)
    }
  }

  useEffect(() => { load() }, [])

  function set(k: keyof FleetForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function startCreate() {
    setEditing(null)
    setCreating(true)
    setForm(BLANK_FORM)
    setFormError('')
  }

  function startEdit(car: RentalCar) {
    setCreating(false)
    setEditing(car)
    setForm({
      ...BLANK_FORM,
      title:       car.title || '',
      mileage:     car.mileage != null ? String(car.mileage) : '',
      daily_rate:  String(car.daily_rate ?? ''),
      weekly_rate: car.weekly_rate != null ? String(car.weekly_rate) : '',
      deposit:     String(car.deposit ?? ''),
      min_days:    String(car.min_days ?? '1'),
      location:    car.location || '',
      images:      (car.images || []).join('\n'),
      status:      car.status,
    })
    setFormError('')
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
    setFormError('')
  }

  const imageList = () => form.images.split('\n').map((s) => s.trim()).filter(Boolean)

  async function save() {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    const daily = int(form.daily_rate)
    if (!daily || daily <= 0) { setFormError('Daily rate must be a whole number of USD above 0.'); return }

    // Taking a car off the fleet pulls it out of every public list — say so before
    // doing it, since the way back runs through this page only.
    if (editing && editing.status === 'active' && form.status !== 'active') {
      const ok = window.confirm(
        `Set "${editing.title}" to ${form.status}? Renters can no longer see or book it. ` +
        `It stays in this table so you can put it back on the fleet.`
      )
      if (!ok) return
    }

    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        // Only the fields PATCH /rentals/:id actually writes.
        const updated = await api.updateRentalCar(editing.id, {
          title:       form.title.trim(),
          daily_rate:  daily,
          weekly_rate: int(form.weekly_rate),
          deposit:     int(form.deposit) ?? 0,
          min_days:    int(form.min_days) ?? 1,
          mileage:     int(form.mileage),
          location:    form.location.trim() || null,
          images:      imageList(),
          status:      form.status,
        })
        // Register before the reload below: the car has just dropped out of
        // GET /rentals, and with no bookings its id is the only way back.
        if ((updated?.status ?? form.status) !== 'active') {
          writeRegistry([...readRegistry(), editing.id])
        }
      } else {
        await api.createRentalCar({
          title:            form.title.trim(),
          make:             form.make.trim() || null,
          model:            form.model.trim() || null,
          year:             int(form.year),
          category:         form.category,
          seats:            int(form.seats) ?? 5,
          fuel:             form.fuel,
          transmission:     form.transmission,
          mileage:          int(form.mileage),
          daily_rate:       daily,
          weekly_rate:      int(form.weekly_rate),
          deposit:          int(form.deposit) ?? 0,
          min_days:         int(form.min_days) ?? 1,
          inspection_score: int(form.inspection_score),
          location:         form.location.trim() || null,
          images:           imageList(),
        })
      }
      closeForm()
      load()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const rows = cars.filter((c) => filter === 'all' || c.status === filter)

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3">
        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1">
          {(['all', 'active', 'maintenance', 'retired'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                filter === s ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
              }`}
            >
              {s} ({s === 'all' ? cars.length : cars.filter((c) => c.status === s).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Off-fleet cars are remembered per browser — this pulls one back anywhere. */}
          <input
            type="text"
            value={restoreId}
            onChange={(e) => setRestoreId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') restoreById() }}
            placeholder="Restore by car ID"
            className="w-44 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            onClick={restoreById}
            disabled={restoring || !restoreId.trim()}
            className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-brand disabled:opacity-50 whitespace-nowrap"
          >
            {restoring ? 'Finding…' : 'Restore'}
          </button>
          <button
            onClick={startCreate}
            className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light transition-colors whitespace-nowrap"
          >
            New rental car
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          Error: {error}
        </div>
      )}

      {/* Create / edit panel */}
      {(creating || editing) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-1">
            {editing ? `Edit — ${editing.title}` : 'New rental car'}
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            All money fields are whole US dollars.
            {editing
              ? ' Specs (make, model, year, seats, fuel) are fixed after onboarding — the API does not accept them here.'
              : ' Safari-ready is a fleet flag set in the database; the API does not expose it.'}
          </p>
          {editing && (
            <p className="text-[11px] font-mono text-gray-400 select-all mb-5">ID {editing.id}</p>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Toyota Land Cruiser Prado 2019"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g. Nyarutarama"
                  className={inputCls}
                />
              </div>
            </div>

            {creating && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Make</label>
                    <input type="text" value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="e.g. Toyota" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Model</label>
                    <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. Prado" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Year</label>
                    <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="e.g. 2019" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}>Category</label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                      <option value="SUV">SUV</option>
                      <option value="Sedan">Sedan</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="Pickup">Pickup</option>
                      <option value="Van">Van</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Seats</label>
                    <input type="number" value={form.seats} onChange={(e) => set('seats', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Fuel</label>
                    <select value={form.fuel} onChange={(e) => set('fuel', e.target.value)} className={inputCls}>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Transmission</label>
                    <select value={form.transmission} onChange={(e) => set('transmission', e.target.value)} className={inputCls}>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Daily rate (USD) *</label>
                <input type="number" step={1} value={form.daily_rate} onChange={(e) => set('daily_rate', e.target.value)} placeholder="e.g. 85" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Weekly rate (USD)</label>
                <input type="number" step={1} value={form.weekly_rate} onChange={(e) => set('weekly_rate', e.target.value)} placeholder="blank = 6× daily" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deposit (USD)</label>
                <input type="number" step={1} value={form.deposit} onChange={(e) => set('deposit', e.target.value)} placeholder="e.g. 300" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Minimum days</label>
                <input type="number" step={1} value={form.min_days} onChange={(e) => set('min_days', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Mileage (km)</label>
                <input type="number" step={1} value={form.mileage} onChange={(e) => set('mileage', e.target.value)} placeholder="e.g. 62000" className={inputCls} />
              </div>
              {creating && (
                <div>
                  <label className={labelCls}>Inspection score (%)</label>
                  <input type="number" min="0" max="100" value={form.inspection_score} onChange={(e) => set('inspection_score', e.target.value)} className={inputCls} />
                </div>
              )}
              {editing && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                    <option value="active">Active — bookable</option>
                    <option value="maintenance">Maintenance — hidden from renters</option>
                    <option value="retired">Retired — out of fleet</option>
                  </select>
                  {form.status !== 'active' && (
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      Hidden from renters. It stays in this table so you can set it back —
                      keep the ID above to reach it from another browser.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Image URLs (one per line)</label>
              <textarea
                rows={3}
                value={form.images}
                onChange={(e) => set('images', e.target.value)}
                placeholder="https://…/prado-front.jpg"
                className={inputCls}
              />
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to fleet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 text-center">
          No {filter === 'all' ? '' : `${filter} `}rental cars in the fleet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Car</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Daily (USD)</th>
                <th className="px-4 py-3 font-medium text-right">Weekly (USD)</th>
                <th className="px-4 py-3 font-medium text-right">Deposit (USD)</th>
                <th className="px-4 py-3 font-medium text-right">Min days</th>
                <th className="px-4 py-3 font-medium">Safari</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-gray-900 font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {[c.category, c.seats ? `${c.seats} seats` : null, c.transmission, c.fuel]
                        .filter(Boolean).join(' · ')}
                      {c.trips > 0 ? ` · ${c.trips} trip${c.trips === 1 ? '' : 's'}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.location || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {Number(c.daily_rate).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {c.weekly_rate != null ? Number(c.weekly_rate).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {Number(c.deposit).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.min_days}</td>
                  <td className="px-4 py-3">
                    {c.safari_ready
                      ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-tint text-brand">Safari</span>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(c)}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
