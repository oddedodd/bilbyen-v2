import type { CarGroupSlug } from './car-groups'

export type EmbedSlug = 'bilbyen-namsos' | 'bruktbil-trondelag'

export interface EmbedConfig {
  slug: EmbedSlug
  groupSlug: CarGroupSlug
  path: `/embed/${EmbedSlug}`
}

export const embedRoutes = {
  'bilbyen-namsos': {
    slug: 'bilbyen-namsos',
    groupSlug: 'bilbyen',
    path: '/embed/bilbyen-namsos',
  },
  'bruktbil-trondelag': {
    slug: 'bruktbil-trondelag',
    groupSlug: 'bruktbil-trondelag',
    path: '/embed/bruktbil-trondelag',
  },
} satisfies Record<EmbedSlug, EmbedConfig>

export function getEmbedRoute(slug: string): EmbedConfig | undefined {
  return slug in embedRoutes ? embedRoutes[slug as EmbedSlug] : undefined
}

export function getEmbedClickHref({
  carId,
  carouselKey,
  embedSlug,
  position,
}: {
  carId: string
  carouselKey: string
  embedSlug: EmbedSlug
  position: number
}): string {
  const params = new URLSearchParams({
    carousel: carouselKey,
    position: String(position),
  })

  return `/embed/${embedSlug}/click/${encodeURIComponent(carId)}?${params.toString()}`
}
