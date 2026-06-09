import { cacheLife } from 'next/cache'
import { fetchSupabaseRest } from './supabase-server'

export type CarGroupSlug = 'bilbyen' | 'bruktbil-trondelag'

export interface DealerConfig {
  id: string
  name: string
  orgId: string
  groupSlug: CarGroupSlug
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
  group_slug: CarGroupSlug
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

export function isCarGroupSlug(value: string): value is CarGroupSlug {
  return value === 'bilbyen' || value === 'bruktbil-trondelag'
}

export function getCarGroupLabel(groupSlug: CarGroupSlug): string {
  return carGroups[groupSlug].name
}

export function normalizeCarGroupSlug(
  value: FormDataEntryValue | null
): CarGroupSlug {
  return typeof value === 'string' && isCarGroupSlug(value)
    ? value
    : 'bilbyen'
}

export async function getDealersForCarGroup(
  groupSlug: CarGroupSlug
): Promise<DealerConfig[]> {
  'use cache'
  cacheLife('minutes')

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
