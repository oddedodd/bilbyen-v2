import { XMLParser } from 'fast-xml-parser'
import { cacheLife, cacheTag } from 'next/cache'
import {
  CAR_DATA_CACHE_LIFE,
  FINN_CARS_CACHE_TAG,
  getFinnCarsGroupCacheTag,
  getFinnOrgCacheTag,
} from './cache-tags'
import { getDealersForCarGroup, type CarGroupSlug } from './car-groups'
import type { Car } from './types'

const FINN_API_BASE = 'https://cache.api.finn.no'
const FINN_REQUEST_TIMEOUT_MS = 10_000

// FINN lookups use the remote cache so every serverless instance shares one
// entry per dealer. Plain 'use cache' is in-memory per instance on Vercel,
// which misses often and multiplies FINN API calls.

export async function fetchFinnCars(): Promise<Car[]> {
  'use cache: remote'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(FINN_CARS_CACHE_TAG)

  const orgId = process.env.FINN_ORGID

  if (!orgId) {
    throw new Error('FINN_ORGID must be set in environment')
  }

  cacheTag(getFinnOrgCacheTag(orgId))

  return fetchFinnCarsByOrgId(orgId)
}

export async function fetchBilbyenCars(): Promise<Car[]> {
  return fetchFinnCarsForGroup('bilbyen')
}

export async function fetchBruktbilTrondelagCars(): Promise<Car[]> {
  return fetchFinnCarsForGroup('bruktbil-trondelag')
}

export async function fetchFinnCarsForGroup(
  groupSlug: CarGroupSlug
): Promise<Car[]> {
  'use cache: remote'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(FINN_CARS_CACHE_TAG)
  cacheTag(getFinnCarsGroupCacheTag(groupSlug))

  const dealers = await getDealersForCarGroup(groupSlug)
  const results = await Promise.allSettled(
    dealers.map((dealer) => fetchFinnCarsByOrgId(dealer.orgId))
  )

  const carsByDealer: Car[][] = []
  const failedOrgIds: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      carsByDealer.push(result.value)
    } else {
      failedOrgIds.push(dealers[index].orgId)
      console.error(
        `Unable to fetch FINN cars for orgId ${dealers[index].orgId}`,
        result.reason
      )
    }
  })

  // Only fail when every dealer failed, so one broken dealer feed does not
  // take down the whole group page.
  if (dealers.length > 0 && failedOrgIds.length === dealers.length) {
    throw new Error(`FINN API failed for all dealers in ${groupSlug}`)
  }

  return sortNewestFirst(dedupeCars(carsByDealer.flat()))
}

export async function fetchFinnCarsByOrgId(orgId: string): Promise<Car[]> {
  'use cache: remote'
  cacheLife(CAR_DATA_CACHE_LIFE)
  cacheTag(FINN_CARS_CACHE_TAG)
  cacheTag(getFinnOrgCacheTag(orgId))

  const apiKey = process.env.FINN_API_KEY

  if (!apiKey) {
    throw new Error('FINN_API_KEY must be set in environment')
  }

  // Logged so FINN usage can be counted in the Vercel logs.
  console.info(`FINN API request for orgId ${orgId}`)

  const res = await fetch(
    `${FINN_API_BASE}/iad/search/car-norway?orgId=${orgId}&rows=1000`,
    {
      headers: { 'x-FINN-apikey': apiKey },
      signal: AbortSignal.timeout(FINN_REQUEST_TIMEOUT_MS),
    }
  )

  if (!res.ok) {
    throw new Error(`FINN API responded with ${res.status}`)
  }

  const xml = await res.text()
  return parseEntries(xml, orgId)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParsedNode = Record<string, any>

function parseEntries(xml: string, orgId: string): Car[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    isArray: (name) =>
      ['entry', 'finn:field', 'finn:price', 'link'].includes(name),
  })

  const result = parser.parse(xml)
  const entries: ParsedNode[] = result?.feed?.entry ?? []

  return entries.map((entry) => mapEntry(entry, orgId))
}

function mapEntry(entry: ParsedNode, orgId: string): Car {
  // Flatten top-level finn:field entries from finn:adata
  const fields = extractFields(entry['finn:adata']?.['finn:field'] ?? [])

  // Extract nested engine fields
  const engineNode = (entry['finn:adata']?.['finn:field'] ?? []).find(
    (f: ParsedNode) => f['@_name'] === 'engine'
  )
  const engineFields = engineNode
    ? extractFields(engineNode['finn:field'] ?? [])
    : {}

  // Price: use "main" price
  const prices: ParsedNode[] = entry['finn:adata']?.['finn:price'] ?? []
  const mainPrice = prices.find((p) => p['@_name'] === 'main')

  // Ad URL: link with rel="alternate"
  const links: ParsedNode[] = entry.link ?? []
  const adLink = links.find((l) => l['@_rel'] === 'alternate')

  // Image
  const image = entry['media:content']

  // Strip "urn:id:" prefix
  const id = String(entry.id ?? '').replace('urn:id:', '')

  return {
    id,
    title: String(entry.title ?? ''),
    orgId,
    make: fields.make != null ? String(fields.make) : undefined,
    model: fields.model != null ? String(fields.model) : undefined,
    year: fields.year != null ? Number(fields.year) : undefined,
    mileage: fields.mileage != null ? Number(fields.mileage) : undefined,
    price: mainPrice != null ? Number(mainPrice['@_value']) : undefined,
    fuel:
      engineFields.fuel != null ? String(engineFields.fuel) : undefined,
    location:
      entry['finn:location']?.['finn:city'] != null
        ? String(entry['finn:location']['finn:city'])
        : undefined,
    imageUrl:
      image?.['@_url'] != null ? String(image['@_url']) : undefined,
    adUrl:
      adLink?.['@_href'] != null ? String(adLink['@_href']) : undefined,
    updated: entry.updated != null ? String(entry.updated) : undefined,
    modelSpec:
      fields.model_spec != null ? String(fields.model_spec) : undefined,
    dealer:
      entry.author?.name != null ? String(entry.author.name) : undefined,
  }
}

function extractFields(
  fields: ParsedNode[]
): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const field of fields) {
    if (field['@_name'] != null && field['@_value'] != null) {
      result[field['@_name']] = field['@_value']
    }
  }
  return result
}

function dedupeCars(cars: Car[]): Car[] {
  const carsById = new Map<string, Car>()

  for (const car of cars) {
    carsById.set(car.id, car)
  }

  return [...carsById.values()]
}

function sortNewestFirst(cars: Car[]): Car[] {
  return [...cars].sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''))
}
