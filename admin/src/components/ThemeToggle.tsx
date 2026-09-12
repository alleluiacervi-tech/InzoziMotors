'use client'

import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sawa-admin-theme'

/**
 * Light/dark switch for the console header.
 *
 * The theme is already resolved and applied by the inline script in the root
 * layout before first paint, so this only reads back what that decided, flips
 * it, and remembers the choice. It renders a same-size placeholder until
 * mounted: the server cannot know the operator's OS preference, so painting a
 * real glyph server-side would guarantee a hydration mismatch half the time.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  // An operator who never chose explicitly should still follow the OS if it
  // changes while the console is open — which it does, on a schedule, at dusk.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return
      } catch {
        // Storage blocked. Following the OS is what we would have done with
        // no stored value anyway.
      }
      document.documentElement.classList.toggle('dark', event.matches)
      setTheme(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const base =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-content-muted ' +
    'transition-colors hover:bg-surface-alt hover:text-content'

  if (theme === null) return <span className={base} aria-hidden />

  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => {
        const next: Theme = isDark ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', next === 'dark')
        setTheme(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Applies for this page view; simply will not survive a reload.
        }
      }}
      className={base}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={17} />
    </button>
  )
}

export default ThemeToggle
