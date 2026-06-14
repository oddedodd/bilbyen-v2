import { recordCarAnalyticsEvent } from '@/lib/analytics-server'
import {
  getDealersForCarGroup,
  isCarGroupSlug,
  type CarGroupSlug,
} from '@/lib/car-groups'

type AnalyticsEventType = 'carousel_impression' | 'ad_click'

interface AnalyticsPayload {
  eventType: AnalyticsEventType
  car: {
    id: string
    orgId: string
    title: string
    adUrl?: string
    imageUrl?: string
    make?: string
    model?: string
    year?: number
    price?: number
  }
  groupSlug: CarGroupSlug
  pagePath: string
  carouselKey?: string
  position?: number
  sessionId?: string
}

const MAX_BODY_BYTES = 10_000
const MAX_EVENTS_PER_MINUTE = 120
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: Request) {
  try {
    validateRequestOrigin(request)
    enforceBodySizeLimit(request)
    enforceRateLimit(readClientIp(request))

    const payload = await request.json()
    const validated = validateAnalyticsPayload(payload)
    await validateDealerGroup(validated.car.orgId, validated.groupSlug)

    await recordCarAnalyticsEvent({
      eventType: validated.eventType,
      car: validated.car,
      groupSlug: validated.groupSlug,
      pagePath: validated.pagePath,
      carouselKey: validated.carouselKey,
      position: validated.position,
      sessionId: validated.sessionId,
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    const message =
      error instanceof RequestError ? error.message : 'Unable to track event'
    const status = error instanceof RequestError ? error.status : 500

    if (!(error instanceof RequestError)) {
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

  const id = readRequiredString(payload.car.id, 'car.id', 80, /^[A-Za-z0-9:-]+$/)
  const title = readRequiredString(payload.car.title, 'car.title', 180)
  const orgId = readRequiredString(payload.car.orgId, 'car.orgId', 20, /^\d+$/)
  const groupSlug = readCarGroupSlug(payload.groupSlug)
  const pagePath = readPagePath(payload.pagePath)

  return {
    eventType,
    car: {
      id,
      orgId,
      title,
      adUrl: readOptionalUrl(payload.car.adUrl, 'car.adUrl', ['finn.no']),
      imageUrl: readOptionalUrl(payload.car.imageUrl, 'car.imageUrl'),
      make: readOptionalString(payload.car.make, 'car.make', 80),
      model: readOptionalString(payload.car.model, 'car.model', 80),
      year: readOptionalNumber(payload.car.year, 'car.year', 1900, new Date().getFullYear() + 1),
      price: readOptionalNumber(payload.car.price, 'car.price', 0, 100_000_000),
    },
    groupSlug,
    pagePath,
    carouselKey: readOptionalString(payload.carouselKey, 'carouselKey', 80),
    position: readOptionalNumber(payload.position, 'position', 1, 100),
    sessionId: readOptionalString(
      payload.sessionId,
      'sessionId',
      80,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ),
  }
}

function validateRequestOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return

  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')

  if (!host) {
    throw new ValidationError('Missing host header')
  }

  try {
    if (new URL(origin).host !== host) {
      throw new ValidationError('Invalid request origin')
    }
  } catch {
    throw new ValidationError('Invalid request origin')
  }
}

function enforceBodySizeLimit(request: Request) {
  const contentLength = request.headers.get('content-length')
  if (!contentLength) return

  const byteLength = Number(contentLength)
  if (!Number.isFinite(byteLength) || byteLength > MAX_BODY_BYTES) {
    throw new RequestError('Payload too large', 413)
  }
}

function enforceRateLimit(clientIp: string) {
  const now = Date.now()
  const current = rateLimits.get(clientIp)

  if (!current || current.resetAt <= now) {
    rateLimits.set(clientIp, { count: 1, resetAt: now + 60_000 })
    return
  }

  if (current.count >= MAX_EVENTS_PER_MINUTE) {
    throw new RequestError('Too many analytics events', 429)
  }

  current.count += 1
}

function readClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

async function validateDealerGroup(orgId: string, groupSlug: CarGroupSlug) {
  const dealers = await getDealersForCarGroup(groupSlug)

  if (!dealers.some((dealer) => dealer.orgId === orgId)) {
    throw new ValidationError('Dealer does not belong to group')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
  pattern?: RegExp
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} is required`)
  }

  const trimmed = value.trim()

  if (trimmed === '' || trimmed.length > maxLength) {
    throw new ValidationError(`${field} is invalid`)
  }

  if (pattern && !pattern.test(trimmed)) {
    throw new ValidationError(`${field} is invalid`)
  }

  return trimmed
}

function readCarGroupSlug(value: unknown): CarGroupSlug {
  if (typeof value !== 'string' || !isCarGroupSlug(value)) {
    throw new ValidationError('groupSlug is invalid')
  }

  return value
}

function readPagePath(value: unknown): string {
  const pagePath = readRequiredString(value, 'pagePath', 120)

  if (!pagePath.startsWith('/') || pagePath.startsWith('//')) {
    throw new ValidationError('pagePath is invalid')
  }

  return pagePath
}

function readOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
  pattern?: RegExp
): string | undefined {
  if (value == null || value === '') return undefined

  return readRequiredString(value, field, maxLength, pattern)
}

function readOptionalUrl(
  value: unknown,
  field: string,
  allowedHostSuffixes?: string[]
): string | undefined {
  const rawValue = readOptionalString(value, field, 500)
  if (!rawValue) return undefined

  let url: URL
  try {
    url = new URL(rawValue)
  } catch {
    throw new ValidationError(`${field} is invalid`)
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new ValidationError(`${field} is invalid`)
  }

  if (
    allowedHostSuffixes &&
    !allowedHostSuffixes.some(
      (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
    )
  ) {
    throw new ValidationError(`${field} is invalid`)
  }

  return url.toString()
}

function readOptionalNumber(
  value: unknown,
  field: string,
  min: number,
  max: number
): number | undefined {
  if (value == null) return undefined

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new ValidationError(`${field} is invalid`)
  }

  return value
}

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

class ValidationError extends RequestError {
  constructor(message: string) {
    super(message, 400)
  }
}
