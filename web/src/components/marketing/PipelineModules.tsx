import Image from 'next/image'
import { Reveal } from '@/components/ui/Reveal'

// Numbered pipeline modules — the one grammar for "how it works" everywhere
// (homepage, /sell, /how-it-works). The offline steps are first-class numbered
// nodes on the same line as the digital ones: the in-person handover is the
// product, not a gap in it.
//
// One line per step, by rule. Each module cascades in on scroll (Reveal), and
// a step may carry an image — used for exactly one node, the handover, so the
// physical moment is the visual anchor of the row.

export interface PipelineStep {
  title: string
  desc: string
  /** At most one step per row carries an image — the one that earns it. */
  image?: { image: string; alt: string }
}

/** The listing pipeline, seller-facing. The homepage and /sell share it. */
export const LISTING_PIPELINE: PipelineStep[] = [
  { title: 'Submit online', desc: 'The car and your price — no photos needed.' },
  { title: 'We inspect', desc: '150 points at our center, graded item by item.' },
  { title: 'We shoot', desc: '36 standard angles by our photographers.' },
  { title: 'It goes live', desc: 'Published with the full report attached.' },
  { title: 'Handover at our center', desc: 'Payment in person. The 7-day guarantee starts here.' },
]

/** The purchase journey, buyer-facing. /how-it-works uses it. */
export const BUYING_PIPELINE: PipelineStep[] = [
  { title: 'Browse certified cars', desc: 'Every listing carries its full inspection report.' },
  { title: 'Request the car', desc: 'One tap, no payment — it leaves the marketplace.' },
  { title: 'We confirm on WhatsApp', desc: 'A handover time at the center that suits you.' },
  { title: 'Handover at the center', desc: 'Check it against its report, then pay in person.' },
  { title: '7 days to be sure', desc: 'Full refund if it doesn’t match its report.' },
]

export function PipelineModules({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="relative grid gap-10 lg:grid-cols-5 lg:gap-8">
      {/* The connector: the dashed line that makes five cards read as one
          pipeline. Horizontal behind the indices on lg, vertical on mobile. */}
      <div
        aria-hidden="true"
        className="absolute left-[7px] top-2 h-[calc(100%-2rem)] border-l-2 border-dashed border-line lg:left-0 lg:top-[9px] lg:h-auto lg:w-full lg:border-l-0 lg:border-t-2"
      />
      {steps.map((step, i) => (
        <li key={step.title} className="relative pl-8 lg:pl-0">
          <Reveal delay={i * 90}>
            <p className="text-eyebrow font-bold text-content-muted">
              <span
                className="absolute -left-0.5 top-0.5 inline-block h-4 w-4 rounded-full border-2 border-line bg-surface-page lg:static lg:mr-2 lg:inline-block lg:align-[-2px]"
                aria-hidden="true"
              />
              {String(i + 1).padStart(2, '0')}
            </p>
            {step.image ? (
              <div className="relative mt-3 aspect-[16/9] overflow-hidden rounded-xl">
                <Image
                  src={step.image.image}
                  alt={step.image.alt}
                  fill
                  sizes="(min-width: 1024px) 20vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            <h3 className="mt-3 text-title-sm font-extrabold text-content">{step.title}</h3>
            <p className="mt-2 text-body text-content-secondary">{step.desc}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  )
}

export default PipelineModules
