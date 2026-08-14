import { CENTERS, CONTACT, SITE } from './site'

// ─────────────────────────────────────────────────────────────────────────────
// Structured data — one builder per entity, so the same facts are stated the
// same way on every page and the @id anchors actually link the graph together.
//
// HONESTY RULE, same as everywhere else in this codebase: schema.org markup is
// a machine-readable claim to Google, and a false one earns a manual action.
// Nothing here may assert something the site does not already show a human:
//   · telephone only while CONTACT.whatsappVerified holds, · no aggregateRating
//     until real reviews exist, · no priceValidUntil we cannot honour, · no
//     sameAs for social profiles we have not created.
// ─────────────────────────────────────────────────────────────────────────────

/** Schema.org wants absolute URLs. Relative ones are silently dropped. */
export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`
}

export const ORG_ID = `${SITE.url}/#organization`
export const WEBSITE_ID = `${SITE.url}/#website`

/** A real customer-facing service page. Category pages use this instead of
 * pretending that a service is a Product with reviews or an invented price. */
export function serviceNode({
  id, name, description, path, serviceType,
}: {
  id: string
  name: string
  description: string
  path: string
  serviceType: string
}) {
  return {
    '@type': 'Service',
    '@id': `${SITE.url}/#${id}`,
    name,
    description,
    url: absoluteUrl(path),
    serviceType,
    provider: { '@id': ORG_ID },
    areaServed: [
      { '@type': 'City', name: 'Kigali', addressCountry: 'RW' },
      { '@type': 'Country', name: 'Rwanda' },
    ],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: absoluteUrl(path),
      availableLanguage: ['en', 'rw'],
    },
  }
}

/** The publisher entity every other node points back to. */
export function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon'),
      caption: SITE.name,
    },
    image: absoluteUrl('/opengraph-image'),
    areaServed: { '@type': 'City', name: 'Kigali', addressCountry: 'RW' },
    // Both are real and both are published on /contact, so both may be claimed
    // here. The telephone stays gated on whatsappVerified: if the line is ever
    // disconnected that flag goes false, the site stops showing the number, and
    // this stops asserting it to Google in the same change.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT.supportEmail,
      ...(CONTACT.whatsappVerified ? { telephone: `+${CONTACT.phone}` } : {}),
      areaServed: 'RW',
      availableLanguage: ['en', 'rw'],
    },
  }
}

/** WebSite + the search box Google can surface as a sitelinks searchbox. */
export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: 'en-RW',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/cars?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * One AutoDealer per inspection center — the schema type that makes a business
 * eligible for local results ("car dealer Kigali"). Every address and opening
 * time below is already printed on /how-it-works and /about for human readers;
 * this only restates it for machines.
 */
export function autoDealerNodes() {
  return CENTERS.map((center) => ({
    '@type': 'AutoDealer',
    '@id': `${SITE.url}/#center-${center.id}`,
    name: `${SITE.name} — ${center.name}`,
    url: absoluteUrl('/how-it-works'),
    image: absoluteUrl('/opengraph-image'),
    parentOrganization: { '@id': ORG_ID },
    address: {
      '@type': 'PostalAddress',
      streetAddress: center.address,
      addressLocality: center.area,
      addressRegion: 'Kigali',
      addressCountry: 'RW',
    },
    areaServed: { '@type': 'City', name: 'Kigali', addressCountry: 'RW' },
    openingHoursSpecification: openingHours(center.hours),
    priceRange: '$$',
  }))
}

/**
 * "Mon–Sat · 8:00 – 18:00" → the structured form Google expects. Returns
 * undefined for anything this parser doesn't recognise rather than guessing —
 * wrong opening hours send a buyer to a closed gate.
 */
function openingHours(hours: string) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const SHORT: Record<string, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
    Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
  }
  const match = hours.match(/([A-Za-z]{3})\s*[–-]\s*([A-Za-z]{3}).*?(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/)
  if (!match) return undefined
  const [, from, to, opens, closes] = match
  const start = DAYS.indexOf(SHORT[from])
  const end = DAYS.indexOf(SHORT[to])
  if (start < 0 || end < 0 || end < start) return undefined
  // ISO 8601 wants two digits — Google rejects "8:00" where it expects "08:00".
  const pad = (t: string) => (t.length === 4 ? `0${t}` : t)
  return [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: DAYS.slice(start, end + 1),
    opens: pad(opens),
    closes: pad(closes),
  }]
}

/**
 * Breadcrumbs. Google renders these in place of the raw URL in results, and a
 * detail page without them shows a bare UUID — unreadable and unclickable.
 */
export function breadcrumbNode(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/** A catalogue page's contents, in the order a visitor sees them. */
export function itemListNode(items: { path: string; name: string }[], listName: string) {
  return {
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  }
}

/**
 * Offer availability from a listing's status. A sold car keeps its page (the
 * URL has equity and inbound links) but must stop advertising itself as for
 * sale — `SoldOut` is how you say that to a crawler.
 */
export function offerAvailability(status?: string | null): string {
  switch (status) {
    case 'live':     return 'https://schema.org/InStock'
    case 'reserved': return 'https://schema.org/LimitedAvailability'
    case 'sold':     return 'https://schema.org/SoldOut'
    default:         return 'https://schema.org/OutOfStock'
  }
}

/** Wrap nodes in the one-graph-per-page envelope. */
export function graph(...nodes: unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  }
}
