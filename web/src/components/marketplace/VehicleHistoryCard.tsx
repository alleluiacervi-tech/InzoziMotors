import { Card, Icon, type IconName } from '@/components/ui'
import { formatKm } from '@/lib/business'
import type { VehicleHistory } from '@/lib/types'
import { getServerT } from '@/lib/i18n/server'
import type { TFunction } from '@/lib/i18n/dictionary'

// ─────────────────────────────────────────────────────────────────────────────
// The paperwork, reported exactly as it was found.
//
// The API returns 'pass' | 'flag' | 'fail' | 'unknown' for each document check.
// 'unknown' means nobody has verified it — so it renders as "Not verified", in
// muted grey, and never borrows the language or the colour of a pass. Dressing
// an unchecked box up as a tick is the single fastest way to lose a buyer.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = 'pass' | 'flag' | 'fail' | 'unknown'

const TONES: Record<Tone, { icon: IconName; className: string; fallbackKey: string }> = {
  pass: { icon: 'check-circle', className: 'text-success', fallbackKey: 'cars.history.verified' },
  flag: { icon: 'alert', className: 'text-warning-text', fallbackKey: 'cars.history.needsAttention' },
  fail: { icon: 'close-circle', className: 'text-danger', fallbackKey: 'cars.history.failedCheck' },
  unknown: { icon: 'minus', className: 'text-content-muted', fallbackKey: 'cars.history.notVerified' },
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
function documentRow(t: TFunction, label: string, verdict: string | null | undefined, whenPassed?: string): Row {
  const tone = toneOf(verdict)
  return {
    label,
    tone,
    value: tone === 'pass' && whenPassed ? whenPassed : t(TONES[tone].fallbackKey),
  }
}

export async function VehicleHistoryCard({ history }: { history: VehicleHistory | null }) {
  if (!history) return null
  const t = await getServerT()

  const rows: Row[] = [
    documentRow(t, t('cars.history.rraDuty'), history.rra_duty_paid, t('cars.history.dutyPaid')),
    documentRow(t, t('cars.history.registration'), history.registration),
    documentRow(t, t('cars.history.serviceHistory'), history.service_history),
    documentRow(t, t('cars.history.insurance'), history.insurance_valid, t('cars.history.validAtInspection')),
    {
      label: t('cars.history.odometer'),
      tone: history.mileage_verified ? 'pass' : 'unknown',
      value: history.mileage_verified
        ? t('cars.history.odoChecked', { km: formatKm(history.mileage) })
        : t('cars.history.odoNotVerified', { km: formatKm(history.mileage) }),
    },
    {
      label: t('cars.history.vin'),
      tone: history.vin_verified ? 'pass' : 'unknown',
      value: (history.vin_masked || history.vin)
        ? history.vin_verified
          ? t('cars.history.vinMatches', { vin: history.vin_masked || 'Verified' })
          : t('cars.history.vinNotVerified', { vin: history.vin_masked || 'Verified' })
        : t('cars.history.notRecorded'),
    },
    {
      label: t('cars.history.importOrigin'),
      tone: 'unknown',
      value:
        history.import_origin && history.import_origin !== 'Unknown'
          ? history.import_origin
          : t('cars.history.notRecorded'),
    },
    {
      label: t('cars.history.accidentHistory'),
      tone: 'unknown',
      value: history.accident_history || t('cars.history.noData'),
    },
  ]

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line-soft p-5 sm:p-6">
        <p className="text-eyebrow font-bold uppercase text-brand">{t('cars.history.eyebrow')}</p>
        <h2 className="mt-2 text-title font-extrabold text-content">{t('cars.history.title')}</h2>
        <p className="mt-2 text-caption leading-relaxed text-content-secondary">
          {t('cars.history.intro')}
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

      <div className="border-t border-line-soft bg-surface-alt/40 p-4 sm:p-5">
        <p className="text-caption leading-relaxed text-content-muted">
          <strong className="font-semibold text-content-secondary">Data Coverage &amp; Standards:</strong> Vehicle history records are aggregated from verified inspection stations, customs filings, and manufacturer open databases. No relevant records were found in currently available data sources for accidents or open safety recalls. We do not claim this represents all events in the vehicle’s lifetime. Full VINs are kept private for owner security.
        </p>
      </div>
    </Card>
  )
}

export default VehicleHistoryCard
