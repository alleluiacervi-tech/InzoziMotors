'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const CATEGORIES = [
  {
    name: 'Engine & Drivetrain',
    items: ['Engine oil level & condition', 'Coolant level', 'Timing belt condition', 'Air filter', 'Engine mounts', 'Transmission fluid'],
  },
  {
    name: 'Brakes & Steering',
    items: ['Front brake pads', 'Rear brake pads', 'Brake fluid', 'Brake lines', 'Power steering fluid', 'Wheel alignment'],
  },
  {
    name: 'Body & Exterior',
    items: ['Panel gaps & alignment', 'Paint condition', 'Windscreen integrity', 'Front lights', 'Rear lights', 'Rust / corrosion'],
  },
  {
    name: 'Interior & Comfort',
    items: ['Seat condition', 'Dashboard instruments', 'Air conditioning', 'Windows & locks', 'Odometer reading', 'Boot / trunk'],
  },
  {
    name: 'Electronics & Safety',
    items: ['Battery health', 'OBD scan (no fault codes)', 'Airbag system', 'Traction control', 'Seatbelts', 'Horn'],
  },
  {
    name: 'Tyres & Wheels',
    items: ['Front-left tread', 'Front-right tread', 'Rear-left tread', 'Rear-right tread', 'Spare tyre', 'Wheel condition'],
  },
  {
    name: 'Documentation',
    items: ['Registration / logbook', 'Service history', 'Import documents', 'Insurance valid', 'RRA duty paid stamp', 'VIN match'],
  },
]

type Result = 'pass' | 'flag' | 'fail' | null

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router   = useRouter()

  const [insp, setInsp]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getInspection(id)
      .then((data) => {
        setInsp(data)
        // Pre-fill existing results if re-opening
        if (data.checklist_results) {
          setResults(data.checklist_results)
        }
        if (data.notes) setNotes(data.notes)
      })
      .catch((e) => alert(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function setResult(item: string, val: Result) {
    setResults((prev) => ({ ...prev, [item]: val }))
  }

  function countResults() {
    const vals = Object.values(results)
    return {
      pass: vals.filter((v) => v === 'pass').length,
      flag: vals.filter((v) => v === 'flag').length,
      fail: vals.filter((v) => v === 'fail').length,
      total: CATEGORIES.flatMap((c) => c.items).length,
    }
  }

  async function submit() {
    const allItems = CATEGORIES.flatMap((c) => c.items)
    const missing  = allItems.filter((item) => !results[item])
    if (missing.length > 0) {
      alert(`Please rate all items. ${missing.length} item(s) remaining.`)
      return
    }
    setSaving(true)
    try {
      await api.completeInspection(id, { checklist_results: results, notes })
      alert('Inspection complete! Car is now live.')
      router.push('/inspections')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading inspection…</div>
  if (!insp)   return <div className="text-red-600 text-sm">Inspection not found.</div>

  const counts = countResults()
  const score  = Math.round((counts.pass / counts.total) * 100)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h1 className="text-lg font-bold text-gray-900 mb-1">150-Point Inspection</h1>
        <p className="text-sm text-gray-500">{insp.year} {insp.make} {insp.model} · {insp.center}</p>
        <p className="text-xs text-gray-400 mt-0.5">{insp.scheduled_date} at {insp.scheduled_time} · Seller: {insp.seller_name}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{counts.pass + counts.flag + counts.fail} / {counts.total} rated</span>
            <span className={`font-semibold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              Score: {score}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${((counts.pass + counts.flag + counts.fail) / counts.total) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <span className="text-green-600">✓ {counts.pass} Pass</span>
            <span className="text-amber-600">⚠ {counts.flag} Flag</span>
            <span className="text-red-600">✗ {counts.fail} Fail</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">{cat.name}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {cat.items.map((item) => {
                const val = results[item]
                return (
                  <div key={item} className="px-5 py-3 flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700 flex-1">{item}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      {(['pass', 'flag', 'fail'] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setResult(item, opt)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                            val === opt
                              ? opt === 'pass' ? 'bg-green-500 text-white'
                              : opt === 'flag' ? 'bg-amber-500 text-white'
                              : 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {opt === 'pass' ? '✓' : opt === 'flag' ? '⚠' : '✗'}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Notes + Submit */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Mechanic notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="Any additional observations for the buyer-facing report…"
        />
        <button
          onClick={submit}
          disabled={saving}
          className="mt-4 w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Submitting…' : 'Complete Inspection & Publish Listing'}
        </button>
      </div>
    </div>
  )
}
