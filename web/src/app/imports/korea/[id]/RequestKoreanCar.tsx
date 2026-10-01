'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Alert, Button, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { requestKoreanCarAction, type KoreanRequestState } from '../actions'

function Submit() {
  const t = useT()
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full" trailingIcon={pending ? undefined : <Icon name="arrow-right" size={18} />}>
      {pending ? t('imports.korea.requesting') : t('imports.korea.requestCta')}
    </Button>
  )
}

export function RequestKoreanCar({ listingId, signedIn }: { listingId: string; signedIn: boolean }) {
  const t = useT()
  const [state, action] = useActionState<KoreanRequestState, FormData>(requestKoreanCarAction, { status: 'idle' })

  if (!signedIn) {
    const next = encodeURIComponent(`/imports/korea/${listingId}`)
    return <Button href={`/signin?next=${next}`} size="lg" className="w-full">{t('imports.korea.requestSignIn')}</Button>
  }
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="listing_id" value={listingId} />
      {state.status === 'error' ? (
        <div role="alert">
          <Alert tone="danger">
            {state.code === 'gone'
              ? t('imports.korea.requestGone')
              : state.code === 'session'
              ? t('imports.korea.requestSignIn')
              : state.message || t('imports.korea.requestFailed')}
          </Alert>
        </div>
      ) : null}
      <Submit />
    </form>
  )
}
