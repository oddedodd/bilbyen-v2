import { cacheLife, cacheTag } from 'next/cache'
import {
  CAR_DATA_CACHE_LIFE,
  getDealersGroupCacheTag,
} from './cache-tags'
import { fetchSupabaseRest } from './supabase-server'

export type CarGroupSlug = 'bilbyen' | 'bruktbil-trondelag'
export type DealerGroupSlug = CarGroupSlug | 'inactive'

export interface DealerConfig {
  id: string
  name: string
  orgId: string
  groupSlug: DealerGroupSlug
}

export interface CarGroupConfig {
  slug: CarGroupSlug
  name: string
  shortName: string
  description: string
  path: `/${CarGroupSlug}`
}

interface DealerRow {
  id: string
  name: string
  org_id: string
  group_slug: DealerGroupSlug
}

export const carGroups = {
  bilbyen: {
    slug: 'bilbyen',
    name: 'Bilbyen Namsos',
    shortName: 'Bilbyen',
    description: 'Bruktbiler fra forhandlerne i Bilbyen Namsos.',
    path: '/bilbyen',
  },
  'bruktbil-trondelag': {
    slug: 'bruktbil-trondelag',
    name: 'Bruktbil Trøndelag',
    shortName: 'Bruktbil Trøndelag',
    description: 'Bruktbiler fra utvalgte forhandlere i Trøndelag.',
    path: '/bruktbil-trondelag',
  },
} satisfies Record<CarGroupSlug, CarGroupConfig>

export const carGroupList = Object.values(carGroups)

export const dealerGroupList = [
  ...carGroupList,
  {
    slug: 'inactive',
    name: 'Inaktive',
    shortName: 'Inaktive',
  },
] satisfies Array<{
  slug: DealerGroupSlug
  name: string
  shortName: string
}>

export function isCarGroupSlug(value: string): value is CarGroupSlug {
  return value === 'bilbyen' || value === 'bruktbil-trondelag'
}

export function isDealerGroupSlug(value: string): value is DealerGroupSlug {
  return isCarGroupSlug(value) || value === 'inactive'
}

export function getCarGroupLabel(groupSlug: CarGroupSlug): string {
  return carGroups[groupSlug].name
}

export function getDealerGroupLabel(groupSlug: DealerGroupSlug): string {
  return (
    dealerGroupList.find((group) => group.slug === groupSlug)?.name ??
    groupSlug
  )
}

export function normalizeDealerGroupSlug(
  value: FormDataEntryValue | null
): DealerGroupSlug {
  return typeof value === 'string' && isDealerGroupSlug(value)
    ? value
    : 'bilbyen'
}

export async function getDealersForCarGroup(
  groupSlug: CarGroupSlug
): Promise<DealerConfig[]> {
  'use cache'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(getDealersGroupCacheTag(groupSlug))

  const dealers = await fetchSupabaseRest<DealerRow[]>({
    path: `/dealers?select=id,name,org_id,group_slug&group_slug=eq.${groupSlug}&order=name.asc`,
  })

  return dealers.map((dealer) => ({
    id: dealer.id,
    name: dealer.name,
    orgId: dealer.org_id,
    groupSlug: dealer.group_slug,
  }))
}
