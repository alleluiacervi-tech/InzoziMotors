'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'
import { Button, Icon } from '@/components/ui'

// The hero stage's client half: manual rotation between at most three slides.
// Deliberately NOT an autoplaying carousel — autoplay taxes LCP, fights
// reduced-motion, and on Kigali mobile data every fetched frame costs real
// money. The first slide is server-rendered and priority-loaded; rotation is
// a user choice.

export interface HeroSlide {
  image: string | null
  alt: string
  eyebrow: string
  headline: string
  caption: string
  href: string
  cta: string
  /** Present only when the slide is a real listing. */
  priceLabel?: string
}

export function HeroRotator({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const count = slides.length
  const slide = slides[index]

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  )

  if (!slide) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative flex min-h-[calc(100svh-var(--header-h))] items-end overflow-hidden bg-ink-900"
    >
      {/* The photography IS the section. Every slide stays mounted so
          rotation is an opacity change, not a network request. */}
      {slides.map((s, i) => (
        <div
          key={s.headline}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-700 ease-brand ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {s.image ? (
            <Image
              src={s.image}
              alt={i === index ? s.alt : ''}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          {/* Legibility gradient — text sits on ink, not on the photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-ink-900/20" />
        </div>
      ))}

      <div className="relative mx-auto w-full max-w-content px-5 pb-16 pt-32 sm:px-8 sm:pb-20 lg:px-12">
        <div className="max-w-2xl text-white">
          <p className="mb-3 text-eyebrow font-bold uppercase text-white/60">{slide.eyebrow}</p>
          <h1 className="text-display-xl font-extrabold">{slide.headline}</h1>
          <p className="mt-4 max-w-xl text-title-sm leading-relaxed text-white/75">
            {slide.caption}
            {slide.priceLabel ? (
              <span className="ml-2 font-extrabold text-white">{slide.priceLabel}</span>
            ) : null}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button href={slide.href} size="lg" trailingIcon={<Icon name="arrow-right" size={18} />}>
              {slide.cta}
            </Button>
          </div>
        </div>

        {count > 1 ? (
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous"
              className="flex h-10 w-10 items-center justify-center rounded-pill border border-white/25 text-white transition-colors hover:border-white/60 hover:bg-white/10"
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next"
              className="flex h-10 w-10 items-center justify-center rounded-pill border border-white/25 text-white transition-colors hover:border-white/60 hover:bg-white/10"
            >
              <Icon name="chevron-right" size={18} />
            </button>
            <div className="ml-2 flex items-center gap-2" role="tablist" aria-label="Slides">
              {slides.map((s, i) => (
                <button
                  key={s.headline}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-pill transition-all duration-300 ${
                    i === index ? 'w-8 bg-white' : 'w-4 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default HeroRotator
