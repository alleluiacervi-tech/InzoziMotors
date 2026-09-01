import type { Metadata } from 'next'
import { Button, Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CenterList } from '@/components/marketing/CenterList'
import { getServerT } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('marketing.about.meta.title'),
    description: t('marketing.about.meta.desc'),
    alternates: { canonical: '/about' },
  }
}

export default async function AboutPage() {
  const t = await getServerT()

  // The pipeline from the product blueprint, condensed. A car cannot skip a stage:
  // the backend will not move a listing to `live` without an inspection record.
  const PIPELINE = [0, 1, 2, 3, 4].map((i) => ({
    title: t(`marketing.about.pipeline.stages.${i}.title`),
    desc: t(`marketing.about.pipeline.stages.${i}.desc`),
  }))

  // The negative space of the product. Saying plainly what Sawa refuses to do is
  // more informative than another paragraph about what it does.
  const WE_DO_NOT = [0, 1, 2, 3].map((i) => ({
    title: t(`marketing.about.weDoNot.items.${i}.title`),
    desc: t(`marketing.about.weDoNot.items.${i}.desc`),
  }))

  return (
    <>
      <PageHeader
        eyebrow={t('marketing.about.header.eyebrow')}
        title={t('marketing.about.header.title')}
        lede={t('marketing.about.header.lede')}
        actions={
          <>
            <Button href="/cars" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('marketing.about.header.browse')}
            </Button>
            <Button href="/contact" variant="outline">
              {t('marketing.about.header.visit')}
            </Button>
          </>
        }
      />

      {/* ─── Why this market ─────────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <SectionHeading
              eyebrow={t('marketing.about.why.eyebrow')}
              title={t('marketing.about.why.title')}
              description={t('marketing.about.why.description')}
            />

            <div className="max-w-prose space-y-5 text-title-sm leading-relaxed text-content-secondary">
              <p>{t('marketing.about.why.p1')}</p>
              <p>{t('marketing.about.why.p2')}</p>
              <p>{t('marketing.about.why.p3')}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ─── The pipeline ────────────────────────────────────────────────── */}
      <Section tone="page">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.about.pipeline.eyebrow')}
            title={t('marketing.about.pipeline.title')}
            description={t('marketing.about.pipeline.description')}
          />

          <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((stage, i) => (
              <li key={stage.title} className="bg-surface p-6">
                <span className="text-caption font-extrabold tabular-nums tracking-[0.1em] text-content-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-title-sm font-extrabold text-content">{stage.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                  {stage.desc}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ─── What we refuse to do ────────────────────────────────────────── */}
      <Section tone="surface">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.about.weDoNot.eyebrow')}
            title={t('marketing.about.weDoNot.title')}
            description={t('marketing.about.weDoNot.description')}
          />

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {WE_DO_NOT.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-line-soft bg-surface p-6 shadow-card sm:p-7"
              >
                <div className="flex items-start gap-3">
                  <Icon name="close-circle" size={20} className="mt-0.5 shrink-0 text-content-muted" />
                  <div>
                    <h3 className="text-title-sm font-extrabold text-content">{item.title}</h3>
                    <p className="mt-2 text-caption leading-relaxed text-content-secondary">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ─── Centers ─────────────────────────────────────────────────────── */}
      <Section tone="alt">
        <Container>
          <SectionHeading
            eyebrow={t('marketing.about.centers.eyebrow')}
            title={t('marketing.about.centers.title')}
            description={t('marketing.about.centers.description')}
          />
          <CenterList className="mt-12" />

          <div className="mt-10">
            <Button href="/contact" variant="outline" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {t('marketing.about.centers.directions')}
            </Button>
          </div>
        </Container>
      </Section>
    </>
  )
}
