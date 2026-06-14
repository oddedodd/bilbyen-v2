import { NextResponse, type NextRequest } from 'next/server'
import { notFound } from 'next/navigation'
import {
  ANALYTICS_SESSION_COOKIE,
  recordCarAnalyticsEvent,
} from '@/lib/analytics-server'
import type { CarGroupSlug } from '@/lib/car-groups'
import { getEmbedRoute } from '@/lib/embed-routes'
import { fetchFinnCarsForGroup } from '@/lib/finn-api'
import type { Car } from '@/lib/types'

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ embedSlug: string; carId: string }>
  }
) {
  const { embedSlug, carId } = await params
  const embed = getEmbedRoute(embedSlug)

  if (!embed) {
    notFound()
  }

  const car = await findCar(embed.groupSlug, carId)
  const finnUrl = readFinnUrl(car)

  if (!car || !finnUrl) {
    notFound()
  }

  const sessionId =
    request.cookies.get(ANALYTICS_SESSION_COOKIE)?.value ?? crypto.randomUUID()
  const hasExistingSessionCookie = request.cookies.has(ANALYTICS_SESSION_COOKIE)
  const carouselKey = readOptionalQueryParam(
    request.nextUrl.searchParams.get('carousel'),
    80
  )
  const position = readPosition(request.nextUrl.searchParams.get('position'))

  try {
    await recordCarAnalyticsEvent({
      eventType: 'ad_click',
      car,
      groupSlug: embed.groupSlug,
      pagePath: embed.path,
      carouselKey,
      position,
      sessionId,
    })
  } catch (error) {
    console.error('Unable to track embed click', error)
  }

  const response = NextResponse.redirect(finnUrl, { status: 307 })

  if (!hasExistingSessionCookie) {
    response.cookies.set(ANALYTICS_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: SESSION_COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  return response
}

async function findCar(
  groupSlug: CarGroupSlug,
  carId: string
): Promise<Car | null> {
  const cars = await fetchFinnCarsForGroup(groupSlug)
  return cars.find((car) => car.id === carId) ?? null
}

function readFinnUrl(car: Car | null): URL | null {
  if (!car?.adUrl) return null

  let url: URL
  try {
    url = new URL(car.adUrl)
  } catch {
    return null
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    (url.hostname !== 'finn.no' && !url.hostname.endsWith('.finn.no'))
  ) {
    return null
  }

  return url
}

function readOptionalQueryParam(
  value: string | null,
  maxLength: number
): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined
}

function readPosition(value: string | null): number | undefined {
  if (!value) return undefined

  const position = Number(value)

  return Number.isInteger(position) && position >= 1 && position <= 100
    ? position
    : undefined
}
