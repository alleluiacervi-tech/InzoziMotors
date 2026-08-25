import { Icon } from '@/components/ui'
import type { SellerProgress } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// What is happening to my car right now, and is it my move?
//
// The five-stage Pipeline above this shows coarse POSITION and is derived from
// submission.status so that the website and the app draw the same strip. This
// shows current STATE — computed on the server from the same rules that gate
// publication, which is the only place a missed appointment or a re-inspection
// failure can be known. The two are complementary, not duplicates: one says how
// far, this says what now.
//
// Sellers see a projection, never the operational detail — see sellerProgress()
// in the backend for why that is an allowlist of sentences and not a filter.
// ─────────────────────────────────────────────────────────────────────────────

export function NextStep({ progress }: { progress: SellerProgress | undefined }) {
  if (!progress || !progress.message) return null

  const yours = progress.waiting_on === 'you'
  const stalled = progress.blocked

  const tone = stalled
    ? 'border-warning/40 bg-warning-tint'
    : yours
      ? 'border-brand/25 bg-brand-tint'
      : 'border-line bg-surface-alt'

  return (
    <div className={`mt-4 flex gap-3 rounded-xl border px-4 py-3 ${tone}`}>
      <Icon
        name={stalled ? 'alert' : yours ? 'user' : 'clock'}
        size={16}
        className={`mt-0.5 shrink-0 ${stalled ? 'text-warning-text' : yours ? 'text-brand' : 'text-content-muted'}`}
      />
      <div className="min-w-0">
        <p className="text-caption font-extrabold text-content">
          {stalled ? 'Needs attention' : yours ? 'Over to you' : 'With the Sawa team'}
        </p>
        <p className="mt-0.5 text-caption leading-relaxed text-content-secondary">{progress.message}</p>
      </div>
    </div>
  )
}

export default NextStep
