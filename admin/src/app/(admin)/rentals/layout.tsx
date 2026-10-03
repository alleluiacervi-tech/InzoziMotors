'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PageHeader } from '@/components/ui'

const SUB_NAV = [
  { href: '/rentals/inquiries', label: 'Inquiries' },
  { href: '/rentals/fleet',     label: 'Inventory' },
]

export default function RentalsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <PageHeader
        title="Rentals"
        description="Inquiries only: providers confirm availability, terms and payment directly with renters."
        action={
        <nav aria-label="Rentals" className="flex gap-1">
          {SUB_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`inline-flex h-10 items-center rounded-lg px-4 text-label font-semibold transition-colors ${
                pathname === href
                  ? 'bg-ink-900 text-white'
                  : 'bg-surface text-gray-600 border border-gray-200 hover:border-content-muted'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        }
      />
      {children}
    </div>
  )
}
