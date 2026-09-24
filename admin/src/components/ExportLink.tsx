import Link from 'next/link'
import { Icon } from './Icon'

/**
 * "Export CSV" on a table page. It opens the dataset on Reports & exports,
 * where the window is chosen and the download is audit-logged, rather than
 * exporting whatever this page happens to have loaded (often the newest 100).
 */
export function ExportLink({ dataset }: { dataset: string }) {
  return (
    <Link
      href={`/insights/reports?days=90#${dataset}`}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-label font-bold text-content transition-colors hover:bg-surface-alt"
    >
      <Icon name="file-spreadsheet" size={15} />
      Export CSV
    </Link>
  )
}
