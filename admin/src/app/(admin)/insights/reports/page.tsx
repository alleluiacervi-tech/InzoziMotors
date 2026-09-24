'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Insights · Reports & exports.
//
// Two monthly/periodic PDFs rendered on demand (no scheduler — see CLAUDE.md),
// and a CSV for every dataset the console holds, cut to the window above.
// Every download is written to Activity history. Exports never carry phone
// numbers, email addresses, ID documents or messages.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { api, downloadUrl, type ExportDataset, type RangeQuery } from '@/lib/api'
import { Icon, ErrorState, LoadingState } from '@/components/ui'
import { DownloadLink } from '@/components/charts'
import { InsightsShell, SectionTitle } from '@/components/InsightsShell'
import { fmtDate, fmtMonth, KIGALI } from '@/lib/format'

/** The last 24 Kigali calendar months, newest first, as YYYY-MM. */
function recentMonths(n = 24): string[] {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: KIGALI }))
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export default function ReportsPage() {
  return (
    <InsightsShell
      title="Reports & exports"
      description={() => 'Statements as PDF and every dataset as CSV. The window above sets the dates for the business report and the exports. Every download is recorded in Activity history.'}
    >
      {({ range }) => <Reports range={range} />}
    </InsightsShell>
  )
}

function windowSummary(r: RangeQuery) {
  if (r.from && r.to) return `${fmtDate(r.from)} to ${fmtDate(r.to)}`
  return r.days === 365 ? 'the last 12 months' : `the last ${r.days} days`
}

function Reports({ range }: { range: RangeQuery }) {
  const months = useMemo(() => recentMonths(), [])
  const [month, setMonth] = useState(months[1] ?? months[0])
  const [datasets, setDatasets] = useState<ExportDataset[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [hash, setHash] = useState('')
  const load = () => { setError(null); api.exportDatasets().then((r) => setDatasets(r.datasets)).catch(setError) }
  useEffect(load, [])
  useEffect(() => { setHash(window.location.hash.slice(1)) }, [])
  // The dataset cards arrive after the page does, so the browser's own jump to
  // #submissions found nothing to jump to. Scroll once they exist.
  useEffect(() => {
    if (!hash || !datasets) return
    document.getElementById(hash)?.scrollIntoView({ block: 'center' })
  }, [hash, datasets])

  return (
    <>
      <SectionTitle hint="Rendered when you ask for them. Nothing is emailed or stored.">Statements</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="flex flex-col rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary"><Icon name="receipt" size={18} /></span>
            <div>
              <h3 className="text-label font-extrabold text-content">Monthly revenue statement</h3>
              <p className="mt-1 text-caption leading-relaxed text-content-muted">Totals by revenue line, payment method and center, then every entry in the order it was collected. Reconciled to the same rule as the Revenue page. Kigali calendar month.</p>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-end gap-2 pt-5">
            <label className="text-caption font-semibold text-content-secondary">
              Month
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="mt-1 block h-10 rounded-xl border border-line bg-surface px-3 text-label text-content">
                {months.map((m) => <option key={m} value={m}>{fmtMonth(`${m}-01`)}{m === months[0] ? ' (so far)' : ''}</option>)}
              </select>
            </label>
            <DownloadLink href={downloadUrl.revenueStatement(month)} icon="document">Download PDF</DownloadLink>
          </div>
        </article>
        <article className="flex flex-col rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-content-secondary"><Icon name="chart-line" size={18} /></span>
            <div>
              <h3 className="text-label font-extrabold text-content">Business report</h3>
              <p className="mt-1 text-caption leading-relaxed text-content-muted">Supply, demand and money against the previous period, what is waiting right now, the seller funnel, inspection quality and centers. Choose 7 days above for a weekly report.</p>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <DownloadLink href={downloadUrl.businessReport(range)} icon="document">Download PDF</DownloadLink>
            <span className="text-caption text-content-muted">Covers {windowSummary(range)}</span>
          </div>
        </article>
      </div>

      <SectionTitle hint={`Cut to ${windowSummary(range)}. No phone numbers, email addresses, ID documents or messages are ever included; people appear by their Sawa ID and role.`}>CSV exports</SectionTitle>
      {error ? <ErrorState error={error} onRetry={load} /> : !datasets ? <LoadingState rows={4} /> : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {datasets.map((d) => (
            <li key={d.key} id={d.key}
              className={`flex flex-col rounded-2xl border bg-surface p-5 shadow-card ${hash === d.key ? 'border-data-1 ring-2 ring-data-1/30' : 'border-line-soft'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-label font-extrabold text-content">{d.label}</h3>
                  <p className="mt-1 text-caption leading-relaxed text-content-muted">{d.description}</p>
                </div>
                <DownloadLink href={downloadUrl.csv(d.key, range)} icon="file-spreadsheet">CSV</DownloadLink>
              </div>
              <details className="mt-3 text-caption text-content-muted">
                <summary className="cursor-pointer font-semibold text-content-secondary">{d.columns.length} columns · rows by date {d.windowed_by}</summary>
                <p className="mt-2 leading-relaxed">{d.columns.join(' · ')}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
