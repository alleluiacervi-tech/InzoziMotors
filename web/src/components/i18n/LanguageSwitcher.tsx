'use client'

// Language switcher — a flag-led dropdown.
//
// The flag emoji renders on most mobile browsers and macOS; where it does not
// (Windows), the language code carries the meaning, so the button always shows
// the code too. Selecting a language writes the cookie and refreshes the page's
// server-rendered strings (see LanguageProvider).
import { useEffect, useRef, useState } from 'react'
import { LANGUAGES } from '@/lib/i18n/config'
import { useLocale } from '@/lib/i18n/context'
import { useT } from '@/lib/i18n/context'
import { Icon } from '@/components/ui'

export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { locale, setLocale } = useLocale()
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerTone =
    tone === 'dark'
      ? 'border-white/20 text-white hover:bg-white/10'
      : 'border-line text-content hover:bg-surface-alt'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-colors ${triggerTone}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
      >
        <span aria-hidden className="text-[15px] leading-none">
          {current.flag}
        </span>
        <span className="uppercase tracking-wide">{current.code}</span>
        <Icon name="chevron-down" size={14} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t('common.chooseLanguage')}
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-card-lg"
        >
          {LANGUAGES.map((lang) => {
            const selected = lang.code === locale
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setLocale(lang.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-alt ${
                  selected ? 'bg-surface-alt' : ''
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {lang.flag}
                </span>
                <span className="flex-1">
                  <span className="block text-caption font-semibold text-content">
                    {lang.nativeLabel}
                  </span>
                  {lang.nativeLabel !== lang.label ? (
                    <span className="block text-micro text-content-muted">{lang.label}</span>
                  ) : null}
                </span>
                {selected ? <Icon name="check" size={16} className="text-brand" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default LanguageSwitcher
