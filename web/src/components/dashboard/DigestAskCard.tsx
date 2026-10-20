'use client'

import { useActionState } from 'react'
import { answerDigestAskAction } from '@/app/(dashboard)/dashboard/saved/actions'
import { Alert, Button, Card } from '@/components/ui'
import { useT } from '@/lib/i18n/context'

// The one-time, plain-words ask for the daily summary, shown on the Saved page
// once someone has a saved search (the moment it clearly pays off). The summary
// is OFF until they say yes: a summary of every new car is promotional, which
// needs explicit consent. Either answer is remembered, so this never returns;
// the Profile switch owns the choice after that.
export function DigestAskCard() {
  const t = useT()
  const [state, action] = useActionState(answerDigestAskAction, null)

  if (state?.ok) {
    return <Alert tone="success">{state.message}</Alert>
  }

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <p className="text-body font-extrabold text-content">{t('dashboard.saved.digestAskTitle')}</p>
      <p className="mt-1 text-caption text-content-muted">{t('dashboard.saved.digestAskBody')}</p>
      {state?.error ? <Alert tone="danger" className="mt-3">{state.error}</Alert> : null}
      <form action={action} className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" name="answer" value="yes" size="compact">
          {t('dashboard.saved.digestAskYes')}
        </Button>
        <Button type="submit" name="answer" value="no" size="compact" variant="ghost">
          {t('dashboard.saved.digestAskNo')}
        </Button>
      </form>
    </Card>
  )
}

export default DigestAskCard
