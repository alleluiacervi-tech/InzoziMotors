import { Card, Icon, type IconName } from '@/components/ui'
import { formatKm } from '@/lib/business'
import type { VehicleHistory } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// The paperwork, reported exactly as it was found.
//
// The API returns 'pass' | 'flag' | 'fail' | 'unknown' for each document check.
// 'unknown' means nobody has verified it — so it renders as "Not verified", in
// muted grey, and never borrows the language or the colour of a pass. Dressing
// an unchecked box up as a tick is the single fastest way to lose a buyer.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = 'pass' | 'flag' | 'fail' | 'unknown'

const TONES: Record<Tone, { icon: IconName; className: string; fallback: string }> = {
  pass: { icon: 'check-circle', className: 'text-success', fallback: 'Verified' },
  flag: { icon: 'alert', className: 'text-warning-text', fallback: 'Needs attention' },
  fail: { icon: 'close-circle', className: 'text-danger', fallback: 'Failed check' },
  unknown: { icon: 'minus', className: 'text-content-muted', fallback: 'Not verified' },
}

function toneOf(verdict: string | null | undefined): Tone {
  if (verdict === 'pass' || verdict === 'flag' || verdict === 'fail') return verdict
  return 'unknown'
}

interface Row {
  label: string
  tone: Tone
  value: string
}

/** A document check. `whenPassed` lets a row say something more useful than
 *  "Verified" once it has actually passed. */
function documentRow(label: string, verdict: string | null | undefined, whenPassed?: string): Row {
  const tone = toneOf(verdict)
  return {
    label,
    tone,
    value: tone === 'pass' && whenPassed ? whenPassed : TONES[tone].fallback,
  }
}

export function VehicleHistoryCard({ history }: { history: VehicleHistory | null }) {
  if (!history) return null

  const rows: Row[] = [
    documentRow('RRA import duty', history.rra_duty_paid, 'Duty paid, stamp seen'),
    documentRow('Registration / logbook', history.registration),
    documentRow('Service history', history.service_history),
    documentRow('Insurance', history.insurance_valid, 'Valid at inspection'),
    {
      label: 'Odometer',
      tone: history.mileage_verified ? 'pass' : 'unknown',
      value: history.mileage_verified
        ? `${formatKm(history.mileage)} — checked against records`
        : `${formatKm(history.mileage)} — not verified`,
    },
    {
      label: 'VIN / chassis',
      tone: history.vin_verified ? 'pass' : 'unknown',
      value: history.vin
        ? `${history.vin}${history.vin_verified ? ' — matches documents' : ' — not verified'}`
        : 'Not recorded',
    },
    {
      label: 'Import origin',
      tone: 'unknown',
      value:
        history.import_origin && history.import_origin !== 'Unknown'
          ? history.import_origin
          : 'Not recorded',
    },
    {
      label: 'Accident history',
      tone: 'unknown',
      value: history.accident_history || 'No data',
    },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft p-5 sm:p-6">
        <p className="text-eyebrow font-bold uppercase text-brand">Vehicle history</p>
        <h2 className="mt-2 text-title font-extrabold text-content">The paperwork</h2>
        <p className="mt-2 text-sm leading-relaxed text-content-secondary">
          Checked at the center against the documents the seller brought.
          Anything we could not confirm is marked not verified.
        </p>
      </div>

      <dl className="divide-y divide-line-soft">
        {rows.map((row) => {
          const tone = TONES[row.tone]
          return (
            <div
              key={row.label}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3.5 sm:px-6"
            >
              <dt className="text-caption font-bold uppercase tracking-wide text-content-muted">
                {row.label}
              </dt>
              <dd className={`flex min-w-0 items-center gap-2 text-caption font-semibold ${tone.className}`}>
                <Icon name={tone.icon} size={15} />
                <span className="break-words">{row.value}</span>
              </dd>
            </div>
          )
        })}
      </dl>
    </Card>
  )
}

export default VehicleHistoryCard
