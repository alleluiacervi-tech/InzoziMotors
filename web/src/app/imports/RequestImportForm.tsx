'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Alert, Button, Icon } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import { requestImportAction, type ImportRequestState } from './actions'
import { IMPORT_ORIGINS } from './origins'

const field =
  'h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 text-field text-content ' +
  'placeholder:text-content-muted transition-colors hover:border-content-muted/60 ' +
  'focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-0 sm:text-body'
const label = 'mb-1.5 block text-caption font-bold text-content'

function Submit() {
  const t = useT()
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full sm:w-auto"
      trailingIcon={pending ? undefined : <Icon name="arrow-right" size={18} />}
    >
      {pending ? t('imports.sending') : t('imports.submit')}
    </Button>
  )
}

export function RequestImportForm({
  makes,
  defaults,
}: {
  makes: string[]
  defaults: { origin?: string; make?: string; model?: string; year?: string }
}) {
  const t = useT()
  const [state, action] = useActionState<ImportRequestState, FormData>(requestImportAction, { status: 'idle' })
  const origin = (IMPORT_ORIGINS as readonly string[]).includes(defaults.origin ?? '') ? defaults.origin : 'Japan'

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.status === 'error' ? (
        <div className="sm:col-span-2" role="alert">
          <Alert tone="danger">
            {state.code === 'required'
              ? t('imports.errorRequired')
              : state.code === 'session'
              ? t('imports.signInTitle')
              : state.message || t('imports.errorFailed')}
          </Alert>
        </div>
      ) : null}

      <div className="min-w-0">
        <label htmlFor="imp-origin" className={label}>{t('imports.origin')}</label>
        <select id="imp-origin" name="origin_country" defaultValue={origin} className={field} required>
          {IMPORT_ORIGINS.map((o) => (
            <option key={o} value={o}>{t(`imports.origins.${o}`)}</option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor="imp-year" className={label}>{t('imports.year')}</label>
        <input
          id="imp-year"
          name="year"
          type="number"
          inputMode="numeric"
          min={1980}
          max={new Date().getFullYear() + 1}
          defaultValue={defaults.year}
          className={field}
        />
      </div>
      <div className="min-w-0">
        <label htmlFor="imp-make" className={label}>{t('imports.make')}</label>
        <input id="imp-make" name="make" list="imp-makes" required maxLength={80} defaultValue={defaults.make} autoComplete="off" className={field} />
        <datalist id="imp-makes">
          {makes.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>
      <div className="min-w-0">
        <label htmlFor="imp-model" className={label}>{t('imports.model')}</label>
        <input id="imp-model" name="model" required maxLength={80} defaultValue={defaults.model} autoComplete="off" className={field} />
      </div>
      <div className="min-w-0 sm:col-span-2">
        <label htmlFor="imp-notes" className={label}>{t('imports.notes')}</label>
        <textarea
          id="imp-notes"
          name="customer_notes"
          rows={3}
          maxLength={2000}
          aria-describedby="imp-notes-hint"
          className={`${field} h-auto py-3`}
        />
        <p id="imp-notes-hint" className="mt-1.5 text-micro text-content-muted">{t('imports.notesHint')}</p>
      </div>
      <div className="sm:col-span-2">
        <Submit />
      </div>
    </form>
  )
}

export default RequestImportForm
