import { I18nScope } from '@/components/i18n/I18nScope'

// The duty calculator translates from `tools`; the request form from `imports`.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <I18nScope ns={['tools', 'imports']}>{children}</I18nScope>
}
