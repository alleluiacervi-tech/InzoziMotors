import { Card, Container } from '@/components/ui'

// Four process facts in a band directly under the hero. This is the honest
// version of the "4.8/5 from 40,000 buyers" band every competitor runs: every
// number here is a fact about HOW WE WORK, not a metric about how liked we are
// — so it needs no users to be true on day one, and it can never be inflated.

const FACTS = [
  { value: '150', label: 'point inspection, published in full' },
  { value: '36', label: 'standard photo angles, shot by us' },
  { value: '7', label: 'day drive-it guarantee' },
  { value: '3', label: 'Kigali inspection centers' },
] as const

export function StatBand() {
  return (
    <section className="bg-surface py-10">
      <Container>
        <Card className="grid grid-cols-2 divide-y divide-line-soft lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {FACTS.map((fact) => (
            <div key={fact.value} className="p-6 sm:p-8">
              <p className="text-display font-extrabold tracking-[-0.03em] text-content">
                {fact.value}
              </p>
              <p className="mt-1 text-caption text-content-secondary">{fact.label}</p>
            </div>
          ))}
        </Card>
      </Container>
    </section>
  )
}

export default StatBand
