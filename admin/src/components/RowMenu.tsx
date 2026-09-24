'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

export type RowMenuItem = {
  label: string
  onSelect: () => void
  /** Destructive items are drawn in the danger colour and kept last. */
  destructive?: boolean
  disabled?: boolean
  hint?: string
}

/**
 * The secondary actions of a table row, behind one button.
 *
 * A row with four always-visible buttons — one of them a red "Suspend" — asks
 * the eye to read every action on every row, and puts the destructive one a
 * slip of the mouse away. The primary action stays on the row; the rest live
 * here. Follows the WAI-ARIA menu-button pattern: Enter/Space/ArrowDown open
 * it, arrows move, Escape closes and returns focus, a click outside closes.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLUListElement>(null)
  const id = useId()
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[active]?.focus()
  }, [open, active])

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus() }
  const move = (dir: 1 | -1) => {
    const pos = enabled.indexOf(active)
    setActive(enabled[(pos + dir + enabled.length) % enabled.length])
  }

  return (
    <div className="relative inline-block">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={() => { setActive(enabled[0] ?? 0); setOpen((o) => !o) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(enabled[0] ?? 0); setOpen(true) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(enabled[enabled.length - 1] ?? 0); setOpen(true) }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
      >
        <Icon name="more" size={16} />
      </button>
      {open ? (
        <ul
          ref={menu}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); close() }
            else if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
            else if (e.key === 'Home') { e.preventDefault(); setActive(enabled[0]) }
            else if (e.key === 'End') { e.preventDefault(); setActive(enabled[enabled.length - 1]) }
            else if (e.key === 'Tab') close(false)
          }}
          className="absolute right-0 top-9 z-30 min-w-[13rem] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-card-lg"
        >
          {items.map((it, i) => (
            <li key={it.label} role="none" className={it.destructive && i > 0 ? 'mt-1 border-t border-line-soft pt-1' : ''}>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={it.disabled}
                onClick={() => { close(); it.onSelect() }}
                className={`block w-full px-3.5 py-2 text-left text-label font-semibold outline-none transition-colors focus:bg-surface-alt disabled:opacity-50 ${it.destructive ? 'text-danger-strong' : 'text-content'} hover:bg-surface-alt`}
              >
                {it.label}
                {it.hint ? <span className="block text-caption font-normal text-content-muted">{it.hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
