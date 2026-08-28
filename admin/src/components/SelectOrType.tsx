'use client'

// ─────────────────────────────────────────────────────────────────────────────
// A dropdown that admits the list is not exhaustive.
//
// The listing form offered four body types — SUV, Sedan, Hatchback, Truck — and
// four fuel types. An admin publishing a wagon, a minibus, a convertible, or a
// plug-in hybrid had no honest option, so the field became a guess recorded as
// fact. Nothing in the database or the API constrains these columns; the limit
// was only ever the form.
//
// The typed value IS the value. It is not stored differently or marked as
// unusual, because "Minibus" is not a lesser answer than "SUV".
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

const OTHER = '__other__'

export function SelectOrType({
  label, value, onChange, options, required = false, placeholder = 'Type it in', id,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  options: readonly string[]
  required?: boolean
  placeholder?: string
  id?: string
}) {
  // A value that arrived from somewhere else — a prefill from the submission,
  // an existing listing — and is not in the list is already an "other" answer,
  // so the field opens showing it rather than appearing to have dropped it.
  const isCustom = Boolean(value) && !options.includes(value)
  const [typing, setTyping] = useState(isCustom)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (isCustom) setTyping(true) }, [isCustom])

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor={id}>
        {label}{required ? ' *' : ''}
      </label>
      <select
        id={id}
        value={typing ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            // Cleared on the way in: leaving the previous option in place would
            // mean choosing "Other" and saving without typing silently keeps
            // "SUV".
            setTyping(true)
            onChange('')
            setTimeout(() => inputRef.current?.focus(), 0)
          } else {
            setTyping(false)
            onChange(e.target.value)
          }
        }}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        <option value={OTHER}>Other — type it in…</option>
      </select>
      {typing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
        />
      ) : null}
    </div>
  )
}

export default SelectOrType
