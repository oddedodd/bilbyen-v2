import { callSupabaseRpc } from '@/lib/supabase-server'

type AnalyticsEventType = 'carousel_impression' | 'ad_click'

interface AnalyticsPayload {
  eventType: AnalyticsEventType
  car: {
    id: string
    orgId?: string
    title: string
    adUrl?: string
    imageUrl?: string
    make?: string
    model?: string
    year?: number
    price?: number
  }
  groupSlug: string
  pagePath: string
  carouselKey?: string
  position?: number
  sessionId?: string
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const validated = validateAnalyticsPayload(payload)

    await callSupabaseRpc({
      functionName: 'record_analytics_event',
      body: {
        p_event_type: validated.eventType,
        p_finn_ad_id: validated.car.id,
        p_org_id: validated.car.orgId,
        p_title: validated.car.title,
        p_group_slug: validated.groupSlug,
        p_page_path: validated.pagePath,
        p_carousel_key: validated.carouselKey ?? null,
        p_position: validated.position ?? null,
        p_session_id_hash: await hashSessionId(validated.sessionId),
        p_ad_url: validated.car.adUrl ?? null,
        p_image_url: validated.car.imageUrl ?? null,
        p_make: validated.car.make ?? null,
        p_model: validated.car.model ?? null,
        p_year: validated.car.year ?? null,
        p_price: validated.car.price ?? null,
      },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    const message =
      error instanceof ValidationError ? error.message : 'Unable to track event'
    const status = error instanceof ValidationError ? 400 : 500

    if (!(error instanceof ValidationError)) {
      console.error(error)
    }

    return Response.json({ error: message }, { status })
  }
}

function validateAnalyticsPayload(payload: unknown): AnalyticsPayload {
  if (!isRecord(payload)) {
    throw new ValidationError('Invalid payload')
  }

  const eventType = payload.eventType
  if (eventType !== 'carousel_impression' && eventType !== 'ad_click') {
    throw new ValidationError('Invalid event type')
  }

  if (!isRecord(payload.car)) {
    throw new ValidationError('Invalid car payload')
  }

  const id = readRequiredString(payload.car.id, 'car.id')
  const title = readRequiredString(payload.car.title, 'car.title')
  const orgId = readRequiredString(payload.car.orgId, 'car.orgId')
  const groupSlug = readRequiredString(payload.groupSlug, 'groupSlug')
  const pagePath = readRequiredString(payload.pagePath, 'pagePath')

  return {
    eventType,
    car: {
      id,
      orgId,
      title,
      adUrl: readOptionalString(payload.car.adUrl),
      imageUrl: readOptionalString(payload.car.imageUrl),
      make: readOptionalString(payload.car.make),
      model: readOptionalString(payload.car.model),
      year: readOptionalNumber(payload.car.year),
      price: readOptionalNumber(payload.car.price),
    },
    groupSlug,
    pagePath,
    carouselKey: readOptionalString(payload.carouselKey),
    position: readOptionalNumber(payload.position),
    sessionId: readOptionalString(payload.sessionId),
  }
}

async function hashSessionId(sessionId?: string): Promise<string | null> {
  if (!sessionId) return null

  const bytes = new TextEncoder().encode(sessionId)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} is required`)
  }

  return value
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

class ValidationError extends Error {}
