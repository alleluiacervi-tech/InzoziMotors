import { Icon } from '@/components/ui'
import { RETURN_WINDOW_DAYS } from '@/lib/business'

// The refund conditions, word for word from REFUND_ROWS in
// src/screens/BuyingGuideScreen.js. A buyer who reads one set of terms in the
// app and a softer set on the website has been misled by us, not by the seller —
// so this table is a copy, not a rewrite.
//
// The glyph differs between free and chargeable rows as well as the colour, so
// the distinction survives without colour vision.

const REFUND_ROWS = [
  { when: 'Before handover', terms: 'Cancel any time — free, no questions asked', free: true },
  {
    when: `Days 1–${RETURN_WINDOW_DAYS} after handover`,
    terms: 'Full refund if the car does not match its inspection report',
    free: true,
  },
  {
    when: 'Reconditioning fee',
    terms: 'Deducted on change-of-mind returns (cleaning + re-inspection)',
    free: false,
  },
  { when: 'Over 300 km driven', terms: 'Per-km usage charge applies to the refund', free: false },
  {
    when: `After ${RETURN_WINDOW_DAYS} days`,
    terms: 'Sale is final — warranty claims go through Support',
    free: false,
  },
]

export function RefundTable({ className = '' }: { className?: string }) {
  return (
    <ul
      className={`divide-y divide-line-soft overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card ${className}`}
    >
      {REFUND_ROWS.map((row) => (
        <li key={row.when} className="flex gap-4 px-5 py-5 sm:px-7">
          <Icon
            name={row.free ? 'check-circle' : 'info'}
            size={18}
            className={`mt-0.5 shrink-0 ${row.free ? 'text-success' : 'text-warning'}`}
          />
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold text-content">{row.when}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-content-secondary">{row.terms}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default RefundTable
