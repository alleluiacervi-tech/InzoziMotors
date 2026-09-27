import { I18nScope } from '@/components/i18n/I18nScope'

// Client components under /compare translate from these namespaces.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <I18nScope ns={['cars', 'market']}>{children}</I18nScope>
}
