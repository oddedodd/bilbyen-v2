import type { CarGroupSlug } from './car-groups'

export const CAR_DATA_CACHE_LIFE = {
  stale: 60 * 5,
  revalidate: 60 * 60 * 8,
  expire: 60 * 60 * 24,
} as const

export const FINN_CARS_CACHE_TAG = 'finn:cars'

export function getFinnCarsGroupCacheTag(groupSlug: CarGroupSlug) {
  return `finn:cars:${groupSlug}`
}

export function getFinnOrgCacheTag(orgId: string) {
  return `finn:org:${orgId}`
}

export function getDealersGroupCacheTag(groupSlug: CarGroupSlug) {
  return `dealers:${groupSlug}`
}
