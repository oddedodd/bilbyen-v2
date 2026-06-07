import type { Car } from './types'

type AnalyticsEventType = 'carousel_impression' | 'ad_click'

interface TrackCarEventOptions {
  eventType: AnalyticsEventType
  car: Car
  groupSlug: string
  pagePath?: string
  carouselKey?: string
  position?: number
}

const SESSION_STORAGE_KEY = 'bilbyen_analytics_session_id'

export function trackCarEvent({
  eventType,
  car,
  groupSlug,
  pagePath,
  carouselKey,
  position,
}: TrackCarEventOptions) {
  if (!car.orgId) return

  const body = JSON.stringify({
    eventType,
    car: {
      id: car.id,
      orgId: car.orgId,
      title: car.title,
      adUrl: car.adUrl,
      imageUrl: car.imageUrl,
      make: car.make,
      model: car.model,
      year: car.year,
      price: car.price,
    },
    groupSlug,
    pagePath: pagePath ?? window.location.pathname,
    carouselKey,
    position,
    sessionId: getSessionId(),
  })

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon('/api/analytics', blob)) {
      return
    }
  }

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt navigation or browsing.
  })
}

function getSessionId(): string {
  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (existing) {
    return existing
  }

  const sessionId = crypto.randomUUID()
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  return sessionId
}
