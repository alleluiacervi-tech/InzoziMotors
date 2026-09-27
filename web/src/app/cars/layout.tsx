import { I18nScope } from '@/components/i18n/I18nScope'
import { CompareTray } from '@/components/market/CompareControls'

// Client components under /cars translate from these namespaces; the root
// layout only ships the chrome's. See lib/i18n/context.tsx.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <I18nScope ns={['cars', 'messages', 'market']}>
      {children}
      <CompareTray />
    </I18nScope>
  )
}
