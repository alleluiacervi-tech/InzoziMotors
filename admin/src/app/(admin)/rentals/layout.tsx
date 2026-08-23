'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SUB_NAV = [
  { href: '/rentals/inquiries', label: 'Inquiries' },
  { href: '/rentals/fleet',     label: 'Provider inventory' },
]

export default function RentalsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Rental marketplace</h1>
          <p className="mt-1 text-xs text-gray-500">Providers confirm availability, terms and payment directly with renters.</p>
        </div>
        <div className="flex gap-1">
          {SUB_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                pathname === href
                  ? 'bg-brand text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
