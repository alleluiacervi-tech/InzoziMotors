// Numbered pipeline modules — the one grammar for "how it works" everywhere
// (homepage, /sell, /how-it-works). The offline steps are first-class numbered
// nodes on the same line as the digital ones: the in-person handover is the
// product, not a gap in it.

export interface PipelineStep {
  title: string
  desc: string
}

/** The listing pipeline, seller-facing. The homepage and /sell share it. */
export const LISTING_PIPELINE: PipelineStep[] = [
  { title: 'Submit online', desc: 'Tell us the car and your asking price. No photos needed — ours are better.' },
  { title: 'We inspect', desc: 'A 150-point mechanical, body, electronics and documentation check at our center.' },
  { title: 'We shoot', desc: '36 standard angles by our photographers, so every listing looks the same — honest.' },
  { title: 'It goes live', desc: 'Published under Inzozi’s name with the full report attached. You control the price.' },
  { title: 'Handover at our center', desc: 'Payment happens in person at an Inzozi center. The 7-day guarantee starts here.' },
]

/** The purchase journey, buyer-facing. /how-it-works uses it. */
export const BUYING_PIPELINE: PipelineStep[] = [
  { title: 'Browse certified cars', desc: 'Every listing carries its full inspection report. What you read is what we verified.' },
  { title: 'Request the car', desc: 'One tap, no payment. The car is reserved for you and leaves the marketplace.' },
  { title: 'We confirm on WhatsApp', desc: 'Within 24 hours we set a handover time at the center that suits you.' },
  { title: 'Handover at the center', desc: 'Check the car against its report, then pay in person. We witness both sides.' },
  { title: '7 days to be sure', desc: 'If the car doesn’t match its report, return it for a full refund.' },
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
          <p className="text-eyebrow font-bold text-content-muted">
            <span className="absolute -left-0.5 top-0.5 inline-block h-4 w-4 rounded-full border-2 border-line bg-surface-page lg:static lg:mr-2 lg:inline-block lg:align-[-2px]" aria-hidden="true" />
            {String(i + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-3 text-title-sm font-extrabold text-content">{step.title}</h3>
          <p className="mt-2 text-body text-content-secondary">{step.desc}</p>
        </li>
      ))}
    </ol>
  )
}

export default PipelineModules
