import { callSupabaseRpc } from './supabase-server'
import type { Car } from './types'
import type { CarGroupSlug } from './car-groups'

export const ANALYTICS_SESSION_COOKIE = 'bilbyen_analytics_session_id'

type AnalyticsEventType = 'carousel_impression' | 'ad_click'

interface RecordCarAnalyticsEventOptions {
  eventType: AnalyticsEventType
  car: Car
  groupSlug: CarGroupSlug
  pagePath: string
  carouselKey?: string
  position?: number
  sessionId?: string
}

export async function recordCarAnalyticsEvent({
  eventType,
  car,
  groupSlug,
  pagePath,
  carouselKey,
  position,
  sessionId,
}: RecordCarAnalyticsEventOptions): Promise<void> {
  if (!car.orgId) {
    throw new Error('Cannot track car without orgId')
  }

  await callSupabaseRpc({
    functionName: 'record_analytics_event',
    body: {
      p_event_type: eventType,
      p_finn_ad_id: car.id,
      p_org_id: car.orgId,
      p_title: car.title,
      p_group_slug: groupSlug,
      p_page_path: pagePath,
      p_carousel_key: carouselKey ?? null,
      p_position: position ?? null,
      p_session_id_hash: await hashSessionId(sessionId),
      p_ad_url: car.adUrl ?? null,
      p_image_url: car.imageUrl ?? null,
      p_make: car.make ?? null,
      p_model: car.model ?? null,
      p_year: car.year ?? null,
      p_price: car.price ?? null,
    },
  })
}

export async function hashSessionId(
  sessionId?: string
): Promise<string | null> {
  if (!sessionId) return null

  const bytes = new TextEncoder().encode(sessionId)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
