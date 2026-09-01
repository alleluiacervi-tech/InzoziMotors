'use client'

import { Button, Icon } from '@/components/ui'
import { useOpenInApp } from '@/components/app/useDeepLink'
import { useT } from '@/lib/i18n/context'

/**
 * Hands a visitor off to the same screen inside the native app, falling back to
 * the store. The deep-link race lives in useOpenInApp; this is only the control.
 */
export function OpenInAppButton({
  path,
  label,
  variant = 'outline',
  fullWidth,
  className = '',
}: {
  /** App linking path, e.g. `car/<id>` → sawa://car/<id>. */
  path: string
  label?: string
  variant?: 'outline' | 'secondary' | 'ghost'
  fullWidth?: boolean
  className?: string
}) {
  const t = useT()
  const openInApp = useOpenInApp()
  const text = label ?? t('cars.openInApp')

  return (
    <Button
      type="button"
      variant={variant}
      fullWidth={fullWidth}
      className={className}
      onClick={() => openInApp(path)}
      leadingIcon={<Icon name="external" size={16} className="text-content-secondary" />}
    >
      {text}
    </Button>
  )
}

export default OpenInAppButton
