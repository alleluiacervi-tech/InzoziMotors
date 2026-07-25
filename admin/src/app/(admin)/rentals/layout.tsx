'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SUB_NAV = [
  { href: '/rentals',       label: 'Bookings' },
  { href: '/rentals/fleet', label: 'Fleet' },
]

export default function RentalsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">Rentals</h1>
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
