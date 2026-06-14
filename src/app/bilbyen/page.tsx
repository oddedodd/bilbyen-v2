import { cacheLife, cacheTag } from 'next/cache'
import CarList from '@/components/CarList'
import { fetchBilbyenCars } from '@/lib/finn-api'
import { carGroups } from '@/lib/car-groups'
import {
  CAR_DATA_CACHE_LIFE,
  FINN_CARS_CACHE_TAG,
  getDealersGroupCacheTag,
  getFinnCarsGroupCacheTag,
} from '@/lib/cache-tags'

export default async function Page() {
  'use cache'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(FINN_CARS_CACHE_TAG)
  cacheTag(getFinnCarsGroupCacheTag('bilbyen'))
  cacheTag(getDealersGroupCacheTag('bilbyen'))

  const group = carGroups.bilbyen
  const cars = await fetchBilbyenCars()

  return (
    <CarList
      cars={cars}
      groupSlug={group.slug}
      title={group.name}
      description={group.description}
    />
  )
}
