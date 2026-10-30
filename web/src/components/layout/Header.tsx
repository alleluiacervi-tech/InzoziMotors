'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Button, Icon } from '@/components/ui'
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher'
import { GoogleHeaderButton } from '@/components/auth/GoogleHeaderButton'
import { useT } from '@/lib/i18n/context'
import { CONTACT, NAV_LINKS } from '@/lib/site'
import type { User } from '@/lib/types'

/**
 * Sticky site header. ONE personality: the page surface, gaining a hairline
 * and a whisper of shadow the moment the page scrolls.
 *
 * It used to have two. An OVERLAY mode rendered the whole bar transparent with
 * white type, for the homepage only, floating on the dark hero photograph that
 * pulled itself up underneath with a negative margin. That hero is now printed
 * on the site's own paper (see home/Hero.tsx), so white-on-transparent had
 * nothing dark left to sit on — and the mode it required was costing every
 * control in this file a second set of colours, a second Button variant, and a
 * second reading of the active state. Nine ternaries went with it.
 *
 * The signed-in user is resolved on the SERVER (layout.tsx reads the httpOnly
 * cookie) and handed down as a prop. That keeps the JWT out of the browser
 * entirely while still letting this be a client component for the menu state.
 */
// Keep navigation labels stable during scanning and keyboard navigation.
function RollLabel({ text }: { text: string }) {
  return <span>{text}</span>
}

// Nav labels come from NAV_LINKS (hrefs) but are translated by key.
const NAV_KEY: Record<string, string> = {
  '/cars': 'nav.buy', '/rentals': 'nav.rent', '/sell': 'nav.sell',
  '/imports': 'nav.imports', '/how-it-works': 'nav.howItWorks', '/showrooms': 'nav.showrooms',
}

