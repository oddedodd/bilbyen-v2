import { cacheLife, cacheTag } from 'next/cache'
import CarCarousel from '@/components/CarCarousel'
import { prepareCarouselCars } from '@/lib/car-carousel'
import { carGroups } from '@/lib/car-groups'
import { embedRoutes } from '@/lib/embed-routes'
import { fetchBruktbilTrondelagCars } from '@/lib/finn-api'
import {
  CAR_DATA_CACHE_LIFE,
  FINN_CARS_CACHE_TAG,
  getDealersGroupCacheTag,
  getFinnCarsGroupCacheTag,
} from '@/lib/cache-tags'

export default async function EmbedBruktbilTrondelagPage() {
  'use cache'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(FINN_CARS_CACHE_TAG)
  cacheTag(getFinnCarsGroupCacheTag('bruktbil-trondelag'))
  cacheTag(getDealersGroupCacheTag('bruktbil-trondelag'))

  const embed = embedRoutes['bruktbil-trondelag']
  const group = carGroups[embed.groupSlug]
  const cars = await fetchBruktbilTrondelagCars()

  return (
    <main className="min-h-screen bg-white">
      <CarCarousel
        title={group.name}
        description={group.description}
        href={group.path}
        cars={prepareCarouselCars(cars)}
        groupSlug={embed.groupSlug}
        embedSlug={embed.slug}
        embedHeader={{
          backgroundColor: '#5a7d93',
          logoAlt: 'Bruktbil Trøndelag',
          logoSrc: '/bb-trondelag_logo.png',
        }}
        trackAnalytics
      />
    </main>
  )
}
