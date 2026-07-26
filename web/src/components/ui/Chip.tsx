import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { Icon } from './Icon'

// The one selectable pill. Facet chips, filter chips, radio chips, removable
// active-filter chips — same anatomy everywhere, so "selected" always looks
// like the same product decided it. Selected state is the sanctioned red
// active-state use; nothing else on a chip may be red.

const BASE =
  'inline-flex h-10 items-center gap-1.5 rounded-pill border px-4 text-caption font-semibold ' +
  'transition-colors duration-200 ease-brand select-none'

const UNSELECTED = 'border-line bg-surface text-content-secondary hover:border-content-muted'
const SELECTED = 'border-brand bg-brand text-white'

function chipClass(selected: boolean, className: string) {
  return `${BASE} ${selected ? SELECTED : UNSELECTED} ${className}`
}

type CommonProps = {
  selected?: boolean
  className?: string
  children: ReactNode
}

/** Chip as a link — facet entries, budget brackets, body-type shortcuts. */
export function ChipLink({
  selected = false, className = '', children, href, ...rest
}: CommonProps & Omit<ComponentProps<typeof Link>, 'className'>) {
  return (
    <Link
      href={href}
      className={chipClass(selected, className)}
      aria-current={selected ? 'true' : undefined}
      {...rest}
    >
      {children}
    </Link>
  )
}

/** Chip as a button — client-side toggles and removable active filters. */
export function ChipButton({
  selected = false, removable = false, className = '', children, ...rest
}: CommonProps & { removable?: boolean } & Omit<ComponentProps<'button'>, 'className'>) {
  return (
    <button
      type="button"
      className={chipClass(selected, className)}
      aria-pressed={removable ? undefined : selected}
      {...rest}
    >
      {children}
      {removable ? <Icon name="close" size={14} /> : null}
    </button>
  )
}

/**
 * Chip as a label wrapping a visually-hidden native input — the accessible
 * radio/checkbox pattern the calculators already use. The input drives state;
 * the pill is presentation.
 */
export function ChipOption({
  selected = false, className = '', children, input,
}: CommonProps & { input: ReactNode }) {
  return (
    <label className={`${chipClass(selected, className)} cursor-pointer`}>
      {input}
      {children}
    </label>
  )
}
