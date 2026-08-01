'use client'

import { Button, Icon } from '@/components/ui'
import { useOpenInApp } from '@/components/app/useDeepLink'

/**
 * Hands a visitor off to the same screen inside the native app, falling back to
 * the store. The deep-link race lives in useOpenInApp; this is only the control.
 */
export function OpenInAppButton({
  path,
  label = 'Open in the app',
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
  const openInApp = useOpenInApp()

  return (
    <Button
      type="button"
      variant={variant}
      fullWidth={fullWidth}
      className={className}
      onClick={() => openInApp(path)}
      leadingIcon={<Icon name="external" size={16} className="text-content-secondary" />}
    >
      {label}
    </Button>
  )
}

export default OpenInAppButton
