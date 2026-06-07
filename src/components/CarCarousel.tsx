'use client'

import Link from 'next/link'
import { useRef } from 'react'
import type { Car } from '@/lib/types'
import CarCard from './CarCard'

interface CarCarouselProps {
  title: string
  description: string
  href: string
  cars: Car[]
}

export default function CarCarousel({
  title,
  description,
  href,
  cars,
}: CarCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const visibleCars = cars.slice(0, 20)

  function scrollByCard(direction: -1 | 1) {
    const scroller = scrollerRef.current
    if (!scroller) return

    scroller.scrollBy({
      left: direction * Math.min(scroller.clientWidth, 980),
      behavior: 'smooth',
    })
  }

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              aria-label={`Forrige biler i ${title}`}
              className="grid h-10 w-10 place-items-center rounded-lg border border-gray-300 bg-white text-lg font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label={`Neste biler i ${title}`}
              className="grid h-10 w-10 place-items-center rounded-lg border border-gray-300 bg-white text-lg font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              &gt;
            </button>
            <Link
              href={href}
              className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              Se alle
            </Link>
          </div>
        </div>

        {visibleCars.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Ingen biler funnet.
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]"
          >
            {visibleCars.map((car) => (
              <div
                key={car.id}
                className="w-[82vw] max-w-[21rem] shrink-0 snap-start sm:w-[20rem]"
              >
                <CarCard car={car} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
