import { Icon } from './Icon'

export function QueueSearch({ value, onChange, placeholder, resultCount }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  resultCount?: number
}) {
  return <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line-soft bg-surface p-3 shadow-card">
    <label className="relative min-w-0 flex-1"><span className="sr-only">Search this queue</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"><Icon name="search" size={16} /></span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-label text-content focus:border-content-muted focus:outline-none" />
      {value ? <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-content-muted hover:bg-surface-alt"><Icon name="close" size={14} /></button> : null}
    </label>
    {typeof resultCount === 'number' ? <span className="hidden shrink-0 text-caption font-semibold text-content-muted sm:block">{resultCount} result{resultCount === 1 ? '' : 's'}</span> : null}
  </div>
}
