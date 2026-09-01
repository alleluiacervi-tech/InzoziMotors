import type { Metadata } from 'next'
import { Button, Container, Field, Icon, Section, SectionHeading, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CenterList } from '@/components/marketing/CenterList'
import { CONTACT } from '@/lib/site'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.contact.meta.title'),
    description: t('marketing.contact.meta.desc'),
    alternates: { canonical: '/contact' },
  }
}

export default async function ContactPage() {
  const t = await getServerT()

  // The team is on the line while the centers are open. Kept in step with
  // CENTERS in lib/site.ts — the widest window any center keeps.
  const LINE_HOURS = t('marketing.contact.hours')

  const CHANNELS = [
    {
      icon: 'whatsapp' as const,
      label: t('marketing.contact.channels.whatsapp.label'),
      value: CONTACT.whatsappDisplay,
      href: `https://wa.me/${CONTACT.whatsapp}`,
      note: t('marketing.contact.channels.whatsapp.note'),
      badge: t('marketing.contact.channels.whatsapp.badge'),
      external: true,
    },
    {
      icon: 'phone' as const,
      label: t('marketing.contact.channels.call.label'),
      value: CONTACT.phoneDisplay,
      href: `tel:+${CONTACT.phone}`,
      note: t('marketing.contact.channels.call.note', { hours: LINE_HOURS }),
      badge: null,
      external: false,
    },
    {
      icon: 'mail' as const,
      label: t('marketing.contact.channels.email.label'),
      value: CONTACT.email,
      href: `mailto:${CONTACT.email}`,
      note: t('marketing.contact.channels.email.note'),
      badge: null,
      external: false,
    },
  ]

  const PROMISES = [
    { icon: 'clock' as const, title: t('marketing.contact.expect.items.0.title'), body: t('marketing.contact.expect.items.0.body') },
    { icon: 'user' as const, title: t('marketing.contact.expect.items.1.title'), body: t('marketing.contact.expect.items.1.body') },
    { icon: 'shield-check' as const, title: t('marketing.contact.expect.items.2.title'), body: t('marketing.contact.expect.items.2.body') },
  ]

  return (
    <>
      <PageHeader
        eyebrow={t('marketing.contact.header.eyebrow')}
        title={t('marketing.contact.header.title')}
        lede={t('marketing.contact.header.lede')}
      />

      {/* ─── The number, front and centre ───────────────────────────────── */}
      <Section tone="ink" className="!py-12 sm:!py-16">
        <Container>
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
            <div className="text-center lg:text-left">
              <p className="text-micro font-bold uppercase tracking-[0.16em] text-white/60">
                {t('marketing.contact.band.label')}
              </p>
              <a
                href={`tel:+${CONTACT.phone}`}
                className="mt-2 block text-headline font-extrabold text-white transition-colors hover:text-brand-bright"
              >
                {CONTACT.phoneDisplay}
              </a>
              <p className="mt-2 text-caption text-white/60">{LINE_HOURS}</p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                size="lg"
                leadingIcon={<Icon name="whatsapp" size={20} />}
              >
                {t('marketing.contact.band.whatsapp')}
              </Button>
              <Button
                href={`tel:+${CONTACT.phone}`}
                variant="inverse"
                size="lg"
                leadingIcon={<Icon name="phone" size={19} />}
              >
                {t('marketing.contact.band.call')}
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── Channels + composer ─────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div className="min-w-0">
              <SectionHeading eyebrow={t('marketing.contact.reach.eyebrow')} title={t('marketing.contact.reach.title')} />

              <ul className="mt-10 space-y-3">
                {CHANNELS.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      {...(channel.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="flex gap-4 rounded-2xl border border-line-soft bg-surface p-5 shadow-card transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:border-line hover:shadow-card-lg"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                        <Icon name={channel.icon} size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-micro font-bold uppercase tracking-[0.1em] text-content-muted">
                            {channel.label}
                          </span>
                          {channel.badge ? (
                            <span className="rounded-pill bg-success-tint px-2 py-0.5 text-micro font-bold uppercase tracking-[0.08em] text-success-text">
                              {channel.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block break-words text-title-sm font-extrabold text-content">
                          {channel.value}
                        </span>
                        <span className="mt-1.5 block text-caption leading-relaxed text-content-secondary">
                          {channel.note}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-line-soft bg-surface p-6 shadow-card sm:p-8">
              <h2 className="text-title font-extrabold text-content">{t('marketing.contact.composer.title')}</h2>
              <p className="mt-2 text-body leading-relaxed text-content-secondary">
                {t('marketing.contact.composer.body')}
              </p>

              <form
                action={`https://wa.me/${CONTACT.whatsapp}`}
                method="get"
                target="_blank"
                className="mt-7"
              >
                <Field
                  label={t('marketing.contact.composer.fieldLabel')}
                  htmlFor="wa-text"
                  hint={t('marketing.contact.composer.fieldHint')}
                >
                  <Textarea
                    id="wa-text"
                    name="text"
                    required
                    maxLength={900}
                    placeholder={t('marketing.contact.composer.placeholder')}
                  />
                </Field>

                <Button
                  type="submit"
                  fullWidth
                  className="mt-6"
                  leadingIcon={<Icon name="whatsapp" size={19} />}
                >
                  {t('marketing.contact.composer.submit')}
                </Button>

                <p className="mt-4 text-caption leading-relaxed text-content-muted">
                  {t('marketing.contact.composer.emailPrefix')}
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="font-semibold text-content underline underline-offset-2"
                  >
                    {CONTACT.email}
                  </a>
                  {t('marketing.contact.composer.emailSuffix')}
                </p>
              </form>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── What to expect ─────────────────────────────────────────────── */}
      <Section tone="page">
        <Container>
          <SectionHeading eyebrow={t('marketing.contact.expect.eyebrow')} title={t('marketing.contact.expect.title')} />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-line-soft bg-surface p-6 shadow-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon name={p.icon} size={19} />
                </span>
                <h3 className="mt-4 text-title-sm font-extrabold text-content">{p.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ─── Centers ─────────────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.contact.centers.eyebrow')}
            title={t('marketing.contact.centers.title')}
            description={t('marketing.contact.centers.description')}
          />
          <CenterList className="mt-12" />
        </Container>
      </Section>
    </>
  )
}
