'use client'

import { createContext, useContext } from 'react'
import type { IconName } from './Icon'

// The shell knows which destination is open, so it hands that row's glyph to
// every PageHeader below it. A page never repeats the sidebar's choice of icon,
// and the two can never disagree.
export const PageIconContext = createContext<IconName | undefined>(undefined)

export function usePageIcon(): IconName | undefined {
  return useContext(PageIconContext)
}
