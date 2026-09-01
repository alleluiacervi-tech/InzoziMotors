import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// Small server-rendered pieces shared by the three account pages. Kept here
// rather than in components/ui because nothing outside this route group needs
// them, and a primitive kit stays useful only while it stays small.

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-stat font-extrabold leading-[1.12] tracking-[-0.03em] text-content sm:text-price-lg">
        {title}
      </h1>
      {children ? (
        <p className="mt-3 text-body leading-relaxed text-content-secondary">{children}</p>
      ) : null}
    </div>
  )
}

/** Bottom-of-form switch between sign in and sign up. */
export function AuthSwitch({
  prompt, href, label,
}: {
  prompt: string
  href: string
  label: string
}) {
  return (
    <p className="mt-7 text-center text-caption text-content-secondary">
      {prompt}{' '}
      <Link href={href} className="font-bold text-brand transition-colors hover:text-brand-deep">
        {label}
      </Link>
    </p>
  )
}

/**
 * One account spans web and mobile — worth saying on both forms, because people
 * who downloaded the app first assume the website is a separate product.
 */
export async function OneAccountNote({ className = '' }: { className?: string }) {
  const t = await getServerT()
  return (
    <p className={`flex gap-2.5 text-caption leading-relaxed text-content-muted ${className}`}>
      <Icon name="phone" size={15} className="mt-px" />
      <span>
        {t('auth.oneAccount.text')}{' '}
        <Link href="/download" className="font-bold text-brand transition-colors hover:text-brand-deep">
          {t('auth.oneAccount.appLink')}
        </Link>
        .
      </span>
    </p>
  )
}
