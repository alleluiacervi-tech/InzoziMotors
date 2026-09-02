'use client'

import { useActionState, useState } from 'react'
import { proposeRentalAction } from '@/app/(dashboard)/dashboard/rentals/fleet/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Card, Field, Input, LiveRegion, Select, Textarea } from '@/components/ui'
import { useT } from '@/lib/i18n/context'
import type { EligibleRentalInspection } from '@/lib/types'

// Proposing a rental vehicle from one of the provider's own passing
// inspections. The backend re-verifies everything (POST /rentals/propose) —
// this form only picks vehicle identity from the chosen inspection so it can
// never diverge from the evidence the way a free-typed make/model could.
export function ProposeRentalForm({ eligible }: { eligible: EligibleRentalInspection[] }) {
  const t = useT()
  const [state, action] = useActionState(proposeRentalAction, null)
  const [selectedId, setSelectedId] = useState(eligible[0]?.id ?? '')
  const selected = eligible.find((row) => row.id === selectedId) ?? eligible[0]

  if (!eligible.length) {
    return (
      <Card className="p-5">
        <p className="text-body font-bold text-content">{t('dashboard.rentalFleet.propose.noneTitle')}</p>
        <p className="mt-1 text-caption text-content-muted">{t('dashboard.rentalFleet.propose.noneBody')}</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <h2 className="text-title-sm font-extrabold text-content">{t('dashboard.rentalFleet.propose.heading')}</h2>
      <p className="mt-1 text-caption text-content-muted">{t('dashboard.rentalFleet.propose.subheading')}</p>

      <form action={action} className="mt-5 space-y-4">
        <Field label={t('dashboard.rentalFleet.propose.inspection')} htmlFor="propose-inspection" error={state?.fieldErrors?.inspection_id} required>
          <Select
            id="propose-inspection"
            name="inspection_id"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            error={Boolean(state?.fieldErrors?.inspection_id)}
          >
            {eligible.map((row) => (
              <option key={row.id} value={row.id}>
                {row.year} {row.make} {row.model} · {row.score}/150
              </option>
            ))}
          </Select>
        </Field>
        {selected ? (
          <>
            <input type="hidden" name="make" value={selected.make} />
            <input type="hidden" name="model" value={selected.model} />
            <input type="hidden" name="year" value={selected.year} />
          </>
        ) : null}

        <Field label={t('dashboard.rentalFleet.propose.title')} htmlFor="propose-title" error={state?.fieldErrors?.title} required>
          <Input
            id="propose-title"
            name="title"
            required
            defaultValue={selected ? `${selected.year} ${selected.make} ${selected.model}` : ''}
            error={Boolean(state?.fieldErrors?.title)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('dashboard.rentalFleet.propose.dailyRate')} htmlFor="propose-daily" error={state?.fieldErrors?.daily_rate} required>
            <Input id="propose-daily" name="daily_rate" type="number" min={1} required error={Boolean(state?.fieldErrors?.daily_rate)} />
          </Field>
          <Field label={t('dashboard.rentalFleet.propose.weeklyRate')} htmlFor="propose-weekly">
            <Input id="propose-weekly" name="weekly_rate" type="number" min={1} />
          </Field>
          <Field label={t('dashboard.rentalFleet.propose.deposit')} htmlFor="propose-deposit">
            <Input id="propose-deposit" name="deposit" type="number" min={0} defaultValue={0} />
          </Field>
          <Field label={t('dashboard.rentalFleet.propose.minDays')} htmlFor="propose-mindays">
            <Input id="propose-mindays" name="min_days" type="number" min={1} defaultValue={1} />
          </Field>
          <Field label={t('dashboard.rentalFleet.propose.category')} htmlFor="propose-category">
            <Input id="propose-category" name="category" placeholder={t('dashboard.rentalFleet.propose.categoryPlaceholder')} />
          </Field>
          <Field label={t('dashboard.rentalFleet.propose.seats')} htmlFor="propose-seats">
            <Input id="propose-seats" name="seats" type="number" min={1} defaultValue={5} />
          </Field>
          <Field label={t('dashboard.rentalFleet.propose.location')} htmlFor="propose-location">
            <Input id="propose-location" name="location" />
          </Field>
        </div>

        <Field
          label={t('dashboard.rentalFleet.propose.images')}
          htmlFor="propose-images"
          hint={t('dashboard.rentalFleet.propose.imagesHint')}
          error={state?.fieldErrors?.images}
          required
        >
          <Textarea id="propose-images" name="images" rows={3} required error={Boolean(state?.fieldErrors?.images)} />
        </Field>

        {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
        <LiveRegion>{state?.error || (state?.ok ? state.message : '')}</LiveRegion>

        <SubmitButton pendingLabel={t('dashboard.rentalFleet.propose.submitting')}>
          {t('dashboard.rentalFleet.propose.submit')}
        </SubmitButton>
      </form>
    </Card>
  )
}

export default ProposeRentalForm
