'use client'

import { formatMoney, formatMoneyExact, formatUsdApprox, usdFromRwf } from '@/lib/business'
import { useCurrency } from './CurrencyProvider'

// ─────────────────────────────────────────────────────────────────────────────
// The ONE place a price becomes two currencies.
//
// Every listing on the site renders through this. That is the whole point: a
// conversion copied into a card, a detail page and a dashboard row is three
// chances to round differently, to forget the "≈", or to keep using a rate
// that has since moved. Here there is one rounding rule, one approximation
// mark, and one subscriber to the live rate.
//
// The franc figure is the PRICE — what the seller asked for, what the database
// stores. The dollar figure is a courtesy, and it is marked as approximate
// every single time, because Sawa is not a party to any sale and nobody should
// read the second line as an amount a seller has agreed to accept.
// ─────────────────────────────────────────────────────────────────────────────

export function Price({
  amountRwf, size = 'card', className = '',
}: {
  amountRwf?: number | null
  /** `card` for a grid tile, `detail` for the one big price on a listing. */
  size?: 'card' | 'detail'
  className?: string
}) {
  const fx = useCurrency()
  const usd = usdFromRwf(amountRwf, fx?.rate)

  const priceClass = size === 'detail'
    ? 'text-price-lg font-extrabold leading-none tracking-[-0.03em] text-brand tabular-nums'
    : 'text-price font-extrabold tracking-[-0.02em] text-brand tabular-nums'

  return (
    <span className={`block ${className}`}>
      <span className={priceClass} title={formatMoneyExact(amountRwf)}>
        {formatMoney(amountRwf)}
      </span>
      {usd == null ? null : (
        <span
          className={`mt-1 block tabular-nums text-content-muted ${size === 'detail' ? 'text-caption' : 'text-micro'}`}
          // The accessible name says the quiet part out loud: this is an
          // approximation at today's rate, not a second price.
          aria-label={`approximately ${formatUsdApprox(usd)} at today's exchange rate`}
        >
          ≈ {formatUsdApprox(usd)}
          {fx?.stale ? <span className="ml-1 text-warning-text">· rate may be out of date</span> : null}
        </span>
      )}
    </span>
  )
}

/**
 * Where the dollar figures come from, in one line.
 *
 * A converted number without its provenance is exactly how the old hardcoded
 * 1300 drifted twelve percent away from reality with nobody noticing. If the
 * site is going to print dollars, it has to be able to say which rate, from
 * where, and when.
 */
export function RateNote({ className = '' }: { className?: string }) {
  const fx = useCurrency()
  if (!fx) return null

  const when = fx.fetched_at ? new Date(fx.fetched_at) : null
  const stamp = when
    ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'unknown'

  return (
    <p className={`text-micro text-content-muted ${className}`}>
      Dollar figures are approximate, converted at{' '}
      <span className="font-semibold tabular-nums text-content-secondary">
        1 USD = {Math.round(fx.rate).toLocaleString('en-RW')} RWF
      </span>{' '}
      {fx.stale
        ? <span className="font-semibold text-warning-text">(last confirmed {stamp}; the rate service is unreachable)</span>
        : <>(updated {stamp})</>}
      . Prices are set and agreed in Rwandan francs.
    </p>
  )
}

export default Price
