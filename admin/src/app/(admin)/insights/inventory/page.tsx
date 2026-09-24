'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Insights · Inventory. What is live now, how it is priced and aged, and the
// listings nobody is asking about. Stock figures are a snapshot of today; the
// window applies to price drops, days on market and marked-sold value.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { api, type InsightsInventory, type RangeQuery } from '@/lib/api'
import { fmtMoney, fmtMoneyShort } from '@/components/ui'
import { BarList, ChartFrame, ColumnChart, DataTable, KpiTile } from '@/components/charts'
import { InsightsShell, SectionTitle, Windowed, useWindowed } from '@/components/InsightsShell'
import { fmtDate, fmtInt } from '@/lib/format'

const AGE_LABEL: Record<string, string> = { '0-7': 'Up to a week', '8-30': '8–30 days', '31-60': '31–60 days', '61-90': '61–90 days', '90+': 'Over 90 days', unknown: 'Not recorded' }

const millions = (n: number) => `${Math.round(n / 1_000_000)}M`
const bandLabel = (b: { min: number | null; max: number | null }) =>
  b.min == null ? `Up to ${millions(b.max ?? 0)}`
    : b.max == null ? `Over ${millions(b.min - 1)}`
      : `${millions(b.min - 1)}–${millions(b.max)}`

export default function InventoryPage() {
  return (
    <InsightsShell
      title="Inventory"
      description={() => 'Live stock by make, body, price and age, and the listings that have gone quiet. Stock is counted as of now; the window applies to sales and price changes.'}
    >
      {({ range }) => <Inventory range={range} />}
    </InsightsShell>
  )
}

function Inventory({ range }: { range: RangeQuery }) {
  const state = useWindowed(api.insightsInventory, range)
  return <Windowed state={state}>{(d) => <Body d={d} />}</Windowed>
}

function Body({ d }: { d: InsightsInventory }) {
  const kpi = (label: string, value: string, hint?: string, href?: string) => (
    <KpiTile label={label} value={value} current={0} periodLabel="" compare={false} hint={hint} href={href} />
  )
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpi('Live listings', fmtInt(d.live_total), 'Public right now', '/listings')}
        {kpi('Gone quiet', fmtInt(d.stale.length), 'Live over 14 days with no save or contact request in the last 14')}
        {kpi('Median days on market', d.median_days_on_market == null ? '—' : `${d.median_days_on_market} d`, 'Publication to marked sold, for listings sold in the window')}
        {kpi('Price reductions', fmtInt(d.price_drops), 'Listings whose price went down in the window')}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartFrame title="Live stock by make" hint="The twelve makes with the most live listings"
          table={{ columns: [{ key: 'key', label: 'Make' }, { key: 'count', label: 'Live listings', align: 'right' }], rows: d.by_make }}>
          <BarList items={d.by_make.map((r) => ({ key: r.key, label: r.key, value: r.count }))} emptyLabel="No live listings" />
        </ChartFrame>
        <div className="grid min-w-0 gap-5">
          <ChartFrame title="Live stock by price" hint="Bands match the budget shortcuts on the public homepage (RWF)"
            table={{ columns: [{ key: 'label', label: 'Band' }, { key: 'count', label: 'Live listings', align: 'right' }], rows: d.by_price.map((b) => ({ label: bandLabel(b), count: b.count })) }}>
            <ColumnChart label="Live listings by price band" items={d.by_price.map((b, i) => ({ key: String(i), label: bandLabel(b), value: b.count }))} height={170} />
          </ChartFrame>
          <ChartFrame title="Live stock by age" hint="Days since publication"
            table={{ columns: [{ key: 'label', label: 'Age' }, { key: 'count', label: 'Live listings', align: 'right' }], rows: d.by_age.map((b) => ({ label: AGE_LABEL[b.key] || b.key, count: b.count })) }}>
            <ColumnChart label="Live listings by age" items={d.by_age.map((b) => ({ key: b.key, label: AGE_LABEL[b.key] || b.key, value: b.count, muted: b.key === 'unknown' }))} height={170}
              flag={{ keys: ['61-90', '90+'], text: 'Listings over 60 days old may need a price review with the seller' }} />
          </ChartFrame>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_2fr]">
        <ChartFrame title="Live stock by body type"
          table={{ columns: [{ key: 'key', label: 'Body' }, { key: 'count', label: 'Live listings', align: 'right' }], rows: d.by_body }}>
          <BarList items={d.by_body.map((r) => ({ key: r.key, label: r.key, value: r.count }))} tone={2} emptyLabel="No live listings" />
        </ChartFrame>
        <section aria-labelledby="quiet-title" className="min-w-0 rounded-2xl border border-line-soft bg-surface p-5 shadow-card">
          <h2 id="quiet-title" className="text-label font-extrabold text-content">Listings that have gone quiet</h2>
          <p className="mb-4 mt-0.5 text-caption text-content-muted">Live for more than 14 days with no save and no contact request in the last 14. A price review with the seller helps these most. Oldest first.</p>
          {d.stale.length ? (
            <DataTable caption="Listings that have gone quiet" rows={d.stale} columns={[
              { key: 'title', label: 'Listing', format: (v, r) => <Link href={`/listings/${r.id}/edit`} className="font-semibold text-content hover:underline">{v}</Link> },
              { key: 'price', label: 'Price', align: 'right', format: (v) => fmtMoney(v, 'RWF') },
              { key: 'days_live', label: 'Days live', align: 'right' },
              { key: 'views', label: 'Views', align: 'right', format: (v) => fmtInt(v) },
              { key: 'listed_at', label: 'Published', format: (v) => fmtDate(v) },
            ]} />
          ) : <p className="py-8 text-center text-label text-content-muted">Every live listing has had a save or a contact request in the last 14 days.</p>}
        </section>
      </div>

      <SectionTitle hint="Reported by sellers when they mark a listing sold. It is not a verified sale price and it is never Sawa revenue: Sawa is not a party to any sale.">Seller-reported outcomes</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpi('Asking value of listings marked sold', fmtMoneyShort(d.sold_asking_value_rwf, 'RWF'), `${fmtMoney(d.sold_asking_value_rwf, 'RWF')} in asking prices, in the window`)}
      </div>
    </>
  )
}
