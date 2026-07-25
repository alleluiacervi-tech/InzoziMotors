import Link from 'next/link'
import { Container, Icon, Section, SectionHeading } from '@/components/ui'
import { PROMISES } from '@/lib/site'

// The five guarantees, copy untouched from lib/site.ts (which is itself lifted
// from InzoziPromiseScreen). The first card is given the wide cell because the
// 150-point check is the one the other four rest on.

export function PromiseGrid() {
  return (
    <Section tone="alt">
      <Container>
        <SectionHeading
          eyebrow="The Inzozi Promise"
          title="Five guarantees, on every vehicle"
          description="They apply to every car on the marketplace and every car in the rental fleet. There is no premium tier that buys you a better promise."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROMISES.map((promise, i) => (
            <li
              key={promise.title}
              className={`rounded-2xl border border-line-soft bg-surface p-6 shadow-card sm:p-7 ${
                i === 0 ? 'sm:col-span-2' : ''
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-content-secondary">
                <Icon name={promise.icon} size={20} />
              </div>

              <div className="mt-5 flex items-baseline gap-2.5">
                <span className="text-[12px] font-extrabold tabular-nums tracking-[0.1em] text-content-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[17px] font-extrabold text-content">{promise.title}</h3>
              </div>

              <p className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-content-secondary">
                {promise.desc}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[15px] text-content-secondary">
          <Link
            href="/promise"
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            The promise in full, including the fine print
            <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </Container>
    </Section>
  )
}

export default PromiseGrid
