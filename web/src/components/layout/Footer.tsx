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

            {/* Contact. Each channel is a full-width tile (56px target) with
                what it is above how to reach it, so a thumb can't miss and the
                eye can scan the three at once. Honesty gate: the phone and
                WhatsApp tiles render only while the real business number is
                verified, never a placeholder. The number is printed once, on
                the call tile; WhatsApp is the same handset. */}
            <div className="mt-9">
              <Eyebrow tone="invert">{t('footer.contactUs')}</Eyebrow>
              <ul className="grid gap-2 sm:grid-cols-3 lg:max-w-md lg:grid-cols-1">
                {CONTACT.whatsappVerified ? (
                  <>
                    <li>
                      <ContactTile
                        href={`tel:+${CONTACT.phone}`}
                        icon="phone"
                        label={t('footer.call')}
                        value={CONTACT.phoneDisplay}
                      />
                    </li>
                    <li>
                      <ContactTile
                        href={`https://wa.me/${CONTACT.whatsapp}`}
                        icon="whatsapp"
                        label="WhatsApp"
                        value={t('footer.chatWithUs')}
                        external
                      />
                    </li>
                  </>
                ) : null}
                <li>
                  <ContactTile
                    href={`mailto:${CONTACT.email}`}
                    icon="mail"
                    label={t('footer.email')}
                    value={CONTACT.email}
                  />
                </li>
              </ul>

              {/* Social profiles, icon only: the network's mark is the label
                  people look for. The accessible name carries the network and
                  the handle. Rendered only when SOCIAL has entries, so the row
                  is never a set of dead icons. */}
              {SOCIAL.length ? (
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-micro text-white/50">{t('footer.followUs')}</span>
                  <ul className="flex flex-wrap gap-2">
                    {SOCIAL.map((profile) => (
                      <li key={profile.id}>
                        <a
                          href={profile.href}
                          target="_blank"
                          rel="me noopener noreferrer"
                          aria-label={`${profile.label} · ${profile.handle}`}
                          title={`${profile.label} · ${profile.handle}`}
                          className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/35 hover:bg-white/5 hover:text-white"
                        >
                          <Icon name={profile.id} size={19} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_LINKS.map((group) => (
              <div key={t(`footer.headings.${group.heading}`)}>
                <h2 className="mb-4 text-caption font-bold text-white/60">
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
          <p className="text-micro text-white/60">
            © {year} {SITE.name}. Kigali, Rwanda. {t('footer.rights')}
          </p>
          <p className="text-micro text-white/60">
            {t('footer.noCheckout')}
          </p>
        </div>
      </div>
    </footer>
  )
}

function ContactTile({
  href, icon, label, value, external = false,
}: {
  href: string
  icon: 'phone' | 'whatsapp' | 'mail'
  label: string
  value: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white/75 transition-colors group-hover:text-white">
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-micro text-white/50">{label}</span>
        <span className="block truncate text-caption font-semibold text-white/85 transition-colors group-hover:text-white">
          {value}
        </span>
      </span>
    </a>
  )
}

export default Footer
