import { cacheLife, cacheTag } from 'next/cache'
import CarCarousel from '@/components/CarCarousel'
import { prepareCarouselCars } from '@/lib/car-carousel'
import { carGroups } from '@/lib/car-groups'
import { embedRoutes } from '@/lib/embed-routes'
import { fetchBilbyenCars } from '@/lib/finn-api'
import {
  CAR_DATA_CACHE_LIFE,
  FINN_CARS_CACHE_TAG,
  getDealersGroupCacheTag,
  getFinnCarsGroupCacheTag,
} from '@/lib/cache-tags'

export default async function EmbedBilbyenNamsosPage() {
  'use cache'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(FINN_CARS_CACHE_TAG)
  cacheTag(getFinnCarsGroupCacheTag('bilbyen'))
  cacheTag(getDealersGroupCacheTag('bilbyen'))

  const embed = embedRoutes['bilbyen-namsos']
  const group = carGroups[embed.groupSlug]
  const cars = await fetchBilbyenCars()

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
          backgroundColor: '#ad2430',
          logoAlt: 'Bilbyen Namsos',
          logoSrc: '/bb-namsos_logo.png',
        }}
        trackAnalytics
      />
    </main>
  )
}
