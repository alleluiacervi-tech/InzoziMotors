'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Icon } from './Icon'

// ─────────────────────────────────────────────────────────────────────────────
// Toast + Confirm — replacements for the 30 alert()/window.confirm() calls that
// used to punctuate the dashboard.
//
// Why they had to go, beyond taste: alert() freezes the whole tab (every other
// row's buttons die while one is open), the browser chrome styles it (so the
// same failure looks different in Chrome and Safari, and nothing like the rest
// of the tool), and window.confirm() offers exactly the strings "OK" and
// "Cancel" — so "Mark this handover COMPLETE?" was answered with a word that
// names neither the action nor its consequence.
//
// The replacements keep the two properties that actually mattered:
//   • confirm() is still awaitable — `if (!(await confirm({...}))) return`
//     drops into the same line the window.confirm() call occupied.
//   • toast() is fire-and-forget — no state to add to a page that just wants
//     to say "that failed".
// ─────────────────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'error' | 'info'

type ConfirmOptions = {
  title: string
  /** One sentence on the consequence — what happens, to whom, reversible or not. */
  message: string
  /** Names the action ("Waive fee", "Mark sold") — never "OK". */
  confirmLabel: string
  cancelLabel?: string
  /** 'danger' paints the button red for the destructive/irreversible ones. */
  tone?: 'primary' | 'danger'
}

/** One button on a toast, e.g. Undo. Clicking it runs `onClick` and closes the toast. */
type ToastAction = { label: string; onClick: () => void }

type ReasonOptions = {
  title: string
  /** What happens once the reason is given. */
  message?: string
  /** Who reads the reason, said plainly ("The buyer sees this"). */
  audience: string
  confirmLabel: string
  /** Fewer characters than this cannot be submitted. */
  minLength?: number
  placeholder?: string
  tone?: 'primary' | 'danger'
}

type FeedbackApi = {
  toast: (message: string, tone?: ToastTone, action?: ToastAction) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Asks for a written reason. Resolves to the trimmed text, or null if cancelled. */
  reason: (options: ReasonOptions) => Promise<string | null>
}

const FeedbackContext = createContext<FeedbackApi | null>(null)

export function useToast(): FeedbackApi['toast'] {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useToast must be used inside <FeedbackProvider>')
  return ctx.toast
}

export function useConfirm(): FeedbackApi['confirm'] {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useConfirm must be used inside <FeedbackProvider>')
  return ctx.confirm
}

export function useReason(): FeedbackApi['reason'] {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useReason must be used inside <FeedbackProvider>')
  return ctx.reason
}

// ─── Toast stack ─────────────────────────────────────────────────────────────

type ToastItem = { id: number; message: string; tone: ToastTone; action?: ToastAction }

// Errors linger twice as long: a success is confirmation of something the
// operator just did, an error is news they have to act on.
const TOAST_MS: Record<ToastTone, number> = { success: 4000, info: 5000, error: 8000 }

const TOAST_STYLE: Record<ToastTone, { box: string; icon: string; name: 'check' | 'alert' | 'info' }> = {
  success: { box: 'border-success/30', icon: 'bg-success-tint text-success-text', name: 'check' },
  error: { box: 'border-danger-strong/30', icon: 'bg-danger-tint text-danger-strong', name: 'alert' },
  info: { box: 'border-line', icon: 'bg-surface-alt text-content-secondary', name: 'info' },
}

