'use client'

import type { Car } from '@/lib/types'
import { trackCarEvent } from '@/lib/analytics-client'

interface CarCardProps {
  car: Car
  href?: string
  variant?: 'default' | 'embed'
  analytics?: {
    groupSlug: string
    pagePath?: string
    carouselKey?: string
    position?: number
  }
}

export default function CarCard({
  car,
  href,
  variant = 'default',
  analytics,
}: CarCardProps) {
  const imageUrl = car.imageUrl
    ? car.imageUrl.replace('/dynamic/default/', '/dynamic/480x360c/')
    : null
  const isEmbed = variant === 'embed'

  function trackClick() {
    if (!analytics) return

    trackCarEvent({
      eventType: 'ad_click',
      car,
      ...analytics,
    })
  }

  return (
    <a
      href={href ?? car.adUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackClick}
      className={
        isEmbed
          ? 'group flex h-[25rem] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md'
          : 'group flex h-full min-h-[23rem] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:border-gray-300 hover:shadow-md sm:min-h-[22rem] lg:min-h-[27rem]'
      }
    >
      <div
        className={
          isEmbed
            ? 'relative h-44 w-full shrink-0 bg-slate-100 sm:h-48'
            : 'relative h-48 w-full shrink-0 bg-gray-100 sm:h-40 md:h-44 lg:h-64'
        }
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={car.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10zM3 7h10l4 5" />
            </svg>
          </div>
        )}
        {car.fuel && (
          <span
            className={
              isEmbed
                ? 'absolute right-3 top-3 rounded-full bg-gray-950/75 px-3 py-1.5 text-sm font-bold text-white'
                : 'absolute top-2 right-2 bg-gray-950/75 text-white text-xs px-2 py-0.5 rounded-full'
            }
          >
            {car.fuel}
          </span>
        )}
      </div>

      <div
        className={
          isEmbed
            ? 'flex flex-1 flex-col gap-1.5 px-4 py-3'
            : 'flex flex-1 flex-col gap-1.5 p-4'
        }
      >
        <h3
          className={
            isEmbed
              ? 'line-clamp-2 text-xl font-extrabold leading-tight text-gray-950'
              : 'font-semibold text-gray-950 text-sm leading-tight line-clamp-2'
          }
        >
          {car.title}
        </h3>
        {car.dealer && (
          <p
            className={
              isEmbed
                ? 'line-clamp-1 text-base font-medium leading-snug text-[#ad2430]'
                : 'text-xs font-medium text-sky-700 line-clamp-1'
            }
          >
            {car.dealer}
          </p>
        )}
        {car.modelSpec && (
          <p
            className={
              isEmbed
                ? 'line-clamp-1 text-sm leading-snug text-gray-500'
                : 'text-xs text-gray-500 line-clamp-1'
            }
          >
            {car.modelSpec}
          </p>
        )}

        <div
          className={
            isEmbed
              ? 'mt-auto flex flex-col gap-2 pt-2'
              : 'mt-auto pt-3 flex flex-col gap-1.5'
          }
        >
          {car.price != null && (
            <p
              className={
                isEmbed
                  ? 'text-[1.4rem] font-extrabold leading-none text-gray-950'
                  : 'text-lg font-bold text-gray-950'
              }
            >
              {car.price.toLocaleString('nb-NO')} kr
            </p>
          )}

          {isEmbed && <div className="h-px w-full bg-slate-200" />}

          <div
            className={
              isEmbed
                ? 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500'
                : 'flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500'
            }
          >
            {car.year != null && <span>{car.year}</span>}
            {car.mileage != null && (
              <>
                {isEmbed && <span className="text-slate-300">·</span>}
                <span>{car.mileage.toLocaleString('nb-NO')} km</span>
              </>
            )}
            {car.location && (
              <>
                {isEmbed && <span className="text-slate-300">·</span>}
                <span>{car.location}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}
