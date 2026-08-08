import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

// Mirrors src/components/Button.js: the same four variants, the same brand glow
// on primary, the same disabled treatment. Renders an <a> when `href` is given
// and a <button> otherwise — never a div, so keyboard and screen-reader
// behaviour is correct without extra ARIA.

type Variant = 'primary' | 'secondary' | 'outline' | 'dark' | 'ghost' | 'inverse' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'compact'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-brand hover:bg-brand-bright hover:shadow-brand-lg active:scale-[0.99]',
  secondary:
    'bg-surface-alt text-content hover:bg-line-soft active:scale-[0.99]',
  outline:
    'bg-surface text-content border border-line hover:border-content-muted hover:bg-surface-alt active:scale-[0.99]',
  dark:
    'bg-ink-900 text-white hover:bg-ink-800 active:scale-[0.99]',
  ghost:
    'bg-transparent text-content-secondary hover:bg-surface-alt hover:text-content',
  // Secondary action on ink bands — replaces three per-page white-border hacks
  inverse:
    'border border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10 active:scale-[0.99]',
  // Destructive-but-not-primary: outline form so "Delete" never shouts louder
  // than the page's real CTA. Replaces two divergent hand-rolled versions.
  danger:
    'bg-surface text-danger border border-danger/40 hover:border-danger hover:bg-danger-tint active:scale-[0.99]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-caption gap-1.5 rounded-lg',
  // The de-facto size for dashboard rows and toolbars — existed as 21
  // hand-rolled `h-11` copies before it was given a name here.
  compact: 'h-11 px-4 text-caption gap-1.5 rounded-xl',
  md: 'h-12 px-6 text-body gap-2 rounded-xl',
  lg: 'h-14 px-8 text-base gap-2.5 rounded-xl',
}

const BASE =
  'inline-flex items-center justify-center font-bold tracking-[-0.01em] whitespace-nowrap ' +
  'transition-all duration-200 ease-brand select-none ' +
  'disabled:opacity-50 disabled:pointer-events-none'

type CommonProps = {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  className?: string
  children: ReactNode
}

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<'button'>, keyof CommonProps> & { href?: undefined }

type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonProps | 'href'> & { href: string }

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = 'primary',
    size = 'md',
    fullWidth,
    leadingIcon,
    trailingIcon,
    className = '',
    children,
    ...rest
  } = props

  const classes = [
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {leadingIcon}
      {children}
      {trailingIcon}
    </>
  )

  if ('href' in props && props.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink
    // Absolute URLs and store links leave the SPA — plain <a> avoids a needless
    // client-side navigation attempt.
    const isExternal = /^https?:\/\//.test(href) || href.startsWith('mailto:')
    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          {...(href.startsWith('http') ? { rel: 'noopener noreferrer' } : {})}
          {...(linkRest as ComponentProps<'a'>)}
        >
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={classes} {...(linkRest as object)}>
        {content}
      </Link>
    )
  }

  return (
    <button className={classes} {...(rest as ComponentProps<'button'>)}>
      {content}
    </button>
  )
}

export default Button