function ToastStack({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => {
        const s = TOAST_STYLE[t.tone]
        return (
          <div
            key={t.id}
            // alert for errors so screen readers interrupt; polite otherwise.
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-card-lg ${s.box}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.icon}`}>
              <Icon name={s.name} size={15} />
            </span>
            <p className="min-w-0 flex-1 pt-0.5 text-label leading-snug text-content">{t.message}</p>
            {t.action ? (
              <button
                type="button"
                onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                className="shrink-0 rounded-lg px-2.5 py-1 text-label font-bold text-content underline decoration-line underline-offset-4 hover:decoration-content"
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 text-content-muted transition-colors hover:bg-surface-alt hover:text-content"
              aria-label="Dismiss"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

type PendingConfirm = { options: ConfirmOptions; resolve: (answer: boolean) => void }

function ConfirmDialog({ pending, answer }: { pending: PendingConfirm; answer: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const { title, message, confirmLabel, cancelLabel = 'Cancel', tone = 'primary' } = pending.options

  // Focus lands on the confirming button so Enter completes the action the
  // operator just asked for — matching how window.confirm() behaved, minus the
  // frozen tab. Escape is the other half of that contract.
  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') answer(false)
      if (e.key === 'Tab' && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        if (!controls.length) return
        const first = controls[0], last = controls[controls.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={() => answer(false)}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm rounded-2xl border border-line-soft bg-surface p-5 shadow-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="confirm-title" className="text-body font-bold text-content">{title}</p>
        <p id="confirm-message" className="mt-1.5 text-label leading-relaxed text-content-secondary">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(false)}
            className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-3.5 text-label font-semibold text-content-secondary transition-colors hover:border-content-muted hover:text-content"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => answer(true)}
            className={`inline-flex h-9 items-center rounded-xl px-3.5 text-label font-semibold text-white transition-colors ${
              tone === 'danger'
                ? 'bg-danger-strong hover:bg-danger-strong/90'
                : 'bg-ink-900 hover:bg-ink-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reason dialog ───────────────────────────────────────────────────────────
// Replaces window.prompt(): one unstyled line with no minimum and no hint of
// who would read it, used for text a buyer or seller receives.

type PendingReason = { options: ReasonOptions; resolve: (answer: string | null) => void }

function ReasonDialog({ pending, answer }: { pending: PendingReason; answer: (text: string | null) => void }) {
  const { title, message, audience, confirmLabel, minLength = 10, placeholder, tone = 'primary' } = pending.options
  const [text, setText] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const trimmed = text.trim()
  const short = trimmed.length < minLength

  useEffect(() => {
    areaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') answer(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => answer(null)}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-title"
        aria-describedby="reason-audience"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (!short) answer(trimmed) }}
        className="w-full max-w-md rounded-2xl border border-line-soft bg-surface p-5 shadow-card-lg"
      >
        <p id="reason-title" className="text-body font-bold text-content">{title}</p>
        {message ? <p className="mt-1.5 text-label leading-relaxed text-content-secondary">{message}</p> : null}
        <label htmlFor="reason-text" className="mt-4 block text-label font-semibold text-content">Reason</label>
        <p id="reason-audience" className="mt-0.5 text-caption text-content-muted">{audience}</p>
        <textarea
          id="reason-text"
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !short) answer(trimmed) }}
          rows={4}
          maxLength={500}
          placeholder={placeholder}
          aria-describedby="reason-audience reason-count"
          className="mt-2 w-full resize-y rounded-xl border border-line bg-surface p-3 text-body text-content focus:border-content-muted focus:outline-none"
        />
        <p id="reason-count" className="mt-1 text-caption text-content-muted">
          {short ? `At least ${minLength} characters (${trimmed.length} so far)` : `${trimmed.length} / 500`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => answer(null)}
            className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-label font-semibold text-content-secondary transition-colors hover:border-content-muted hover:text-content"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={short}
            className={`inline-flex h-10 items-center rounded-xl px-4 text-label font-semibold text-white transition-colors disabled:opacity-40 ${
              tone === 'danger' ? 'bg-danger-strong hover:bg-danger-strong/90' : 'bg-ink-900 hover:bg-ink-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Provider ────────────────────────────────────────────────────────────────

let nextToastId = 1

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [pendingReason, setPendingReason] = useState<PendingReason | null>(null)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, tone: ToastTone = 'info', action?: ToastAction) => {
    const id = nextToastId++
    setToasts((prev) => [...prev.slice(-3), { id, message, tone, action }])
    // A toast that offers Undo stays long enough to reach for it.
    window.setTimeout(() => dismiss(id), action ? 10000 : TOAST_MS[tone])
  }, [dismiss])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // A second confirm while one is open answers the first with "no" rather
      // than silently dropping either — the pages disable their buttons during
      // actions, so this is a belt for a strap that already exists.
      setPending((prev) => {
        prev?.resolve(false)
        return { options, resolve }
      })
    })
  }, [])

  const answer = useCallback((ok: boolean) => {
    setPending((prev) => {
      prev?.resolve(ok)
      return null
    })
  }, [])

  const reason = useCallback((options: ReasonOptions) => {
    return new Promise<string | null>((resolve) => {
      setPendingReason((prev) => {
        prev?.resolve(null)
        return { options, resolve }
      })
    })
  }, [])

  const answerReason = useCallback((text: string | null) => {
    setPendingReason((prev) => {
      prev?.resolve(text)
      return null
    })
  }, [])

  return (
    <FeedbackContext.Provider value={{ toast, confirm, reason }}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
      {pending ? <ConfirmDialog pending={pending} answer={answer} /> : null}
      {pendingReason ? <ReasonDialog pending={pendingReason} answer={answerReason} /> : null}
    </FeedbackContext.Provider>
  )
}