export function Header({
  user,
  showRent = false,
  showShowrooms = false,
  google = false,
}: {
  user: User | null
  showRent?: boolean
  showShowrooms?: boolean
  /** Signed out, with Google sign-in configured: draw "Continue with Google". */
  google?: boolean
}) {
  const t = useT()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Route changes must close the drawer, or a back-navigation leaves it open
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Prevent the page behind the drawer from scrolling
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Escape closes the drawer — keyboard users had no way out of it short of
  // tabbing to the X button.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const navLinks = NAV_LINKS.filter((link) => (showRent || link.href !== '/rentals') && (showShowrooms || link.href !== '/showrooms'))

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  // The desktop nav link, set to sit beside the Didone wordmark: small tracked
  // capitals, a letter-by-letter roll on hover (RollLabel) and a hairline that
  // draws out from the centre. The active page keeps the line, in brand red.
  // From xl only: in French, Kinyarwanda and Swahili the capitals need the room.
  const navLink = (active: boolean) =>
    `group relative flex h-11 items-center whitespace-nowrap px-2.5 text-[0.71875rem] font-medium uppercase tracking-[0.12em] 2xl:px-3 2xl:tracking-[0.16em] ` +
    `transition-colors duration-200 ` +
    `after:absolute after:inset-x-2.5 after:bottom-2.5 2xl:after:inset-x-3 after:h-px after:origin-center ` +
    `after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.22,1,0.36,1)] after:content-[''] ` +
    (active
      ? 'text-content after:scale-x-100 after:bg-brand'
      : 'text-content-secondary after:scale-x-0 after:bg-content hover:text-content hover:after:scale-x-100 focus-visible:after:scale-x-100')

  // Quiet header furniture: WhatsApp and the hamburger.
  const quiet = 'text-content-secondary hover:bg-surface-alt hover:text-content'

  return (
    <header
      className={`sticky top-0 z-50 h-[var(--header-h)] border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? 'border-line-soft bg-surface/85 shadow-[0_8px_24px_-20px_rgba(20,20,20,0.35)] backdrop-blur-xl'
          : 'border-transparent bg-surface-page'
      }`}
    >
      <div className="mx-auto flex h-full max-w-content items-center gap-4 px-5 sm:px-8 lg:px-12">
        {/* flex + h-11: the mark is 37px tall, so the link around it was a
            37px target sitting in a 68px bar with room to spare. */}
        <Link href="/" aria-label="Sawa Cars — home" className="flex h-11 shrink-0 items-center">
          <Logo size={17} tone="dark" />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden xl:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={navLink(isActive(link.href))}
                >
                  <RollLabel text={t(NAV_KEY[link.href] ?? '') || link.label} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* WhatsApp as header furniture — Rwanda's channel, the way Autochek
              puts a phone number in the header. Gated: renders only once the
              real business number is verified, never the placeholder. */}
          {CONTACT.whatsappVerified ? (
            <a
              href={`https://wa.me/${CONTACT.whatsapp}`}
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${CONTACT.whatsappDisplay}`}
              className={`hidden h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-caption font-semibold transition-colors xl:flex ${quiet}`}
            >
              <Icon name="whatsapp" size={17} />
              {/* The number from 2xl: between xl and 2xl the French nav needs its room. */}
              <span className="hidden 2xl:inline">{CONTACT.whatsappDisplay}</span>
            </a>
          ) : null}

          {user?.role === 'admin' ? (
            <Button
              href="/admin-portal"
              prefetch={false}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              {t('common.admin')}
            </Button>
          ) : null}

          {user ? (
            <Button
              href="/dashboard"
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Icon name="user" size={16} />
              <span className="max-w-[10ch] truncate">{user.name.split(' ')[0]}</span>
            </Button>
          ) : (
            <>
              <Button
                href="/signin"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                {t('common.signIn')}
              </Button>
              {/* The dependable Google way in, wherever One Tap stays hidden:
                  the G alone below lg, the full label where the bar has room. */}
              {google ? (
                <>
                  <GoogleHeaderButton variant="icon" className="lg:hidden" />
                  <GoogleHeaderButton variant="full" className="hidden lg:inline-flex" />
                </>
              ) : null}
            </>
          )}

          {/* ONE primary action. Buying is the nav's first word, so the
              button is the other side of the market: getting a car listed.
              The app link lives in the menu and footer. */}
          {/* Visible at every width: on a phone, the device most visitors
              use, this used to live only inside the menu. Below 400px the
              label shortens so the bar never wraps. */}
          <Button href="/sell" size="sm" className="px-3.5 min-[400px]:px-4">
            <span className="min-[400px]:hidden">{t('nav.sell')}</span>
            <span className="hidden min-[400px]:inline">{t('common.sellYourCar')}</span>
          </Button>

          <div className="hidden sm:block">
            <LanguageSwitcher tone="light" />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-surface-alt xl:hidden"
          >
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer — items cascade in with a 40ms stagger; one animation,
          six offsets, and the sheet feels composed rather than dumped. */}
      {open ? (
        <div className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
          />
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="relative max-h-full overflow-y-auto rounded-b-3xl border-b border-line bg-surface px-5 pb-8 pt-4 shadow-float"
          >
            <ul className="divide-y divide-line-soft">
              {navLinks.map((link, i) => (
                <li
                  key={link.href}
                  className="animate-fade-up [animation-fill-mode:backwards]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`flex min-h-[56px] items-center gap-3 px-1 text-caption font-medium uppercase tracking-[0.16em] transition-colors ${
                      isActive(link.href) ? 'text-content' : 'text-content-secondary hover:text-content'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive(link.href) ? 'bg-brand' : 'bg-transparent'}`}
                    />
                    <span className="flex-1">{t(NAV_KEY[link.href] ?? '') || link.label}</span>
                    <Icon name="chevron-right" size={14} className="text-content-muted" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact, one tap away — the drawer doubles as the "reach a
                human" surface on the phone, where it matters most. */}
            {CONTACT.whatsappVerified ? (
              <div
                className="mt-5 grid grid-cols-2 gap-2 animate-fade-up [animation-fill-mode:backwards]"
                style={{ animationDelay: `${navLinks.length * 40}ms` }}
              >
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-caption font-bold text-content transition-colors hover:bg-surface-alt"
                >
                  <Icon name="whatsapp" size={17} className="text-success" />
                  WhatsApp
                </a>
                <a
                  href={`tel:+${CONTACT.whatsapp}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-caption font-bold text-content transition-colors hover:bg-surface-alt"
                >
                  <Icon name="phone" size={16} />
                  {t('common.callUs')}
                </a>
              </div>
            ) : null}

            <div
              className="mt-5 space-y-3 border-t border-line-soft pt-5 animate-fade-up [animation-fill-mode:backwards]"
              style={{ animationDelay: `${(navLinks.length + 1) * 40}ms` }}
            >
              {user?.role === 'admin' ? (
                <Button href="/admin-portal" prefetch={false} variant="secondary" fullWidth>
                  {t('common.adminDashboard')}
                </Button>
              ) : null}
              {user ? (
                <Button href="/dashboard" variant="outline" fullWidth leadingIcon={<Icon name="user" size={18} />}>
                  {t('common.dashboard')}
                </Button>
              ) : (
                <>
                  {google ? <GoogleHeaderButton variant="block" /> : null}
                  <Button href="/signin" variant="outline" fullWidth>{t('common.signIn')}</Button>
                  <Button href="/signup" variant="secondary" fullWidth>{t('common.createAccount')}</Button>
                </>
              )}
              <Button href="/download" variant="ghost" fullWidth>{t('common.getApp')}</Button>

              <div className="flex items-center justify-between pt-1">
                <span className="text-caption font-semibold text-content-secondary">{t('common.language')}</span>
                <LanguageSwitcher tone="light" />
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default Header
