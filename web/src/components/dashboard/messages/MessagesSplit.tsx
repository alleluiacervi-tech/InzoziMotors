'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Two panes from lg up; one at a time on a phone. The list shows at
// /dashboard/messages, the conversation at /dashboard/messages/[id].
export function MessagesSplit({ list, children }: { list: ReactNode; children: ReactNode }) {
  const pathname = usePathname() || ''
  const inThread = /^\/dashboard\/messages\/[^/]+/.test(pathname)

  return (
    <div className={`flex bg-surface lg:h-full ${inThread ? 'h-full' : ''}`}>
      <section
        className={`w-full flex-col border-line-soft lg:flex lg:h-full lg:w-[360px] lg:shrink-0 lg:border-r xl:w-[400px] ${
          inThread ? 'hidden' : 'flex'
        }`}
      >
        {list}
      </section>
      <section className={`h-full min-w-0 flex-1 flex-col ${inThread ? 'flex' : 'hidden lg:flex'}`}>
        {children}
      </section>
    </div>
  )
}

export default MessagesSplit
