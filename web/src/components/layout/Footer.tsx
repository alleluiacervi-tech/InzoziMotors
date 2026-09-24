import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { Eyebrow, Icon } from '@/components/ui'
import { StoreButtons } from '@/components/app/StoreButtons'
import { CONTACT, FOOTER_LINKS, SITE, SOCIAL } from '@/lib/site'
import { getDisplayCenters } from '@/lib/centers'
import { getServerT } from '@/lib/i18n/server'

export async function Footer() {
  const year = new Date().getFullYear()
  const centers = await getDisplayCenters()
  const t = await getServerT()

  return (
    <footer className="border-t border-line bg-ink-900 text-white">
      <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Logo size={19} tone="light" />
            <p className="mt-5 max-w-sm text-body leading-relaxed text-white/60">
              {t('footer.tagline')}
            </p>

            <div className="mt-7">
              <Eyebrow tone="invert">{t('footer.getApp')}</Eyebrow>
              <StoreButtons tone="dark" size="sm" />
            </div>

            <div className="-my-2.5 mt-8 space-y-0 text-body">
              {/* Honesty gate: the line renders only while the real business
                  number is verified — never a placeholder. The number is shown
                  once, on the tel: row; WhatsApp gets its own labelled row
                  rather than repeating the digits, since it is the same handset. */}
              {CONTACT.whatsappVerified ? (
                <>
                  <a
                    href={`tel:+${CONTACT.phone}`}
                    className="flex items-center gap-2.5 py-2.5 text-white/60 transition-colors hover:text-white"
                  >
                    <Icon name="phone" size={17} />
                    {CONTACT.phoneDisplay}
                  </a>
                  <a
                    href={`https://wa.me/${CONTACT.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 py-2.5 text-white/60 transition-colors hover:text-white"
                  >
                    <Icon name="whatsapp" size={17} />
                    {t('footer.messageWhatsApp')}
                  </a>
                </>
              ) : null}
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-2.5 py-2.5 text-white/60 transition-colors hover:text-white"
              >
                <Icon name="mail" size={17} />
                {CONTACT.email}
              </a>
            </div>

            {/* Social profiles. Rendered only when SOCIAL has entries, so the
                row is never a set of dead icons. Each is a 44px target with a
                visible label beside the glyph — an icon-only social row is the
                single most common accessibility miss in a footer, and it costs
                nothing to name the network here. */}
            {SOCIAL.length ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {SOCIAL.map((profile) => (
                  <li key={profile.id}>
                    <a
                      href={profile.href}
                      target="_blank"
                      rel="me noopener noreferrer"
                      className="flex h-11 items-center gap-2.5 rounded-xl border border-white/15 px-3.5 text-caption font-semibold text-white/70 transition-colors hover:border-white/35 hover:bg-white/5 hover:text-white"
                    >
                      <Icon name={profile.id} size={17} aria-hidden="true" />
                      {profile.handle}
                      <span className="sr-only"> on {profile.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_LINKS.map((group) => (
              <div key={t(`footer.headings.${group.heading}`)}>
                <h2 className="mb-4 text-eyebrow font-bold uppercase text-white/60">
                  {t(`footer.headings.${group.heading}`)}
                </h2>
                {/* -my-2 cancels the added tap padding at the group edges so
                    the rhythm reads the same while each link gets a ~36px
                    target instead of bare 15px text. */}
                <ul className="-my-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex py-2 text-caption text-white/65 transition-colors hover:text-white"
                      >
                        {t(`footer.links.${link.href}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Trust furniture: three physical centers, printed where every page
            ends. Competitors bury their locations — the centers ARE the product
            here, so the footer says so. */}
        <div className="mt-14 border-t border-white/10 pt-10">
          <Eyebrow tone="invert">{t('footer.visitUs')}</Eyebrow>
          <div className="grid gap-6 sm:grid-cols-3">
            {centers.map((center) => (
              <div key={center.id} className="text-caption leading-relaxed text-white/60">
                <p className="font-bold text-white/85">{center.name}</p>
                <p>{center.address}</p>
                <p>{center.hours}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-micro text-white/45">
            © {year} {SITE.name}. Kigali, Rwanda. {t('footer.rights')}
          </p>
          <p className="text-micro text-white/45">
            {t('footer.noCheckout')}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
