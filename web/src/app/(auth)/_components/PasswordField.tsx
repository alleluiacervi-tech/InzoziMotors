'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { Field, Icon, Input } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> & {
  id: string
  label: string
  hint?: string
  error?: string
}

/**
 * Password input with a reveal toggle. The toggle is a real <button> carrying
 * aria-pressed so a screen reader announces the state rather than just the
 * label, and it is 48px square — a 40px control fails on a phone.
 */
export function PasswordField({ id, label, hint, error, className = '', ...rest }: Props) {
  const [visible, setVisible] = useState(false)
  const t = useT()

  // Field renders the hint/error paragraphs but cannot reach into an arbitrary
  // child to wire them up, so the association is made here.
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          error={Boolean(error)}
          aria-describedby={describedBy}
          className={`pr-12 ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.password.hide') : t('auth.password.show')}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl text-content-muted transition-colors hover:text-content"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
    </Field>
  )
}
