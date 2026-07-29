'use client'

import { useState } from 'react'
import { Icon, LiveRegion } from '@/components/ui'

// The code itself is minted server-side (referrals.mine creates it on first
// request) — this only displays and copies it. Never generate one here.

export function ReferralCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard is blocked in some in-app browsers; the code is on screen
      // and selectable, so there is nothing to recover from.
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="select-all rounded-xl border border-dashed border-line bg-surface px-5 py-4 text-center text-[22px] font-extrabold tracking-[0.12em] text-content">
        {code}
      </p>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-caption font-bold text-content-secondary transition-colors hover:border-content-muted hover:bg-surface-alt hover:text-content"
      >
        <Icon name={copied ? 'check' : 'document'} size={16} />
        {copied ? 'Copied' : 'Copy code'}
      </button>
      <LiveRegion>{copied ? 'Referral code copied to clipboard.' : ''}</LiveRegion>
    </div>
  )
}

export default ReferralCode
