import type { Car } from '@/lib/types'

export default function CarCard({ car }: { car: Car }) {
  const imageUrl = car.imageUrl
    ? car.imageUrl.replace('/dynamic/default/', '/dynamic/480x360c/')
    : null

  return (
    <a
      href={car.adUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={car.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10zM3 7h10l4 5" />
            </svg>
          </div>
        )}
        {car.fuel && (
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {car.fuel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">
          {car.title}
        </h3>
        {car.modelSpec && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {car.modelSpec}
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-col gap-1.5">
          {car.price != null && (
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {car.price.toLocaleString('nb-NO')} kr
            </p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {car.year != null && <span>{car.year}</span>}
            {car.mileage != null && (
              <span>{car.mileage.toLocaleString('nb-NO')} km</span>
            )}
            {car.location && <span>{car.location}</span>}
          </div>
        </div>
      </div>
    </a>
  )
}
