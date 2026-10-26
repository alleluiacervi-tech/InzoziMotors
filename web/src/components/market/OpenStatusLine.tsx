'use client'

import { useEffect, useState } from 'react'
import { openStatus, type OpenStatus, type OpenStatusLabels } from '@/lib/showroom-hours'
import type { BusinessHours } from '@/lib/types'

const DOT: Record<OpenStatus['tone'], string> = {
  open: 'bg-success',
  soon: 'bg-warning',
  closed: 'bg-content-muted',
}

/**
 * "Open · Closes at 21:00", worked out in the browser after it loads and every
 * minute after, never on the server: a cached page must not keep saying "open"
 * after closing time. Labels come from the server so the line works under any
 * route's translation scope.
 */
export function OpenStatusLine({
  hours, labels, className = '',
}: {
  hours: BusinessHours | null | undefined
  labels: OpenStatusLabels
  className?: string
}) {
  const [status, setStatus] = useState<OpenStatus | null>(null)
  useEffect(() => {
    const tick = () => setStatus(openStatus(hours))
    tick()
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [hours])

  if (!status) return null
  const text = labels[status.key]
    .replace('{{time}}', status.time)
    .replace('{{day}}', status.day ? labels.days[status.day] : '')
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT[status.tone]}`} />
      <span className="truncate">{text}</span>
    </span>
  )
}
