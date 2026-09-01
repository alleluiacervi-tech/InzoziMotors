import { Icon } from '@/components/ui'
import { getServerT } from '@/lib/i18n/server'

// Native <details>/<summary>: it opens without JavaScript, it is keyboard and
// screen-reader correct with no ARIA of our own, and Google can read the answers
// in the markup. The default disclosure triangle is removed and replaced with a
// chevron that rotates via the `open` attribute — no state, no client bundle.

// `id` keys the translation (faq.<id>.q / faq.<id>.a in messages/faq.ts); the
// English q/a stay as the fallback if a translation is missing.
export type Faq = { id?: string; q: string; a: string }

export async function FaqAccordion({
  items,
  structuredData = false,
}: {
  items: readonly Faq[]
  /** Emit FAQPage JSON-LD. Set on exactly one page per URL. */
  structuredData?: boolean
}) {
  const t = await getServerT()
  // Resolve each item to the active locale, falling back to its English text.
  const resolved = items.map((item) => {
    const q = item.id ? t(`faq.${item.id}.q`) : item.q
    const a = item.id ? t(`faq.${item.id}.a`) : item.a
    return {
      key: item.id ?? item.q,
      q: q.startsWith('faq.') ? item.q : q,
      a: a.startsWith('faq.') ? item.a : a,
    }
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: resolved.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <>
      <div className="divide-y divide-line-soft overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card">
        {resolved.map((item) => (
          <details key={item.key} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 text-body font-extrabold text-content transition-colors hover:bg-surface-alt sm:px-8 [&::-webkit-details-marker]:hidden">
              {item.q}
              <Icon
                name="chevron-down"
                size={18}
                className="shrink-0 text-content-muted transition-transform duration-300 ease-brand group-open:rotate-180"
              />
            </summary>
            <p className="max-w-prose px-5 pb-6 text-body leading-relaxed text-content-secondary sm:px-8">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      {structuredData ? (
        <script
          type="application/ld+json"
          // Static copy from lib/site.ts; the escape is belt-and-braces against
          // a stray "</script>" ever entering that file.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
    </>
  )
}

export default FaqAccordion
