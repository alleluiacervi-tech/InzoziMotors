'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui'

/**
 * Must be a child of the <form>, not a sibling — useFormStatus reads the status
 * of the form above it in the tree, which is also why this cannot live inside
 * the component that owns useActionState.
 */
export function SubmitButton({
  children, pendingLabel, variant = 'primary', name, value,
}: {
  children: ReactNode
  pendingLabel: string
  variant?: 'primary' | 'dark'
  /** Submitter name/value — how a multi-button form says which one was pressed. */
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      variant={variant}
      fullWidth
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </Button>
  )
}
