import type { ElementType, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

// The primitive kit every page is assembled from. Keeping these few and strict
// is what makes twenty pages look like one product rather than twenty.

// ─── Layout ──────────────────────────────────────────────────────────────────

export function Container({
  children, className = '', as: Tag = 'div',
}: { children: ReactNode; className?: string; as?: ElementType }) {
  return (
    <Tag className={`mx-auto w-full max-w-content px-5 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </Tag>
  )
}

export function Section({
  children, className = '', tone = 'page', id,
}: {
  children: ReactNode
  className?: string
  /** `page` is the default warm off-white; `surface` lifts a band to pure white;
   *  `ink` is the dark band used sparingly for emphasis moments; `ink-soft` is
   *  one step lighter so a closing band still reads against the ink-900 footer. */
  tone?: 'page' | 'surface' | 'alt' | 'ink' | 'ink-soft'
  id?: string
}) {
  const tones = {
    page: 'bg-surface-page text-content',
    surface: 'bg-surface text-content',
    alt: 'bg-surface-alt text-content',
    ink: 'bg-ink-900 text-white',
    'ink-soft': 'bg-ink-800 text-white',
  }
  return (
    <section id={id} className={`py-16 sm:py-24 ${tones[tone]} ${className}`}>
      {children}
    </section>
  )
}

/**
 * The one sanctioned eyebrow. Hand-rolling this pattern is what let six pages
 * drift apart — every eyebrow on the site renders through here, and `mb-3` is
 * the only sanctioned margin.
 */
export function Eyebrow({
  children, tone = 'brand', className = '',
}: {
  children: ReactNode
  tone?: 'brand' | 'invert' | 'muted'
  className?: string
}) {
  const tones = {
    brand: 'text-brand',
    invert: 'text-white/50',
    muted: 'text-content-muted',
  }
  return (
    <p className={`mb-3 text-eyebrow font-bold uppercase ${tones[tone]} ${className}`}>
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow, title, description, align = 'left', className = '',
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-headline font-extrabold text-content">{title}</h2>
      {description ? (
        <p className="mt-4 text-title-sm leading-relaxed text-content-secondary">{description}</p>
      ) : null}
    </div>
  )
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

export function Card({
  children, className = '', interactive = false, ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-line-soft bg-surface shadow-card ${
        interactive
          ? 'transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-card-lg hover:border-line'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────────────

type BadgeTone =
  | 'cert' | 'certPlus' | 'inspected' | 'success' | 'warning' | 'danger'
  | 'info' | 'neutral' | 'brand' | 'reserved' | 'preview' | 'safari'

const BADGE_TONES: Record<BadgeTone, string> = {
  // Certified+ is the only tier that earns brand red — matches the app's
  // "red discipline" rule, where the top tier is the brand moment.
  certPlus: 'bg-brand text-white',
  cert: 'bg-success-tint text-success ring-1 ring-inset ring-success/20',
  inspected: 'bg-surface-alt text-content-secondary ring-1 ring-inset ring-line',
  success: 'bg-success-tint text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning-tint text-warning-text ring-1 ring-inset ring-warning/20',
  danger: 'bg-danger-tint text-danger ring-1 ring-inset ring-danger/20',
  info: 'bg-info-tint text-info ring-1 ring-inset ring-info/20',
  reserved: 'bg-status-reservedBg text-status-reserved ring-1 ring-inset ring-status-reserved/20',
  neutral: 'bg-surface-alt text-content-muted ring-1 ring-inset ring-line',
  brand: 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/20',
  preview: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  safari: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
}

export function Badge({
  children, tone = 'neutral', icon, className = '',
}: {
  children: ReactNode
  tone?: BadgeTone
  icon?: IconName
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-micro font-bold leading-none ${BADGE_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  )
}

/** Status pill driven by the API's status strings, so web and app agree. */
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const map: Record<string, BadgeTone> = {
    live: 'success', available: 'success', complete: 'success',
    approved: 'success', resolved: 'success', confirmed: 'info',
    under_review: 'warning', pending: 'warning', open: 'warning',
    scheduled: 'info', inspecting: 'info', inspected: 'info',
    reserved: 'reserved',
    sold: 'neutral', archived: 'neutral', cancelled: 'neutral',
    rejected: 'danger',
  }
  return <Badge tone={map[status] ?? 'neutral'}>{label ?? status.replace(/_/g, ' ')}</Badge>
}

// ─── Forms ───────────────────────────────────────────────────────────────────

const FIELD_BASE =
  'w-full rounded-xl border bg-surface px-4 text-body text-content placeholder:text-content-muted ' +
  'transition-colors duration-200 disabled:opacity-60'

export function Field({
  label, htmlFor, hint, error, required, children, className = '',
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined
  const errorId = error ? `${htmlFor}-error` : undefined
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-caption font-bold uppercase tracking-wide text-content-muted"
      >
        {label}
        {required ? <span className="ml-1 text-brand">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="mt-2 text-micro leading-relaxed text-content-muted">{hint}</p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-micro font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Input({
  error, className = '', ...rest
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`${FIELD_BASE} h-12 ${
        error ? 'border-danger' : 'border-line focus:border-brand'
      } ${className}`}
      aria-invalid={error || undefined}
      {...rest}
    />
  )
}

export function Textarea({
  error, className = '', ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={`${FIELD_BASE} min-h-[120px] py-3 leading-relaxed ${
        error ? 'border-danger' : 'border-line focus:border-brand'
      } ${className}`}
      aria-invalid={error || undefined}
      {...rest}
    />
  )
}

export function Select({
  error, className = '', children, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={`${FIELD_BASE} h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10 ${
        error ? 'border-danger' : 'border-line focus:border-brand'
      } ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A6E6E' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M5 9l7 7 7-7'/%3E%3C/svg%3E\")",
      }}
      aria-invalid={error || undefined}
      {...rest}
    >
      {children}
    </select>
  )
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export function Alert({
  tone = 'info', title, children, className = '',
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  children?: ReactNode
  className?: string
}) {
  const tones = {
    info: { box: 'bg-info-tint border-info/20 text-info', icon: 'info' as IconName },
    success: { box: 'bg-success-tint border-success/20 text-success', icon: 'check-circle' as IconName },
    warning: { box: 'bg-warning-tint border-warning/25 text-warning-text', icon: 'alert' as IconName },
    danger: { box: 'bg-danger-tint border-danger/20 text-danger', icon: 'alert' as IconName },
  }
  const t = tones[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-xl border px-4 py-3.5 ${t.box} ${className}`}
    >
      <Icon name={t.icon} size={18} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-caption leading-relaxed">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={title ? 'mt-1 opacity-90' : ''}>{children}</div> : null}
      </div>
    </div>
  )
}

export function EmptyState({
  icon = 'search', title, description, action, className = '',
}: {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-16 text-center ${className}`}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt text-content-muted">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="text-title-sm font-extrabold text-content">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-caption leading-relaxed text-content-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />
}

/** Announces async results to screen readers without stealing focus. */
export function LiveRegion({ children }: { children: ReactNode }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {children}
    </div>
  )
}

export { Icon }
export type { IconName }
export { Button } from './Button'
