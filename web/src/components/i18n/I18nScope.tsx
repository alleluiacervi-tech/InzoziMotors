import { MessagesScope } from '@/lib/i18n/context'
import { messagesFor } from '@/lib/i18n/dictionary'
import { getLocale } from '@/lib/i18n/server'

/** Namespaces the root layout gives every page: the header, footer, prices and
 *  store badges. Anything larger is scoped to the routes that use it. */
export const CHROME_NAMESPACES = ['common', 'nav', 'store', 'ui'] as const

/**
 * Hands the client components under a route the translations they need, in
 * the visitor's language only. Server Component: the catalogue never leaves
 * the server; the browser receives one merged slice as serialized props.
 *
 *   <I18nScope ns={['cars']}>{children}</I18nScope>
 */
export async function I18nScope({ ns, children }: { ns: readonly string[]; children: React.ReactNode }) {
  const locale = await getLocale()
  return <MessagesScope messages={messagesFor(locale, ns)}>{children}</MessagesScope>
}

export default I18nScope
