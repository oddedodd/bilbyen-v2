export type CarGroupSlug = 'bilbyen' | 'bruktbil-trondelag'

export interface DealerConfig {
  name: string
  orgId: string
}

export interface CarGroupConfig {
  slug: CarGroupSlug
  name: string
  shortName: string
  description: string
  path: `/${CarGroupSlug}`
  dealers: DealerConfig[]
}

export const carGroups = {
  bilbyen: {
    slug: 'bilbyen',
    name: 'Bilbyen Namsos',
    shortName: 'Bilbyen',
    description: 'Bruktbiler fra forhandlerne i Bilbyen Namsos.',
    path: '/bilbyen',
    dealers: [
      { name: 'Bilsenteret', orgId: '903902014' },
      { name: 'Høylandet Auto', orgId: '1401679938' },
      { name: 'Otto Moe', orgId: '2068682021' },
    ],
  },
  'bruktbil-trondelag': {
    slug: 'bruktbil-trondelag',
    name: 'Bruktbil Trøndelag',
    shortName: 'Bruktbil Trøndelag',
    description: 'Bruktbiler fra utvalgte forhandlere i Trøndelag.',
    path: '/bruktbil-trondelag',
    dealers: [
      { name: 'Sannan Bil', orgId: '2038393302' },
      { name: 'Steinkjer Bil', orgId: '1784917547' },
      { name: 'Slatlem Verdal', orgId: '756031412' },
    ],
  },
} satisfies Record<CarGroupSlug, CarGroupConfig>

export const carGroupList = Object.values(carGroups)
