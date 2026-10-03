'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardHeader, EmptyState, ErrorState, Icon, LoadingState, PageHeader } from '@/components/ui'
import { useConfirm, useToast } from '@/components/feedback'
import { fmtDate } from '@/lib/format'

// ─────────────────────────────────────────────────────────────────────────────
// Platform settings: the few things an operator changes, then the policy rails
// nobody can change from here.
//
// The page used to be one grid of cards in database order, locked and editable
// interleaved, keyed by raw names ("Inspection Min Minutes", `inquiry_only`),
// with number fields that saved the moment focus left them — tabbing past one
// changed a rule for every seller with no confirmation and no way back. Now a
// change is explicit (Save), confirmed with the old and new value side by side,
// and can be undone from the toast.
// ─────────────────────────────────────────────────────────────────────────────

type Row = { key: string; value: unknown; editable: boolean; description?: string }

/** Plain names and plain values for the keys the console knows. */
const NAMES: Record<string, { title: string; unit?: string; value?: (v: unknown) => string }> = {
  inspection_min_minutes: { title: 'Shortest believable inspection', unit: 'minutes' },
  listing_min_photos: { title: 'Photos needed to publish', unit: 'photos' },
  listing_recommended_photos: { title: 'Recommended photos per listing', unit: 'photos' },
  marketplace_mode: { title: 'Marketplace model', value: (v) => (v === 'verified_classifieds' ? 'Verified classifieds: buyers and sellers deal directly' : String(v)) },
  payments_enabled: { title: 'Online payments', value: (v) => (v ? 'On' : 'Off: Sawa never holds money') },
  guarantees_enabled: { title: 'Sawa guarantee', value: (v) => (v ? 'On' : 'Off: no transaction or return guarantee') },
  rental_mode: { title: 'Rentals', value: (v) => (v === 'inquiry_only' ? 'Inquiries only: providers confirm dates and terms' : String(v)) },
  inspection_required: { title: 'Inspection before publishing', value: (v) => (v ? 'Required' : 'Not required') },
  marketplace_terms_version: { title: 'Direct-deal terms in force', value: (v) => `Version of ${fmtDate(String(v))}` },
  app_release: { title: 'App release' },
  import_duty_rates: { title: 'Import duty rates' },
  service_rates: { title: 'Service prices' },
}

/** Settings edited on a page of their own. The three Korean-catalogue keys share one. */
const LINKED: { keys: string[]; title: string; description: string; href: string; action: string }[] = [
  { keys: ['service_rates'], title: 'Service prices', description: 'Walk-in inspections, report resale and rental listing subscriptions.', href: '/settings/rate-card', action: 'Edit service prices' },
  { keys: ['import_duty_rates'], title: 'Import duty rates', description: 'The Rwanda duty schedule the import calculator applies.', href: '/settings/duty', action: 'Edit duty rates' },
  { keys: ['app_release'], title: 'App release', description: 'Newest installable build per platform, the oldest still allowed, and the update stop switch.', href: '/settings/app-release', action: 'Edit app release' },
  { keys: ['encar_flags', 'encar_ingest_rules', 'encar_cost_inputs'], title: 'Korean catalogue', description: 'Whether it syncs and is public, which cars it keeps, and the exporter cost sheet.', href: '/imports/korea', action: 'Open Korean catalogue' },
]

const titleOf = (row: Row) => NAMES[row.key]?.title ?? row.key.replaceAll('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
const valueOf = (row: Row) => NAMES[row.key]?.value?.(row.value) ?? (typeof row.value === 'boolean' ? (row.value ? 'On' : 'Off') : String(row.value))

function NumberSetting({ row, onSave, busy }: { row: Row; onSave: (row: Row, value: number) => void; busy: boolean }) {
  const [draft, setDraft] = useState(String(row.value))
  useEffect(() => setDraft(String(row.value)), [row.value])
  const max = row.key === 'listing_min_photos' ? 10 : 20
  const n = Number(draft)
  const valid = Number.isInteger(n) && n >= 1 && n <= max
  const changed = valid && n !== row.value
  const unit = NAMES[row.key]?.unit
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => { e.preventDefault(); if (changed) onSave(row, n) }}
    >
      <input
        id={`setting-${row.key}`} type="number" inputMode="numeric" min={1} max={max}
        value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy}
        aria-describedby={`setting-${row.key}-hint`}
        className="tnum h-11 w-24 rounded-xl border border-line bg-surface px-3 text-body text-content focus:border-content-muted focus:outline-none"
      />
      {unit ? <span className="text-label text-content-muted">{unit}</span> : null}
      <button
        type="submit" disabled={!changed || busy}
        className="ml-auto h-11 rounded-xl bg-ink-900 px-4 text-label font-semibold text-white transition-opacity disabled:opacity-30"
      >
        {busy ? 'Saving…' : 'Save'}
      </button>
      {!valid ? <p className="w-full text-caption text-danger-strong">A whole number from 1 to {max}.</p> : null}
    </form>
  )
}

