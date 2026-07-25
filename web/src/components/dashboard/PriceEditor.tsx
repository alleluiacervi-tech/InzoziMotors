'use client'

import { useActionState, useState } from 'react'
import { updatePriceAction } from '@/app/(dashboard)/dashboard/selling/actions'
import { SubmitButton } from '@/components/dashboard/SubmitButton'
import { Alert, Field, Input, LiveRegion } from '@/components/ui'
import { formatRWF, formatUSD } from '@/lib/business'

// Sellers keep control of their price. The consequence of lowering it is
// stated up front, because the backend really does message every buyer who
// saved the car the moment the new price lands.

export function PriceEditor({
  carId,
  currentPrice,
  title,
}: {
  carId: string
  currentPrice: number
  title: string
}) {
  const [state, action] = useActionState(updatePriceAction, null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(String(currentPrice))

  const next = Number(value.replace(/[,\s]/g, ''))
  const isDrop = Number.isFinite(next) && next > 0 && next < currentPrice
  const inputId = `price-${carId}`

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center rounded-xl border border-line px-4 text-sm font-bold text-content-secondary transition-colors hover:border-content-muted hover:bg-surface-alt hover:text-content"
        >
          Change price
          <span className="sr-only"> for {title}</span>
        </button>
        <LiveRegion>{state?.ok ? state.message : ''}</LiveRegion>
        {state?.ok ? (
          <p className="mt-2 text-[13px] font-semibold text-success">{state.message}</p>
        ) : null}
      </div>
    )
  }

  return (
    <form action={action} className="rounded-xl border border-line bg-surface-alt p-4">
      <input type="hidden" name="id" value={carId} />

      <Field
        label="New asking price (USD)"
        htmlFor={inputId}
        hint={`Currently ${formatUSD(currentPrice)} · ${formatRWF(currentPrice)}`}
        error={state?.fieldErrors?.price}
      >
        <Input
          id={inputId}
          name="price"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={Boolean(state?.fieldErrors?.price)}
        />
      </Field>

      {isDrop ? (
        <Alert tone="info" className="mt-3">
          Lowering the price sends a price-drop alert to everyone who saved this car, and the new
          price is recorded in the listing&rsquo;s public price history.
        </Alert>
      ) : null}

      {state?.error ? (
        <Alert tone="danger" className="mt-3">
          {state.error}
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert tone="success" className="mt-3">
          {state.message}
        </Alert>
      ) : null}
      <LiveRegion>{state?.ok ? state.message : ''}</LiveRegion>

      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save new price
        </SubmitButton>
        <button
          type="button"
          onClick={() => {
            setValue(String(currentPrice))
            setOpen(false)
          }}
          className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold text-content-secondary transition-colors hover:bg-surface hover:text-content"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default PriceEditor
