import { XMLParser } from 'fast-xml-parser'
import { cacheLife } from 'next/cache'
import type { Car } from './types'

const FINN_API_BASE = 'https://cache.api.finn.no'

export async function fetchFinnCars(): Promise<Car[]> {
  'use cache'
  cacheLife('minutes')

  const apiKey = process.env.FINN_API_KEY
  const orgId = process.env.FINN_ORGID

  if (!apiKey || !orgId) {
    throw new Error('FINN_API_KEY and FINN_ORGID must be set in environment')
  }

  const res = await fetch(
    `${FINN_API_BASE}/iad/search/car-norway?orgId=${orgId}&rows=1000`,
    { headers: { 'x-FINN-apikey': apiKey } }
  )

  if (!res.ok) {
    throw new Error(`FINN API responded with ${res.status}`)
  }

  const xml = await res.text()
  return parseEntries(xml)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParsedNode = Record<string, any>

function parseEntries(xml: string): Car[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    isArray: (name) =>
      ['entry', 'finn:field', 'finn:price', 'link'].includes(name),
  })

  const result = parser.parse(xml)
  const entries: ParsedNode[] = result?.feed?.entry ?? []

  return entries.map((entry) => mapEntry(entry))
}

function mapEntry(entry: ParsedNode): Car {
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
