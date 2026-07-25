'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui'

// A submit button that disables itself while its form is in flight. Every
// mutation in the dashboard costs a round trip to the VPS, and a double-tapped
// "Cancel request" is a real bug, not a cosmetic one.

export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  fullWidth,
  leadingIcon,
  className = '',
  disabled,
}: {
  children: ReactNode
  pendingLabel?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'dark' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  leadingIcon?: ReactNode
  className?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      leadingIcon={pending ? undefined : leadingIcon}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
    >
      {pending ? pendingLabel ?? 'Working…' : children}
    </Button>
  )
}

export default SubmitButton
