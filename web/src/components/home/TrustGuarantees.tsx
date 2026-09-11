import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// ─────────────────────────────────────────────────────────────────────────────
// Why the inspection is worth believing — four claims, every one of them
// enforced somewhere in this repository.
//
// This section previously advertised "Guaranteed Escrow Protection", funds
// "held securely in bank escrow", a "100% duty-cleared guarantee" and a
// "guaranteed inspection". None of that exists. payments_enabled and
// guarantees_enabled are false and locked (migration 0018, editable = FALSE),
// there is no payment provider client in the tree at all, and /payments answers
// 410. The homepage's own FAQ, four sections lower, correctly told visitors
// there is no checkout — so the page contradicted itself, and the false half
// was the half making the promise.
//
// What replaced it is the stronger argument anyway, and the one AUTO24 and
// BeForward structurally cannot copy: they sell the cars they describe. We do
// not. An inspection by someone with nothing to gain from the sale is the
// product, so the pillars are about independence and evidence, not custody of
// anyone's money.
//
// Rule for editing this file: every pillar must name something a reader could
// verify. If a claim cannot point at a checklist item, a database constraint or
// a route, it does not belong here.
// ─────────────────────────────────────────────────────────────────────────────

// Four of the five rows the retired TrustBand already carried, in all six
// languages — so this rewrite costs no translation work — plus `independent`,
// the one claim that was missing and the only one a full-stack retailer cannot
// make. "guessing" was dropped: it restates "evidence" in different words.
const PILLARS: { icon: IconName; key: string }[] = [
  // Enforced by: Sawa never takes title. The inspection is not a sales tool.
  { icon: 'shield-check', key: 'independent' },
  // Enforced by: cars.js validInspectionExists() — a listing is only public
  // with a complete, passed inspection whose submission matches the car.
  { icon: 'document', key: 'evidence' },
  // Enforced by: passing an inspection sets `inspected`, never `live`. Only an
  // admin publishes, and the readiness result is kept in the audit history.
  { icon: 'eye', key: 'publication' },
  // Enforced by: payments_enabled = false, locked; /payments returns 410.
  { icon: 'user', key: 'direct' },
]

export async function TrustGuarantees() {
  const t = await getServerT()
  return (
    <Section tone="alt">
      <Container>
        <SectionHeading
          eyebrow={t('home.trust.eyebrow')}
          title={t('home.trust.title')}
          description={t('home.trust.description')}
          layout="split"
        />

        <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            // Not cards. Four bordered, shadowed boxes made these read as
            // adverts competing for attention; a plain column under a hairline
            // reads as a list of facts, which is what they are.
            <div key={pillar.key} className="border-t border-line pt-5">
              <span className="text-content-muted">
                <Icon name={pillar.icon} size={20} />
              </span>
              <h3 className="mt-3 text-title-sm font-extrabold text-content">
                {t(`home.trust.ledger.${pillar.key}.claim`)}
              </h3>
              <p className="mt-1.5 text-caption leading-relaxed text-content-secondary">
                {t(`home.trust.ledger.${pillar.key}.proof`)}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-body">
          <Link
            href="/promise"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            {t('home.trust.link')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </Container>
    </Section>
  )
}

export default TrustGuarantees
