import { I18nScope } from '@/components/i18n/I18nScope'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { Container, Icon, type IconName } from '@/components/ui'
import { getDisplayCenters } from '@/lib/centers'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Shell for sign in / sign up / password reset.
//
// Two columns: the form on the left, capped at 440px because a login form wider
// than that reads as a data-entry screen rather than a door. The right column is
// the one dark brand moment in the account flow — it answers "why should I make
// an account here?" while the form answers "how". It is display-only, so it is
// dropped entirely below lg rather than stacked; on a phone it would push the
// form under the fold.
//
// Header and footer come from the root layout — auth is not a walled garden.
// ─────────────────────────────────────────────────────────────────────────────

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const centers = await getDisplayCenters()
  const t = await getServerT()

  /** Every claim here is a mechanic that actually exists in the product. */
  const TRUST_POINTS: { icon: IconName; title: string; desc: string }[] = [
    {
      icon: 'shield-check',
      title: t('auth.layout.trust.inspectionTitle'),
      desc: t('auth.layout.trust.inspectionDesc'),
    },
    {
      icon: 'eye-off',
      title: t('auth.layout.trust.publishTitle'),
      desc: t('auth.layout.trust.publishDesc'),
    },
    {
      icon: 'refresh',
      title: t('auth.layout.trust.consentTitle'),
      desc: t('auth.layout.trust.consentDesc'),
    },
    {
      icon: 'cash',
      title: t('auth.layout.trust.noCheckoutTitle'),
      desc: t('auth.layout.trust.noCheckoutDesc'),
    },
  ]
  return (
    <div className="bg-surface-page">
      {/* Phones are the majority in Rwanda, and below lg the ink aside
          disappears — this compact band keeps the brand on the page instead of
          leaving a bare form. It is the mobile page's one ink moment. */}
      <div className="flex items-center gap-3 bg-ink-900 px-5 py-5 lg:hidden">
        <LogoMark size={30} />
        <p className="text-caption font-semibold text-white/60">
          {t('auth.layout.mobileTagline')}
        </p>
      </div>

      {/* Columns stretch to the taller of the two, so the centers list can sit on
          the bottom edge of the panel while the form stays optically centred. */}
      <Container className="grid gap-12 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-[440px]"><I18nScope ns={['auth']}>{children}</I18nScope></div>
        </div>

        <aside className="hidden rounded-3xl bg-ink-900 p-10 text-white shadow-float lg:flex lg:flex-col xl:p-12">
          <LogoMark size={48} />

          <p className="mt-8 text-eyebrow font-bold uppercase text-brand-light">
            {t('auth.layout.eyebrow')}
          </p>
          <h2 className="mt-3 max-w-sm text-headline font-extrabold">
            {t('auth.layout.heading')}
          </h2>

          <ul className="mt-9 space-y-6">
            {TRUST_POINTS.map((point) => (
              <li key={point.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
                  <Icon name={point.icon} size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-body font-bold">{point.title}</span>
                  <span className="mt-1 block text-caption leading-relaxed text-white/70">
                    {point.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-9 text-caption text-white/70">
            <Link
              href="/promise"
              className="font-bold text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white"
            >
              {t('auth.layout.readSafety')}
            </Link>
          </p>

          <div className="mt-auto border-t border-white/10 pt-7">
            <p className="text-eyebrow font-bold uppercase text-white/50">
              {t('auth.layout.centersLabel')}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-caption text-white/70">
              {centers.map((center) => (
                <li key={center.id} className="flex items-center gap-1.5">
                  <Icon name="location" size={14} />
                  {center.name.replace(' Center', '')}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </Container>
    </div>
  )
}
