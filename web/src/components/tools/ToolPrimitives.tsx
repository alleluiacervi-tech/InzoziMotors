'use client'

import type { ReactNode } from 'react'
import { Field, Input } from '@/components/ui'

// ─────────────────────────────────────────────────────────────────────────────
// The parts the three public calculators share — valuation, import duty and
// finance. They live beside the tools rather than in components/ui because
// nothing else on the site needs them, and the primitive kit is deliberately
// small.
//
// Every input here is numeric-first: Rwandan traffic is overwhelmingly mobile,
// and a text keyboard on a price field is the difference between a completed
// estimate and an abandoned one.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Inputs ──────────────────────────────────────────────────────────────────

export function NumberField({
  id,
  name,
  label,
  hint,
  error,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  required,
  autoFocus,
}: {
  id: string
  /** Defaults to `id`; set when the form field name has to differ. */
  name?: string
  label: string
  hint?: string
  error?: string | null
  value: string
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
}) {
  // type="text" + inputMode="numeric" rather than type="number": it keeps the
  // numeric keypad on phones without the spinner, the scroll-wheel hazard, or
  // Safari's habit of silently blanking an invalid value.
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-content-muted"
          >
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          name={name ?? id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          error={Boolean(error)}
          aria-describedby={hint && !error ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          className={`tabular-nums ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-14' : ''}`}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-content-muted"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  )
}

export type ChipOption<T extends string> = {
  value: T
  label: string
  hint?: string
}

/**
 * Native radios behind styled labels. Keyboard users get arrow-key roving and
 * correct group semantics for free, which a div-with-role never quite matches.
 * Selected state is one of the few places brand red is allowed.
 */
export function ChipGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 'auto',
}: {
  name: string
  legend: string
  options: readonly ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  columns?: 'auto' | 2
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-[13px] font-bold uppercase tracking-wide text-content-muted">
        {legend}
      </legend>
      <div className={columns === 2 ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className="flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-line
                         bg-surface px-3 py-2 text-center text-[13px] font-bold leading-tight text-content-secondary
                         transition-all duration-200 ease-brand sm:px-4 sm:text-sm
                         peer-hover:border-content-muted
                         peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-checked:shadow-brand
                         peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2"
            >
              {option.label}
              {option.hint ? (
                <span className="mt-0.5 text-[11px] font-semibold opacity-70">{option.hint}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// ─── Results ─────────────────────────────────────────────────────────────────

export function ResultPanel({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-line-soft bg-surface p-5 shadow-card sm:p-6 ${className}`}
    >
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-content-muted">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  )
}

/** The one number the visitor came for. Red, because it is a price. */
export function Headline({
  label,
  value,
  sub,
  note,
}: {
  label: string
  value: string
  sub?: string
  note?: string
}) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-content-secondary">{label}</p>
      <p className="mt-1.5 break-words text-[clamp(1.5rem,6vw,2.25rem)] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-brand">
        {value}
      </p>
      {sub ? <p className="mt-2 text-sm font-bold text-content-secondary tabular-nums">{sub}</p> : null}
      {note ? <p className="mt-2 text-xs leading-relaxed text-content-muted">{note}</p> : null}
    </div>
  )
}

export function ResultRow({
  label,
  value,
  sub,
  hint,
  emphasis = false,
}: {
  label: string
  value: string
  sub?: string
  hint?: string
  /** Totals: heavier type and no hairline, so the eye stops there. */
  emphasis?: boolean
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3 ${emphasis ? '' : 'hairline'}`}>
      <div className="min-w-0">
        <p
          className={
            emphasis
              ? 'text-[15px] font-extrabold text-content'
              : 'text-sm font-semibold text-content-secondary'
          }
        >
          {label}
        </p>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-content-muted">{hint}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`tabular-nums ${
            emphasis ? 'text-lg font-extrabold text-content' : 'text-sm font-bold text-content'
          }`}
        >
          {value}
        </p>
        {sub ? <p className="mt-0.5 text-xs tabular-nums text-content-muted">{sub}</p> : null}
      </div>
    </div>
  )
}

/**
 * Button labels that carry a figure can outrun a 320px column, and Button is
 * whitespace-nowrap by design. This lets those specific labels wrap without
 * loosening the primitive for everyone.
 */
export const WRAPPING_LABEL = '!whitespace-normal text-center leading-tight'

/** Shown before there is anything to calculate, so the panel is never blank. */
export function ResultPlaceholder({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm leading-relaxed text-content-muted">
      {children}
    </p>
  )
}
