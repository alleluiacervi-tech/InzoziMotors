'use client'

import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'sawa-theme'

/**
 * Light/dark switch for the header.
 *
 * The theme is already resolved and applied by the inline script in
 * layout.tsx before first paint, so this component's only jobs are to read
 * back what that script decided, flip it, and remember the choice. It renders
 * a stable placeholder until mounted: the server cannot know the visitor's OS
 * preference, so rendering the real icon on the server would guarantee a
 * hydration mismatch on half of all visits.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  // A visitor who never chose explicitly should still follow their OS if they
  // change it while the tab is open.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return
      } catch {
        // Private mode with storage blocked — follow the OS, which is the
        // same thing we would have done with no stored value.
      }
      const next: Theme = event.matches ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', event.matches)
      setTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable. The theme still applies for this page view;
      // it simply will not survive a reload.
    }
  }

  const isDark = theme === 'dark'
  const base =
    'inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors ' +
    'hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-brand'

  if (theme === null) {
    // Same box, no glyph — reserves the space so the header does not reflow.
    return <span className={`${base} ${className}`} aria-hidden />
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${base} ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

export default ThemeToggle
