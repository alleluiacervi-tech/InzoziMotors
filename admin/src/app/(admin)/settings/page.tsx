'use client'

import Link from 'next/link'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/ui'
import { useToast } from '@/components/feedback'

export default function PlatformSettingsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [mail, setMail] = useState<Awaited<ReturnType<typeof api.mailStatus>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [working, setWorking] = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    setLoading(true); setError(null)
    try {
      const [settings, mail] = await Promise.all([api.settings(), api.mailStatus().catch(() => null)])
      setRows(settings)
      setMail(mail)
    }
    catch (e) { setError(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function update(key: string, value: boolean | number) {
    setWorking(key)
    try { await api.updateSetting(key, value); await load(); toast('Setting updated and audited.', 'success') }
    catch (e: any) { toast(e.message, 'error') }
    finally { setWorking(null) }
  }

  return (
    <div>
      <PageHeader title="Platform settings" description="Operational controls and locked marketplace policy rails." />
      <div className="mb-6 rounded-xl border border-info/20 bg-info-tint p-4 text-sm text-content-secondary">
        Marketplace mode, payments, guarantees and rental inquiry mode are locked. Changing those policies requires a reviewed code release, not a dashboard toggle.
      </div>
      {/* Outbound email, stated rather than assumed.
          Every sender is fire-and-forget so a mail outage cannot break a
          signup — which also means an unconfigured server looks exactly like a
          working one. Production ran that way unnoticed; this is the fix. */}
      {mail ? (
        <div className={`mb-6 rounded-xl border p-4 ${
          mail.configured ? 'border-success/25 bg-success-tint' : 'border-danger/30 bg-danger-tint'
        }`}>
          <p className={`text-label font-bold ${mail.configured ? 'text-success-text' : 'text-danger-strong'}`}>
            {mail.configured
              ? `Email is configured — ${mail.provider === 'resend' ? 'Resend' : 'SMTP'}`
              : 'Email is NOT configured'}
          </p>
          <p className="mt-1 text-label text-content-secondary">{mail.detail}</p>
          <p className="mt-1 text-caption text-content-muted">Sending as {mail.from}</p>
        </div>
      ) : null}

      {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState /> : !rows.length ? <EmptyState icon="settings" title="No settings" description="The settings migration has not been applied." /> : (
        <div className="grid gap-4 md:grid-cols-2">{rows.map((row) => (
          <Card key={row.key} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-sm font-bold capitalize text-content">{row.key.replaceAll('_', ' ')}</h2><p className="mt-1 text-xs leading-5 text-content-muted">{row.description}</p></div>
              <span className={`rounded-full px-2 py-1 text-micro font-bold ${row.editable ? 'bg-success-tint text-success' : 'bg-gray-100 text-gray-600'}`}>{row.editable ? 'Editable' : 'Locked'}</span>
            </div>
            <div className="mt-5">
              {typeof row.value === 'boolean' ? (
                <button disabled={!row.editable || working === row.key} onClick={() => update(row.key, !row.value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${row.value ? 'bg-success text-white' : 'bg-gray-200 text-gray-700'} disabled:cursor-not-allowed disabled:opacity-60`}>{row.value ? 'Enabled' : 'Disabled'}</button>
              ) : typeof row.value === 'number' ? (
                <input type="number" min="1" max={row.key === 'listing_min_photos' ? 10 : 20} defaultValue={row.value} disabled={!row.editable || working === row.key} onBlur={(event) => { const value = Number(event.target.value); if (value !== row.value) update(row.key, value) }} className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100" />
              ) : row.key === 'import_duty_rates' ? (
                /* An object rendered through String() reads "[object Object]".
                   It gets a real form of its own instead. */
                <Link href="/settings/duty" className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800">
                  Edit duty rates
                </Link>
              ) : <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{String(row.value)}</code>}
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  )
}
