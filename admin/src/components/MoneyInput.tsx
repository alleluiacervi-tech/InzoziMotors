'use client'

import type { Currency } from './ui'

// ─────────────────────────────────────────────────────────────────────────────
// A money field that can be read back before it is saved.
//
// Prices used to be typed into a bare number input: "23000000" with nothing
// between the digits, so one zero too few published 2.3M instead of 23M RWF and
// nobody could see it at a glance. This field groups the digits as they are
// typed and repeats the amount in words underneath ("23 million RWF"), which is
// the line a tired operator actually reads.
//
// The value it hands back is digits only — the same integer string the pages
// already parse — so callers keep their own validation and payload code.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DIGITS = 13

function trimDecimals(n: number): string {
  return String(Number(n.toFixed(3)))
}

/** "23 million RWF", "850 thousand RWF", "$22 thousand". */
export function amountInWords(amount: number, currency: Currency = 'RWF'): string {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  const abs = Math.abs(amount)
  const words =
    abs >= 1e9 ? `${trimDecimals(amount / 1e9)} billion`
    : abs >= 1e6 ? `${trimDecimals(amount / 1e6)} million`
    : abs >= 1e3 ? `${trimDecimals(amount / 1e3)} thousand`
    : String(Math.round(amount))
  return currency === 'USD' ? `$${words}` : `${words} RWF`
}

export function MoneyInput({
  id, value, onChange, currency = 'RWF', required, placeholder, className = '', disabled, hint,
}: {
  id: string
  /** Digits only, as the caller stores it (e.g. "23000000"). */
  value: string
  onChange: (digits: string) => void
  currency?: Currency
  required?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
  /** A line under the amount, e.g. "Buyers who saved this car are alerted". */
  hint?: string
}) {
  const digits = String(value ?? '').replace(/\D/g, '')
  const amount = digits ? Number(digits) : 0
  const shown = digits ? amount.toLocaleString('en-US') : ''
  const words = amountInWords(amount, currency)

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={shown}
          placeholder={placeholder}
          aria-describedby={`${id}-amount`}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS)
            onChange(next)
          }}
          className={`tnum pr-14 ${className}`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label font-semibold text-content-muted">
          {currency === 'USD' ? 'USD' : 'RWF'}
        </span>
      </div>
      <p id={`${id}-amount`} aria-live="polite" className="mt-1 min-h-[1.1rem] text-caption text-content-secondary">
        {words || (hint ? '' : ' ')}
        {hint ? <span className="text-content-muted">{words ? ' · ' : ''}{hint}</span> : null}
      </p>
    </div>
  )
}
