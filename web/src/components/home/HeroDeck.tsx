'use client'

import { useState } from 'react'
import Image, { StaticImageData } from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui'
import type { Car } from '@/lib/types'
import { formatKm, formatMoney } from '@/lib/business'

interface HeroDeckProps {
  cars: Car[]
  slides: Array<{
    image: StaticImageData | string
    alt: string
    headline: string
    caption: string
    href: string
    cta: string
  }>
  translations: {
    eyebrow: string
    title: string
    subtitle: string
    stockEyebrow: string
    stockAll: string
  }
}

type TabKey = 'buy' | 'vin' | 'sell' | 'import'

export function HeroDeck({ cars, slides, translations }: HeroDeckProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('buy')
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  
  // Buy form state
  const [query, setQuery] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  
  // VIN check state
  const [vinInput, setVinInput] = useState('')
  const [vinError, setVinError] = useState('')

  const activeSlide = slides[currentSlideIndex] || slides[0]

  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (bodyType) params.set('body_type', bodyType)
    if (maxPrice) params.set('max_price', maxPrice)
    router.push(`/cars?${params.toString()}`)
  }

  const handleVinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = vinInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!cleaned) {
      setVinError('Please enter a valid 17-character VIN or Japanese Chassis number.')
      return
    }
    if (cleaned.length < 9) {
      setVinError('Identifier must be at least 9 characters (Chassis or 17-char VIN).')
      return
    }
    setVinError('')
    router.push(`/vehicles/lookup?vin=${encodeURIComponent(cleaned)}`)
  }

  return (
    <section className="relative -mt-[var(--header-h)] flex min-h-[100svh] items-end overflow-hidden bg-ink-900">
      {/* 100% Real-Camera Background Image Stage with smooth Ken Burns animation */}
      <div className="absolute inset-0 z-0">
        {activeSlide?.image ? (
          <Image
            key={currentSlideIndex}
            src={activeSlide.image}
            alt={activeSlide.alt}
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover transition-opacity duration-1000"
            {...(typeof activeSlide.image !== 'string' ? { placeholder: 'blur' as const } : {})}
          />
        ) : null}
      </div>

      {/* Atmospheric Scrims — obsidian charcoal gradient ensuring flawless contrast */}
      <div className="absolute inset-0 z-1 bg-gradient-to-t from-ink-900 via-ink-900/60 to-ink-900/30" />
      <div className="absolute inset-x-0 top-0 z-1 h-48 bg-gradient-to-b from-ink-900/80 to-transparent" />

      {/* Main Hero Container */}
      <div className="relative z-10 mx-auto grid w-full max-w-content items-end gap-10 px-5 pb-14 pt-32 sm:px-8 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_392px] lg:gap-14 lg:px-12">
        
        {/* Left Column: Headline, Real-Camera Photo Selector, and Multi-Intent Command Deck */}
        <div className="max-w-2xl text-white">
          
          {/* Eyebrow and Trust Pills */}
          <div className="mb-4 flex flex-wrap items-center gap-2 animate-fade-up">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-micro font-bold uppercase tracking-wider text-white backdrop-blur-md">
              {translations.eyebrow}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-micro font-bold text-emerald-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              150-Point Certified Standard
            </span>
          </div>

          <h1 className="animate-fade-up text-display-lg sm:text-display-xl font-extrabold tracking-tight leading-[1.08]">
            {translations.title}
          </h1>

          <p className="mt-4 max-w-xl animate-fade-up text-title-sm sm:text-title leading-relaxed text-white/85">
            {translations.subtitle}
          </p>

          {/* Real-Camera Perspective Switcher */}
          <div className="mt-6 flex flex-wrap items-center gap-2 animate-fade-up">
            <span className="text-micro font-semibold uppercase tracking-wider text-white/60 mr-1">
              Verified Perspective:
            </span>
            {slides.map((slide, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-micro font-semibold transition-all ${
                  currentSlideIndex === idx
                    ? 'border border-brand-bright bg-brand text-white shadow-brand'
                    : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {idx === 0 && <Icon name="car" size={12} />}
                {idx === 1 && <Icon name="gauge" size={12} />}
                {idx === 2 && <Icon name="shield-check" size={12} />}
                {idx === 3 && <Icon name="compass" size={12} />}
                <span>
                  {idx === 0 ? 'Architectural Pavilion' : idx === 1 ? '150-Pt Diagnostic Bay' : idx === 2 ? 'Physical Certified Lot' : 'Grand-Touring Drive'}
                </span>
              </button>
            ))}
          </div>

          {/* Multi-Intent Command Deck */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-ink-900/80 shadow-2xl backdrop-blur-xl animate-fade-up">
            
            {/* Segmented Intent Selector Tabs */}
            <div className="flex border-b border-white/10 bg-white/[0.04] p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('buy')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-caption font-bold transition-all ${
                  activeTab === 'buy'
                    ? 'bg-white text-ink-900 shadow-md'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name="search" size={14} />
                <span>Buy Certified</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vin')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-caption font-bold transition-all ${
                  activeTab === 'vin'
                    ? 'bg-white text-ink-900 shadow-md'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name="shield-check" size={14} />
                <span className="flex items-center gap-1.5">
                  VIN History
                  <span className="hidden sm:inline-block rounded-full bg-brand px-1.5 py-0.2 text-[10px] font-extrabold text-white uppercase">
                    Free
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sell')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-caption font-bold transition-all ${
                  activeTab === 'sell'
                    ? 'bg-white text-ink-900 shadow-md'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name="car" size={14} />
                <span>Sell with Sawa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-caption font-bold transition-all ${
                  activeTab === 'import'
                    ? 'bg-white text-ink-900 shadow-md'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon name="compass" size={14} />
                <span>Direct Import</span>
              </button>
            </div>

            {/* Tab 1: Buy Certified Form */}
            {activeTab === 'buy' && (
              <form onSubmit={handleBuySubmit} className="p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-ink-900 shadow-inner">
                    <Icon name="search" size={18} className="text-content-muted" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search Toyota Prado, Land Cruiser, RAV4, Mercedes…"
                      className="h-10 w-full bg-transparent text-body font-medium text-ink-900 placeholder:text-content-muted outline-none"
                    />
                  </div>

                  <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                    <label className="block text-[11px] font-semibold text-white/70 uppercase">Body Type</label>
                    <select
                      value={bodyType}
                      onChange={(e) => setBodyType(e.target.value)}
                      className="w-full bg-transparent text-caption font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="" className="bg-ink-900 text-white">All Body Types</option>
                      <option value="SUV" className="bg-ink-900 text-white">SUV & 4x4</option>
                      <option value="Sedan" className="bg-ink-900 text-white">Sedan</option>
                      <option value="Pickup" className="bg-ink-900 text-white">Pickup Truck</option>
                      <option value="Hatchback" className="bg-ink-900 text-white">Hatchback</option>
                    </select>
                  </div>

                  <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                    <label className="block text-[11px] font-semibold text-white/70 uppercase">Budget (RWF / USD)</label>
                    <select
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-transparent text-caption font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="" className="bg-ink-900 text-white">Any Price</option>
                      <option value="15000000" className="bg-ink-900 text-white">Under 15M RWF (~$11k)</option>
                      <option value="30000000" className="bg-ink-900 text-white">Under 30M RWF (~$22k)</option>
                      <option value="50000000" className="bg-ink-900 text-white">Under 50M RWF (~$36k)</option>
                      <option value="100000000" className="bg-ink-900 text-white">Under 100M RWF (~$73k)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand font-bold text-white shadow-brand transition-all hover:bg-brand-bright active:scale-[0.98]"
                    >
                      <Icon name="search" size={16} />
                      <span>Search Live Stock</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Tab 2: Instant VIN & History Check Form */}
            {activeTab === 'vin' && (
              <form onSubmit={handleVinSubmit} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="flex flex-1 items-center gap-2.5 rounded-2xl bg-white px-4 py-2.5 text-ink-900 shadow-inner">
                      <Icon name="shield-check" size={20} className="text-brand" />
                      <input
                        type="text"
                        value={vinInput}
                        onChange={(e) => {
                          setVinInput(e.target.value)
                          if (vinError) setVinError('')
                        }}
                        placeholder="Enter 17-character VIN or Chassis (e.g. JTDBZ2938... or NZE121-12345)"
                        className="h-10 w-full font-mono font-bold tracking-wider uppercase text-body text-ink-900 placeholder:text-content-muted outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-brand hover:bg-brand-bright transition-all"
                    >
                      <Icon name="shield-check" size={16} />
                      <span>Check History</span>
                    </button>
                  </div>
                  {vinError ? (
                    <p className="text-caption font-semibold text-rose-400">{vinError}</p>
                  ) : (
                    <p className="text-micro text-white/70">
                      Instantly decodes ISO 3779 specs, country of origin, Modulo 11 check digit, and Sawa certified 150-point inspection records.
                    </p>
                  )}
                </div>
              </form>
            )}

            {/* Tab 3: Sell / Valuation Quick Prompt */}
            {activeTab === 'sell' && (
              <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-title-sm font-extrabold text-white">Sell your car in 48 hours with guaranteed inspection</h4>
                  <p className="mt-1 text-caption text-white/80">
                    We photograph, inspect 150 mechanical points, and handle RRA digital transfer with verified escrow.
                  </p>
                </div>
                <Link
                  href="/sell"
                  className="shrink-0 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-bold text-white shadow-brand hover:bg-brand-bright transition-all"
                >
                  <Icon name="car" size={16} />
                  <span>Value My Car</span>
                </Link>
              </div>
            )}

            {/* Tab 4: Direct Import Concierge */}
            {activeTab === 'import' && (
              <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-title-sm font-extrabold text-white">Verified global sourcing from Japan, UAE & Europe</h4>
                  <p className="mt-1 text-caption text-white/80">
                    Transparent FOB + shipping + CIF calculator with verified Rwandan customs RRA tax estimates upfront.
                  </p>
                </div>
                <Link
                  href="/tools/import-duty"
                  className="shrink-0 flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-bold text-white shadow-brand hover:bg-brand-bright transition-all"
                >
                  <Icon name="chart" size={16} />
                  <span>Calculate Import Duty</span>
                </Link>
              </div>
            )}
          </div>

          {/* Trust Guarantees Strip */}
          <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption font-semibold text-white/85 animate-fade-up">
            <li className="flex items-center gap-1.5">
              <Icon name="shield-check" size={15} className="text-emerald-400" />
              150-Point Physical Inspection
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="check" size={15} className="text-emerald-400" />
              RRA Duty & Title Cleared
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="gauge" size={15} className="text-emerald-400" />
              Zero Odometer Rollbacks
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="cash" size={15} className="text-emerald-400" />
              RWF & USD Multi-Currency
            </li>
          </ul>
        </div>

        {/* Right Column: Live Certified Stock Rail */}
        {cars.length > 0 && (
          <div className="w-full animate-fade-up lg:max-w-[392px]">
            <div className="mb-2.5 flex items-baseline justify-between px-1">
              <span className="text-eyebrow font-bold uppercase tracking-wider text-white/85 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {translations.stockEyebrow}
              </span>
              <Link href="/cars" className="text-caption font-bold text-white hover:underline flex items-center gap-1">
                {translations.stockAll}
                <Icon name="arrow-right" size={12} />
              </Link>
            </div>

            <ul className="flex flex-col gap-2.5">
              {cars.slice(0, 4).map((car) => (
                <li key={car.id}>
                  <Link
                    href={`/cars/${car.id}`}
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/[0.08] p-2.5 backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.14] hover:shadow-lg"
                  >
                    <span className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded-xl bg-white/10">
                      {car.images?.[0] ? (
                        <Image
                          src={car.images[0]}
                          alt={car.title}
                          fill
                          sizes="96px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                      {car.inspection_score ? (
                        <span className="absolute bottom-1 left-1 rounded bg-ink-900/85 px-1 py-0.5 text-[10px] font-bold text-emerald-400 tabular-nums">
                          {car.inspection_score}/150
                        </span>
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-caption font-bold text-white group-hover:text-brand-light transition-colors">
                        {car.title}
                      </span>
                      <span className="mt-0.5 block truncate text-micro text-white/70">
                        {car.year} · {formatKm(car.mileage)}
                        {car.location ? ` · ${car.location}` : ''}
                      </span>
                      <span className="mt-1 block text-caption font-extrabold tabular-nums text-white">
                        {formatMoney(car.price)}
                      </span>
                    </span>

                    <span className="shrink-0 pr-1 text-white/50 group-hover:text-white transition-colors">
                      <Icon name="chevron-right" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
