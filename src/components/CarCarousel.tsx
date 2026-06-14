'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { Swiper as SwiperType } from 'swiper'
import { A11y, Autoplay } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import {
  getEmbedClickHref,
  type EmbedSlug,
} from '@/lib/embed-routes'
import { trackCarEvent } from '@/lib/analytics-client'
import type { Car } from '@/lib/types'
import CarCard from './CarCard'
import 'swiper/css'

interface CarCarouselProps {
  title: string
  description: string
  href: string
  cars: Car[]
  groupSlug: string
  embedSlug?: EmbedSlug
  trackAnalytics?: boolean
}

export default function CarCarousel({
  title,
  description,
  href,
  cars,
  groupSlug,
  embedSlug,
  trackAnalytics = false,
}: CarCarouselProps) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const visibleCars = cars.slice(0, 20)
  const carouselKey = `carousel:${groupSlug}`

  function toggleAutoplay() {
    if (!swiper) return

    if (isPlaying) {
      swiper.autoplay.stop()
      setIsPlaying(false)
      return
    }

    swiper.autoplay.start()
    setIsPlaying(true)
  }

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              {title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {description}
            </p>
          </div>

          <div className="flex items-center">
            <Link
              href={href}
              className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              Se alle
            </Link>
          </div>
        </div>

        {visibleCars.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center text-sm text-gray-500">
            Ingen biler funnet.
          </div>
        ) : (
          <div className="relative">
            <Suspense
              fallback={
                <CarouselFallback
                  cars={visibleCars}
                  carouselKey={carouselKey}
                  embedSlug={embedSlug}
                  trackAnalytics={trackAnalytics}
                />
              }
            >
              <Swiper
                modules={[A11y, Autoplay]}
                onSwiper={setSwiper}
                autoplay={{
                  delay: 4500,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }}
                loop={visibleCars.length > 3}
                slidesPerView={1}
                spaceBetween={16}
                breakpoints={{
                  640: {
                    slidesPerView: 3,
                  },
                }}
                className="-mx-4 px-4 pb-4 [&_.swiper-slide]:h-auto [&_.swiper-slide]:self-stretch [&_.swiper-wrapper]:items-stretch"
              >
                {visibleCars.map((car, index) => (
                  <SwiperSlide key={car.id} className="!flex h-auto">
                    <TrackedCarouselCard
                      car={car}
                      carouselKey={carouselKey}
                      embedSlug={embedSlug}
                      groupSlug={groupSlug}
                      position={index + 1}
                      trackAnalytics={trackAnalytics}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </Suspense>

            <button
              type="button"
              onClick={() => swiper?.slidePrev()}
              aria-label={`Forrige biler i ${title}`}
              className="absolute left-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-gray-950 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50"
            >
              <ChevronLeftIcon />
            </button>
            <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
              <button
                type="button"
                onClick={toggleAutoplay}
                aria-label={
                  isPlaying
                    ? `Pause automatisk visning av ${title}`
                    : `Start automatisk visning av ${title}`
                }
                className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-gray-950 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                type="button"
                onClick={() => swiper?.slideNext()}
                aria-label={`Neste biler i ${title}`}
                className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-gray-950 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function CarouselFallback({
  cars,
  carouselKey,
  embedSlug,
  trackAnalytics,
}: {
  cars: Car[]
  carouselKey: string
  embedSlug?: EmbedSlug
  trackAnalytics: boolean
}) {
  return (
    <div className="-mx-4 grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-3">
      {cars.slice(0, 3).map((car, index) => (
        <CarCard
          key={car.id}
          car={car}
          href={
            trackAnalytics && embedSlug
              ? getEmbedClickHref({
                  carId: car.id,
                  carouselKey,
                  embedSlug,
                  position: index + 1,
                })
              : undefined
          }
        />
      ))}
    </div>
  )
}

function TrackedCarouselCard({
  car,
  carouselKey,
  embedSlug,
  groupSlug,
  position,
  trackAnalytics,
}: {
  car: Car
  carouselKey: string
  embedSlug?: EmbedSlug
  groupSlug: string
  position: number
  trackAnalytics: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const hasTracked = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!trackAnalytics || !element || hasTracked.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasTracked.current) return

        hasTracked.current = true
        trackCarEvent({
          eventType: 'carousel_impression',
          car,
          groupSlug,
          pagePath: window.location.pathname,
          carouselKey,
          position,
        })
        observer.disconnect()
      },
      { threshold: 0.5 }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [car, carouselKey, groupSlug, position, trackAnalytics])

  return (
    <div ref={ref} className="flex h-full w-full">
      <CarCard
        car={car}
        href={
          trackAnalytics && embedSlug
            ? getEmbedClickHref({
                carId: car.id,
                carouselKey,
                embedSlug,
                position,
              })
            : undefined
        }
      />
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5a1 1 0 0 0-1 1v12a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Zm8 0a1 1 0 0 0-1 1v12a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l9.6-6.4a1 1 0 0 0 0-1.7l-9.6-6.4A1 1 0 0 0 8 5.6Z" />
    </svg>
  )
}
