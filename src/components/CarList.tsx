'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { Car } from '@/lib/types'
import CarCard from './CarCard'

type SortKey =
  | 'price-asc'
  | 'price-desc'
  | 'year-desc'
  | 'year-asc'
  | 'mileage-asc'
  | 'mileage-desc'
  | 'newest'

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Nyeste annonser',
  'price-asc': 'Pris: lav–høy',
  'price-desc': 'Pris: høy–lav',
  'year-desc': 'År: nyest',
  'year-asc': 'År: eldst',
  'mileage-asc': 'Km: lav–høy',
  'mileage-desc': 'Km: høy–lav',
}

interface CarListProps {
  cars: Car[]
  groupSlug: string
  title?: string
  description?: string
}

export default function CarList({
  cars,
  groupSlug,
  title = 'Biler til salgs',
  description,
}: CarListProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [filterMake, setFilterMake] = useState('')
  const [filterFuel, setFilterFuel] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minYear, setMinYear] = useState('')

  const makes = useMemo(() => {
    const set = new Set<string>()
    for (const car of cars) if (car.make) set.add(car.make)
    return [...set].sort()
  }, [cars])

  const fuels = useMemo(() => {
    const set = new Set<string>()
    for (const car of cars) if (car.fuel) set.add(car.fuel)
    return [...set].sort()
  }, [cars])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const maxPriceNum = maxPrice ? Number(maxPrice) : null
    const minYearNum = minYear ? Number(minYear) : null

    return cars.filter((car) => {
      if (q) {
        const hay = `${car.title} ${car.make ?? ''} ${car.model ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterMake && car.make !== filterMake) return false
      if (filterFuel && car.fuel !== filterFuel) return false
      if (maxPriceNum != null && car.price != null && car.price > maxPriceNum) return false
      if (minYearNum != null && car.year != null && car.year < minYearNum) return false
      return true
    })
  }, [cars, search, filterMake, filterFuel, maxPrice, minYear])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return (a.price ?? Infinity) - (b.price ?? Infinity)
        case 'price-desc':
          return (b.price ?? -Infinity) - (a.price ?? -Infinity)
        case 'year-desc':
          return (b.year ?? 0) - (a.year ?? 0)
        case 'year-asc':
          return (a.year ?? 9999) - (b.year ?? 9999)
        case 'mileage-asc':
          return (a.mileage ?? Infinity) - (b.mileage ?? Infinity)
        case 'mileage-desc':
          return (b.mileage ?? -Infinity) - (a.mileage ?? -Infinity)
        case 'newest':
        default:
          return (b.updated ?? '').localeCompare(a.updated ?? '')
      }
    })
  }, [filtered, sort])

  const hasFilters = search || filterMake || filterFuel || maxPrice || minYear

  function clearFilters() {
    setSearch('')
    setFilterMake('')
    setFilterFuel('')
    setMaxPrice('')
    setMinYear('')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/"
                className="text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
              >
                Til forsiden
              </Link>
              {description && (
                <p className="mt-1 max-w-3xl text-sm text-gray-600">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h1 className="text-xl font-bold text-gray-950 shrink-0">
              {title}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({sorted.length} av {cars.length})
              </span>
            </h1>

            {/* Search */}
            <input
              type="search"
              placeholder="Søk merke, modell..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 placeholder-gray-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Filters row */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <select
              value={filterMake}
              onChange={(e) => setFilterMake(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Alle merker</option>
              {makes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterFuel}
              onChange={(e) => setFilterFuel(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-950 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Alle drivstoff</option>
              {fuels.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Max pris (kr)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-950 placeholder-gray-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />

            <input
              type="number"
              placeholder="Min år"
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              min={1990}
              max={2026}
              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-950 placeholder-gray-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-sky-700 hover:text-sky-900 hover:underline px-1"
              >
                Nullstill filter
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Car grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            Ingen biler samsvarer med søket ditt.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                analytics={{
                  groupSlug,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
