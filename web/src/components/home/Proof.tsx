import { Container, Icon, Section, TextLink } from '@/components/ui'
import { getDisplayCenters } from '@/lib/centers'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Proof that the inspection is done by people in places a buyer can visit.
//
// No photograph yet, on purpose. The only workshop pictures in public/img are
// licensed stock (CREDITS.md) and may not be presented as Sawa's centres or
// staff; next to this sentence any photo would read as exactly that. The
// three real centres, with their addresses and hours, are the proof until
// Sawa's own photographs exist (docs/WEBSITE-REDESIGN-TODO.md, D3 and 3.8).
// ─────────────────────────────────────────────────────────────────────────────

export async function Proof() {
  const [centers, t] = await Promise.all([getDisplayCenters(), getServerT()])
  if (!centers.length) return null

  return (
    <Section tone="page">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-5">
            <h2 className="text-headline font-extrabold text-content">{t('home.land.proof.title')}</h2>
            <p className="mt-4 max-w-prose text-title-sm leading-relaxed text-pretty text-content-secondary">
              {t('home.land.proof.body', { count: centers.length })}
            </p>
            <div className="mt-6">
              <TextLink href="/contact">{t('home.land.proof.link')}</TextLink>
            </div>
          </div>

          <ul className="grid min-w-0 gap-x-8 gap-y-6 sm:grid-cols-3 lg:col-span-7 lg:self-end">
            {centers.map((center) => (
              <li key={center.id} className="min-w-0 border-t border-line pt-5">
                <p className="text-body font-extrabold text-content">{center.name}</p>
                <p className="mt-2 flex items-start gap-1.5 text-caption leading-relaxed text-content-secondary">
                  <Icon name="location" size={14} className="mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
                  {center.address}
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-caption leading-relaxed text-content-secondary">
                  <Icon name="clock" size={14} className="mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
                  {center.hours}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  )
}

export default Proof
