import { cacheLife, cacheTag } from 'next/cache'
import CarList from '@/components/CarList'
import { carGroups } from '@/lib/car-groups'
import { fetchBruktbilTrondelagCars } from '@/lib/finn-api'
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
  cacheTag(getFinnCarsGroupCacheTag('bruktbil-trondelag'))
  cacheTag(getDealersGroupCacheTag('bruktbil-trondelag'))

  const group = carGroups['bruktbil-trondelag']
  const cars = await fetchBruktbilTrondelagCars()

  return (
    <CarList
      cars={cars}
      groupSlug={group.slug}
      title={group.name}
      description={group.description}
    />
  )
}