export default function PlatformSettingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [mail, setMail] = useState<Awaited<ReturnType<typeof api.mailStatus>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [working, setWorking] = useState<string | null>(null)
  const toast = useToast()
  const confirm = useConfirm()

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

  async function write(key: string, value: boolean | number) {
    setWorking(key)
    try { await api.updateSetting(key, value); await load(); return true }
    catch (e: any) { toast(e.message, 'error'); return false }
    finally { setWorking(null) }
  }

  async function change(row: Row, value: boolean | number) {
    const title = titleOf(row)
    const unit = NAMES[row.key]?.unit ? ` ${NAMES[row.key].unit}` : ''
    const before = typeof row.value === 'boolean' ? (row.value ? 'on' : 'off') : `${row.value}${unit}`
    const after = typeof value === 'boolean' ? (value ? 'on' : 'off') : `${value}${unit}`
    const ok = await confirm({
      title: `Change “${title}”?`,
      message: `From ${before} to ${after}. It applies to every seller and listing from now on, and is recorded in the activity history.`,
      confirmLabel: 'Change it',
    })
    if (!ok) return
    const previous = row.value as boolean | number
    if (await write(row.key, value)) {
      toast(`${title}: ${after}.`, 'success', {
        label: 'Undo',
        onClick: () => { void write(row.key, previous).then((done) => done && toast(`${title} is back to ${before}.`, 'info')) },
      })
    }
  }

  const linkedKeys = new Set(LINKED.flatMap((l) => l.keys))
  const editable = rows.filter((r) => r.editable && !linkedKeys.has(r.key))
  const locked = rows.filter((r) => !r.editable && !linkedKeys.has(r.key))
  const linked = LINKED.filter((l) => l.keys.some((k) => rows.some((r) => r.key === k)))

  return (
    <div>
      <PageHeader title="Platform settings" description="The rules every seller and listing follows. Policy rails are locked here and change only in a reviewed code release." />

      {/* Outbound email, stated rather than assumed. Every sender is
          fire-and-forget so a mail outage cannot break a signup, which also
          means an unconfigured server looks exactly like a working one. */}
      {mail ? (
        <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
          mail.configured ? 'border-line-soft bg-surface' : 'border-danger/30 bg-danger-tint'
        }`}>
          <Icon name={mail.configured ? 'check-circle' : 'alert'} size={18} className={mail.configured ? 'mt-0.5 text-success-text' : 'mt-0.5 text-danger-strong'} />
          <div className="min-w-0">
            <p className={`text-label font-bold ${mail.configured ? 'text-content' : 'text-danger-strong'}`}>
              {mail.configured ? `Email is sending through ${mail.provider === 'resend' ? 'Resend' : 'SMTP'}` : 'Email is not configured'}
            </p>
            <p className="mt-1 text-label text-content-secondary">{mail.detail}</p>
            <p className="mt-1 text-caption text-content-muted">Sending as {mail.from}</p>
          </div>
        </div>
      ) : null}

      {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState /> : !rows.length ? (
        <EmptyState icon="settings" title="No settings" description="The settings migration has not been applied." />
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="settings-editable" className="grid gap-4 md:grid-cols-2">
            <h2 id="settings-editable" className="sr-only">Settings you can change</h2>
            {editable.map((row) => (
              <Card key={row.key} className="flex flex-col p-5">
                <label htmlFor={`setting-${row.key}`} className="text-body font-bold text-content">{titleOf(row)}</label>
                <p id={`setting-${row.key}-hint`} className="mb-4 mt-1 text-label leading-relaxed text-content-muted">{row.description}</p>
                <div className="mt-auto">
                  {typeof row.value === 'number' ? (
                    <NumberSetting row={row} onSave={change} busy={working === row.key} />
                  ) : typeof row.value === 'boolean' ? (
                    <button
                      type="button" id={`setting-${row.key}`} role="switch" aria-checked={row.value}
                      disabled={working === row.key} onClick={() => change(row, !row.value)}
                      className="h-11 rounded-xl border border-line bg-surface px-4 text-label font-semibold text-content hover:border-content-muted disabled:opacity-40"
                    >
                      {row.value ? 'On · turn off' : 'Off · turn on'}
                    </button>
                  ) : <p className="text-label text-content-secondary">{valueOf(row)}</p>}
                </div>
              </Card>
            ))}
            {linked.map((l) => (
              <Card key={l.href} className="flex flex-col p-5">
                <h3 className="text-body font-bold text-content">{l.title}</h3>
                <p className="mb-4 mt-1 text-label leading-relaxed text-content-muted">{l.description}</p>
                <div className="mt-auto">
                  <Link href={l.href} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-label font-semibold text-content hover:border-content-muted">
                    {l.action} <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              </Card>
            ))}
          </section>

          {locked.length ? (
            <Card>
              <CardHeader title="Locked by policy" hint="Read-only. These keep Sawa out of every deal; changing one needs a reviewed code release." />
              <dl className="divide-y divide-line-soft">
                {locked.map((row) => (
                  <div key={row.key} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6">
                    <dt className="flex items-center gap-2 text-label font-semibold text-content">
                      <Icon name="lock" size={13} className="shrink-0 text-content-muted" aria-hidden />
                      {titleOf(row)}
                    </dt>
                    <dd className="text-label text-content-secondary">{valueOf(row)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
